// src/core/cognitive/cognitiveProviders.ts
// BOWCON V4.0 — MS-1.4.02: ISOLATED COGNITIVE PROVIDER IMPLEMENTATIONS
//
// Invariants:
// LLM_OUTPUT != AUTHORITY
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// COGNITIVE_PROVIDER != TOOL_REGISTRY
// NO_CREDENTIAL_LEAKAGE == TRUE
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
import { getGeminiApiKey, GEMINI_CONFIG } from '../../gemini/config.js';
import { PromptBuilder } from './promptBuilder.js';
import { IntentClassifier } from './intentClassifier.js';
import { makeCognitiveRequestId, makeCognitiveTraceId, makeCognitivePlanId, CognitiveTimeoutError, CognitiveProviderUnavailableError, CognitiveValidationError, CognitiveBudgetExceededError, } from './cognitiveTypes.js';
export class GeminiCognitiveProvider {
    providerType = 'cloud-gemini';
    providerName = 'cloud-gemini-provider';
    modelName;
    defaultTimeoutMs;
    apiKeyResolver;
    baseUrl;
    fetchFn;
    // Gemini pricing estimate: $0.15 per 1M input tokens, $0.60 per 1M output tokens
    static INPUT_PRICE_PER_TOKEN = 0.00000015;
    static OUTPUT_PRICE_PER_TOKEN = 0.0000006;
    constructor(options) {
        this.modelName = options?.modelName || GEMINI_CONFIG.modelName || 'gemini-3.6-flash';
        // Max timeout capped at 15,000ms per architecture specification
        this.defaultTimeoutMs = Math.min(options?.timeoutMs || GEMINI_CONFIG.timeoutMs || 8000, 15000);
        this.apiKeyResolver = () => options?.apiKey || getGeminiApiKey();
        this.baseUrl = options?.baseUrl || 'https://generativelanguage.googleapis.com';
        this.fetchFn = options?.fetchFn || fetch;
    }
    isConfigured() {
        const key = this.apiKeyResolver();
        return Boolean(key && key.trim().length > 5);
    }
    async healthCheck() {
        const started = Date.now();
        if (!this.isConfigured()) {
            return {
                isAvailable: false,
                providerType: this.providerType,
                modelName: this.modelName,
                latencyMs: 0,
                error: 'GEMINI_API_KEY_NOT_CONFIGURED',
            };
        }
        return {
            isAvailable: true,
            providerType: this.providerType,
            modelName: this.modelName,
            latencyMs: Date.now() - started,
            details: { cloudBackend: true, timeoutMs: this.defaultTimeoutMs },
        };
    }
    async process(context, options) {
        const res = await this.executeInference(context, options);
        return res.cognitiveResult;
    }
    async executeInference(context, options) {
        const key = this.apiKeyResolver();
        if (!key) {
            throw new CognitiveProviderUnavailableError(this.providerType, 'Gemini API key is not configured');
        }
        const startedAt = Date.now();
        const timeoutMs = Math.min(options?.timeoutMs || this.defaultTimeoutMs, 15000);
        const stages = [];
        const promptStart = Date.now();
        const formattedPrompt = PromptBuilder.buildStructuredPrompt(context);
        stages.push({
            stage: 'prompt_construction',
            startedAt: promptStart,
            completedAt: Date.now(),
            durationMs: Date.now() - promptStart,
        });
        // Check prompt token budget estimate (1 token ~ 4 chars approximation)
        const estimatedPromptTokens = Math.ceil(formattedPrompt.length / 4);
        if (options?.budget && estimatedPromptTokens > options.budget.maxPromptTokens) {
            throw new CognitiveBudgetExceededError('prompt_tokens', options.budget.maxPromptTokens, estimatedPromptTokens);
        }
        const controller = new AbortController();
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);
        if (options?.signal) {
            options.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        const endpoint = `${this.baseUrl}/v1beta/models/${encodeURIComponent(this.modelName)}:generateContent?key=${encodeURIComponent(key)}`;
        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: formattedPrompt }],
                },
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: options?.maxTokens || options?.budget?.maxCompletionTokens || 2048,
                responseMimeType: 'application/json',
            },
        };
        let rawText = '';
        let promptTokens = estimatedPromptTokens;
        let completionTokens = 0;
        const netStart = Date.now();
        try {
            const res = await this.fetchFn(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            stages.push({
                stage: 'provider_http_call',
                startedAt: netStart,
                completedAt: Date.now(),
                durationMs: Date.now() - netStart,
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new CognitiveProviderUnavailableError(this.providerType, `Gemini authentication failure: HTTP ${res.status}`);
                }
                if (res.status === 429) {
                    throw new CognitiveProviderUnavailableError(this.providerType, `Gemini rate limited: HTTP 429`);
                }
                throw new CognitiveProviderUnavailableError(this.providerType, `Gemini request failed: HTTP ${res.status} ${res.statusText}`);
            }
            const body = (await res.json());
            const candidate = body.candidates?.[0];
            const part = candidate?.content?.parts?.[0];
            rawText = part?.text || '';
            if (body.usageMetadata) {
                promptTokens = body.usageMetadata.promptTokenCount || promptTokens;
                completionTokens = body.usageMetadata.candidatesTokenCount || Math.ceil(rawText.length / 4);
            }
            else {
                completionTokens = Math.ceil(rawText.length / 4);
            }
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (timedOut || err?.name === 'AbortError') {
                throw new CognitiveTimeoutError(timeoutMs, this.providerType);
            }
            if (err instanceof CognitiveBudgetExceededError || err instanceof CognitiveProviderUnavailableError) {
                throw err;
            }
            throw new CognitiveProviderUnavailableError(this.providerType, `Gemini network invocation failure: ${err?.message ?? String(err)}`);
        }
        const latencyMs = Date.now() - startedAt;
        const totalTokens = promptTokens + completionTokens;
        const estimatedCostUsd = promptTokens * GeminiCognitiveProvider.INPUT_PRICE_PER_TOKEN +
            completionTokens * GeminiCognitiveProvider.OUTPUT_PRICE_PER_TOKEN;
        const cognitiveResult = this.parseAndValidateResult(rawText, stages, latencyMs);
        return {
            cognitiveResult,
            usage: {
                promptTokens,
                completionTokens,
                totalTokens,
                latencyMs,
                estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
            },
        };
    }
    async summarize(taskSummary) {
        return `[GeminiSummary] Task completed: ${JSON.stringify(taskSummary)}`;
    }
    async shutdown() { }
    parseAndValidateResult(rawText, stages, latencyMs) {
        const parseStart = Date.now();
        let parsed;
        try {
            // Strip markdown code fences if present
            const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
            parsed = JSON.parse(cleaned);
        }
        catch (err) {
            throw new CognitiveValidationError(`Gemini returned non-JSON output: ${err?.message}`, ['UNPARSEABLE_JSON_OUTPUT']);
        }
        // Required fields check
        const errors = [];
        if (!parsed.intent || typeof parsed.intent !== 'string')
            errors.push('Missing or invalid intent');
        if (!parsed.interpretation || typeof parsed.interpretation !== 'string')
            errors.push('Missing or invalid interpretation');
        if (!parsed.plan || typeof parsed.plan !== 'object')
            errors.push('Missing or invalid plan');
        if (!parsed.decision || typeof parsed.decision !== 'object')
            errors.push('Missing or invalid decision');
        if (errors.length > 0) {
            throw new CognitiveValidationError('Malformed cognitive result structure', errors);
        }
        stages.push({
            stage: 'response_validation',
            startedAt: parseStart,
            completedAt: Date.now(),
            durationMs: Date.now() - parseStart,
        });
        const requestId = makeCognitiveRequestId();
        const traceId = makeCognitiveTraceId();
        const planId = makeCognitivePlanId();
        const plan = {
            planId: parsed.plan.planId || planId,
            steps: Array.isArray(parsed.plan.steps)
                ? parsed.plan.steps.map((s, idx) => ({
                    stepIndex: idx,
                    action: String(s.action || 'EXECUTE'),
                    target: s.target ? String(s.target) : undefined,
                    parameters: s.parameters && typeof s.parameters === 'object' ? s.parameters : {},
                    requiredCapability: s.requiredCapability ? String(s.requiredCapability) : undefined,
                    validationCriteria: s.validationCriteria ? String(s.validationCriteria) : undefined,
                }))
                : [],
            summary: String(parsed.plan.summary || parsed.interpretation || ''),
            estimatedRisk: parsed.plan.estimatedRisk || 'LOW',
            requiredCapabilities: Array.isArray(parsed.plan.requiredCapabilities)
                ? parsed.plan.requiredCapabilities.map(String)
                : [],
        };
        const decision = {
            decisionType: parsed.decision.decisionType || 'PROCEED',
            riskLevel: parsed.decision.riskLevel || 'LOW',
            requiredCapabilities: Array.isArray(parsed.decision.requiredCapabilities)
                ? parsed.decision.requiredCapabilities.map(String)
                : [],
            requiresApproval: Boolean(parsed.decision.requiresApproval),
            executionEligibility: Boolean(parsed.decision.executionEligibility ?? true),
            reasonSummary: String(parsed.decision.reasonSummary || ''),
        };
        const confidence = {
            score: typeof parsed.confidence?.score === 'number' ? parsed.confidence.score : 0.85,
            calibrationRationale: String(parsed.confidence?.calibrationRationale || 'Gemini direct structured response'),
            meetsExecutionThreshold: parsed.confidence?.meetsExecutionThreshold ?? true,
        };
        return {
            requestId,
            provider: this.providerType,
            model: this.modelName,
            intent: parsed.intent || 'ANALYZE',
            interpretation: String(parsed.interpretation),
            reasoningSummary: String(parsed.reasoningSummary || parsed.interpretation),
            plan,
            decision,
            confidence,
            requestedCapabilities: plan.requiredCapabilities,
            riskLevel: plan.estimatedRisk,
            toolCandidates: [],
            requiresApproval: decision.requiresApproval,
            createdAt: new Date().toISOString(),
            traceId,
            rawOutput: rawText,
        };
    }
}
export class OllamaCognitiveProvider {
    providerType = 'ollama-local';
    providerName = 'ollama-local-provider';
    baseUrl;
    modelName;
    defaultTimeoutMs;
    fetchFn;
    constructor(options) {
        this.baseUrl = (options?.baseUrl ||
            process.env.BRAIN_OLLAMA_BASE_URL ||
            'http://127.0.0.1:11434').replace(/\/+$/, '');
        this.modelName =
            options?.modelName ||
                process.env.BRAIN_OLLAMA_MODEL ||
                'qwen2.5:7b';
        this.defaultTimeoutMs =
            options?.timeoutMs ||
                Number(process.env.BRAIN_OLLAMA_TIMEOUT_MS) ||
                30000;
        this.fetchFn = options?.fetchFn || fetch;
    }
    async healthCheck() {
        const started = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
            const res = await this.fetchFn(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            const latencyMs = Date.now() - started;
            if (!res.ok) {
                return {
                    isAvailable: false,
                    providerType: this.providerType,
                    modelName: this.modelName,
                    latencyMs,
                    error: `Ollama returned HTTP ${res.status}`,
                };
            }
            const body = (await res.json());
            const modelList = body.models?.map((m) => m.name) || [];
            const hasModel = modelList.some((m) => m === this.modelName || m.startsWith(this.modelName.split(':')[0]));
            return {
                isAvailable: true,
                providerType: this.providerType,
                modelName: this.modelName,
                latencyMs,
                details: {
                    availableModels: modelList,
                    modelFound: hasModel,
                },
            };
        }
        catch (err) {
            clearTimeout(timeoutId);
            return {
                isAvailable: false,
                providerType: this.providerType,
                modelName: this.modelName,
                latencyMs: Date.now() - started,
                error: `Ollama connection failure: ${err?.message ?? String(err)}`,
            };
        }
    }
    async process(context, options) {
        const res = await this.executeInference(context, options);
        return res.cognitiveResult;
    }
    async executeInference(context, options) {
        const startedAt = Date.now();
        const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
        const stages = [];
        const promptStart = Date.now();
        const formattedPrompt = PromptBuilder.buildStructuredPrompt(context);
        stages.push({
            stage: 'prompt_construction',
            startedAt: promptStart,
            completedAt: Date.now(),
            durationMs: Date.now() - promptStart,
        });
        const estimatedPromptTokens = Math.ceil(formattedPrompt.length / 4);
        if (options?.budget && estimatedPromptTokens > options.budget.maxPromptTokens) {
            throw new CognitiveBudgetExceededError('prompt_tokens', options.budget.maxPromptTokens, estimatedPromptTokens);
        }
        const controller = new AbortController();
        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);
        if (options?.signal) {
            options.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        let rawText = '';
        let promptEvalCount = estimatedPromptTokens;
        let evalCount = 0;
        const netStart = Date.now();
        try {
            const res = await this.fetchFn(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    model: this.modelName,
                    prompt: formattedPrompt,
                    stream: false,
                    format: 'json',
                    options: {
                        temperature: 0.1,
                        num_predict: options?.maxTokens || options?.budget?.maxCompletionTokens || 1024,
                    },
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            stages.push({
                stage: 'provider_http_call',
                startedAt: netStart,
                completedAt: Date.now(),
                durationMs: Date.now() - netStart,
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new CognitiveProviderUnavailableError(this.providerType, `Ollama auth failure: HTTP ${res.status}`);
                }
                if (res.status === 429) {
                    throw new CognitiveProviderUnavailableError(this.providerType, `Ollama rate limited: HTTP 429`);
                }
                throw new CognitiveProviderUnavailableError(this.providerType, `Ollama HTTP error: ${res.status} ${res.statusText}`);
            }
            const body = (await res.json());
            rawText = body.response || '';
            promptEvalCount = body.prompt_eval_count || promptEvalCount;
            evalCount = body.eval_count || Math.ceil(rawText.length / 4);
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (timedOut || err?.name === 'AbortError') {
                throw new CognitiveTimeoutError(timeoutMs, this.providerType);
            }
            if (err instanceof CognitiveBudgetExceededError || err instanceof CognitiveProviderUnavailableError) {
                throw err;
            }
            throw new CognitiveProviderUnavailableError(this.providerType, `Ollama invocation failure: ${err?.message ?? String(err)}`);
        }
        const latencyMs = Date.now() - startedAt;
        const totalTokens = promptEvalCount + evalCount;
        const cognitiveResult = this.parseAndValidateResult(rawText, stages);
        return {
            cognitiveResult,
            usage: {
                promptTokens: promptEvalCount,
                completionTokens: evalCount,
                totalTokens,
                latencyMs,
                estimatedCostUsd: 0.0, // Local execution cost is $0.00
            },
        };
    }
    async summarize(taskSummary) {
        return `[OllamaSummary] Task completed: ${JSON.stringify(taskSummary)}`;
    }
    async shutdown() { }
    parseAndValidateResult(rawText, stages) {
        const parseStart = Date.now();
        let parsed;
        try {
            const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
            parsed = JSON.parse(cleaned);
        }
        catch (err) {
            throw new CognitiveValidationError(`Ollama returned non-JSON output: ${err?.message}`, ['UNPARSEABLE_JSON_OUTPUT']);
        }
        const errors = [];
        if (!parsed.intent || typeof parsed.intent !== 'string')
            errors.push('Missing intent');
        if (!parsed.interpretation || typeof parsed.interpretation !== 'string')
            errors.push('Missing interpretation');
        if (!parsed.plan || typeof parsed.plan !== 'object')
            errors.push('Missing plan');
        if (!parsed.decision || typeof parsed.decision !== 'object')
            errors.push('Missing decision');
        if (errors.length > 0) {
            throw new CognitiveValidationError('Malformed Ollama cognitive result structure', errors);
        }
        stages.push({
            stage: 'response_validation',
            startedAt: parseStart,
            completedAt: Date.now(),
            durationMs: Date.now() - parseStart,
        });
        const requestId = makeCognitiveRequestId();
        const traceId = makeCognitiveTraceId();
        const planId = makeCognitivePlanId();
        const plan = {
            planId: parsed.plan.planId || planId,
            steps: Array.isArray(parsed.plan.steps)
                ? parsed.plan.steps.map((s, idx) => ({
                    stepIndex: idx,
                    action: String(s.action || 'EXECUTE'),
                    target: s.target ? String(s.target) : undefined,
                    parameters: s.parameters && typeof s.parameters === 'object' ? s.parameters : {},
                    requiredCapability: s.requiredCapability ? String(s.requiredCapability) : undefined,
                    validationCriteria: s.validationCriteria ? String(s.validationCriteria) : undefined,
                }))
                : [],
            summary: String(parsed.plan.summary || parsed.interpretation || ''),
            estimatedRisk: parsed.plan.estimatedRisk || 'LOW',
            requiredCapabilities: Array.isArray(parsed.plan.requiredCapabilities)
                ? parsed.plan.requiredCapabilities.map(String)
                : [],
        };
        const decision = {
            decisionType: parsed.decision.decisionType || 'PROCEED',
            riskLevel: parsed.decision.riskLevel || 'LOW',
            requiredCapabilities: Array.isArray(parsed.decision.requiredCapabilities)
                ? parsed.decision.requiredCapabilities.map(String)
                : [],
            requiresApproval: Boolean(parsed.decision.requiresApproval),
            executionEligibility: Boolean(parsed.decision.executionEligibility ?? true),
            reasonSummary: String(parsed.decision.reasonSummary || ''),
        };
        const confidence = {
            score: typeof parsed.confidence?.score === 'number' ? parsed.confidence.score : 0.75,
            calibrationRationale: String(parsed.confidence?.calibrationRationale || 'Ollama local structured response'),
            meetsExecutionThreshold: parsed.confidence?.meetsExecutionThreshold ?? true,
        };
        return {
            requestId,
            provider: this.providerType,
            model: this.modelName,
            intent: parsed.intent || 'ANALYZE',
            interpretation: String(parsed.interpretation),
            reasoningSummary: String(parsed.reasoningSummary || parsed.interpretation),
            plan,
            decision,
            confidence,
            requestedCapabilities: plan.requiredCapabilities,
            riskLevel: plan.estimatedRisk,
            toolCandidates: [],
            requiresApproval: decision.requiresApproval,
            createdAt: new Date().toISOString(),
            traceId,
            rawOutput: rawText,
        };
    }
}
// ============================================================================
// 3. DETERMINISTIC FALLBACK COGNITIVE PROVIDER
// ============================================================================
export class DeterministicFallbackCognitiveProvider {
    providerType = 'deterministic-fallback';
    providerName = 'deterministic-fallback-provider';
    modelName = 'bowcon-rule-engine-v4';
    async healthCheck() {
        return {
            isAvailable: true,
            providerType: this.providerType,
            modelName: this.modelName,
            latencyMs: 0,
            details: {
                offlineCapable: true,
                deterministic: true,
                networkRequired: false,
            },
        };
    }
    async process(context, options) {
        const res = await this.executeInference(context, options);
        return res.cognitiveResult;
    }
    async executeInference(context, _options) {
        const startedAt = Date.now();
        const requestId = makeCognitiveRequestId();
        const traceId = makeCognitiveTraceId();
        const planId = makeCognitivePlanId();
        const inputSnippet = (context.userContext || context.taskContext || '').slice(0, 100);
        const classification = IntentClassifier.classify(inputSnippet);
        const intent = classification.intent;
        const plan = {
            planId,
            steps: [
                {
                    stepIndex: 0,
                    action: 'RULE_BASED_EXECUTE',
                    target: context.taskContext || 'system',
                    parameters: { input: inputSnippet },
                    requiredCapability: 'core_rules',
                    validationCriteria: 'DETERMINISTIC_MATCH',
                },
            ],
            summary: `Deterministic fallback execution for intent '${intent}'`,
            estimatedRisk: 'LOW',
            requiredCapabilities: ['core_rules'],
        };
        const decision = {
            decisionType: 'PROCEED',
            riskLevel: 'LOW',
            requiredCapabilities: ['core_rules'],
            requiresApproval: false,
            executionEligibility: true,
            reasonSummary: 'Deterministic rule engine approved default safe processing',
        };
        const confidence = {
            score: 1.0,
            calibrationRationale: 'Deterministic rule match; zero hallucination risk',
            meetsExecutionThreshold: true,
        };
        const latencyMs = Math.max(1, Date.now() - startedAt);
        const estimatedPromptTokens = Math.ceil(inputSnippet.length / 4);
        const estimatedCompletionTokens = 60;
        const cognitiveResult = {
            requestId,
            provider: this.providerType,
            model: this.modelName,
            intent,
            interpretation: `Rule engine resolved task via deterministic heuristic: ${inputSnippet}`,
            reasoningSummary: 'No LLM employed; deterministic pattern matched cleanly',
            plan,
            decision,
            confidence,
            requestedCapabilities: ['core_rules'],
            riskLevel: 'LOW',
            toolCandidates: [],
            requiresApproval: false,
            createdAt: new Date().toISOString(),
            traceId,
            rawOutput: JSON.stringify({ intent, ruleApplied: 'DEFAULT_DETERMINISTIC' }),
        };
        return {
            cognitiveResult,
            usage: {
                promptTokens: estimatedPromptTokens,
                completionTokens: estimatedCompletionTokens,
                totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
                latencyMs,
                estimatedCostUsd: 0.0,
            },
        };
    }
    async summarize(taskSummary) {
        return `[DeterministicSummary] Rule engine finished: ${JSON.stringify(taskSummary)}`;
    }
    async shutdown() { }
}
