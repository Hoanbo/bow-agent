// src/core/cognitive/ollamaProvider.ts
// BOWCON V4.0 — MS-1.3.32: REAL OLLAMA LOCAL COGNITIVE PROVIDER
//
// Invariants:
// GENUINE_HTTP == TRUE (No fake in-memory adapter)
// HONEST_REPORTING == TRUE (Never pretend offline is online)
// LLM_PROPOSE != EXECUTE
import { PromptBuilder } from './promptBuilder.js';
import { CognitiveError, classifyCognitiveError, } from './cognitiveFailure.js';
import { makeCognitiveRequestId, makeCognitiveTraceId, makeCognitivePlanId, } from './cognitiveTypes.js';
export class OllamaProvider {
    providerType = 'ollama';
    providerName = 'ollama-local';
    baseUrl;
    modelName;
    defaultTimeoutMs;
    constructor(options) {
        this.baseUrl = (options?.baseUrl ||
            process.env.BRAIN_OLLAMA_BASE_URL ||
            'http://127.0.0.1:11434').replace(/\/+$/, '');
        this.modelName =
            options?.model ||
                process.env.BRAIN_OLLAMA_MODEL ||
                'qwen2.5:7b';
        this.defaultTimeoutMs =
            options?.timeoutMs ||
                Number(process.env.BRAIN_OLLAMA_TIMEOUT_MS) ||
                3000;
    }
    /**
     * Genuine health probe hitting /api/tags
     */
    async healthCheck() {
        const started = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`, {
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
                    error: `Ollama returned HTTP ${res.status} ${res.statusText}`,
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
                    installedModels: modelList,
                    modelFound: hasModel,
                },
            };
        }
        catch (err) {
            clearTimeout(timeoutId);
            const latencyMs = Date.now() - started;
            const code = classifyCognitiveError(err);
            return {
                isAvailable: false,
                providerType: this.providerType,
                modelName: this.modelName,
                latencyMs,
                error: `[${code}] Ollama daemon unreachable at ${this.baseUrl}`,
            };
        }
    }
    /**
     * Executes genuine HTTP request against Ollama /api/generate
     */
    async process(context, options) {
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        // If external signal provided, listen to it
        if (options?.signal) {
            options.signal.addEventListener('abort', () => controller.abort());
        }
        let rawResponse;
        let promptEvalCount;
        let evalCount;
        const netStart = Date.now();
        try {
            const res = await fetch(`${this.baseUrl}/api/generate`, {
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
                        temperature: 0.1, // Deterministic adherence
                        num_predict: options?.maxTokens || 1024,
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
                    throw new CognitiveError('PROVIDER_AUTH_FAILURE', `Ollama auth failure: HTTP ${res.status}`, { providerType: this.providerType });
                }
                if (res.status === 429) {
                    throw new CognitiveError('PROVIDER_RATE_LIMITED', `Ollama rate limited: HTTP 429`, { providerType: this.providerType });
                }
                throw new CognitiveError('PROVIDER_INVALID_RESPONSE', `Ollama returned error: HTTP ${res.status}`, { providerType: this.providerType });
            }
            const json = (await res.json());
            rawResponse = json.response || '';
            promptEvalCount = json.prompt_eval_count;
            evalCount = json.eval_count;
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof CognitiveError)
                throw err;
            const code = classifyCognitiveError(err);
            throw new CognitiveError(code, `Ollama request failed: ${err instanceof Error ? err.message : String(err)}`, { providerType: this.providerType, cause: err });
        }
        // Parse structured JSON response
        const parseStart = Date.now();
        let parsedData;
        try {
            const cleaned = rawResponse
                .replace(/```(?:json)?\s*/gi, '')
                .replace(/```\s*$/gi, '')
                .trim();
            parsedData = JSON.parse(cleaned);
        }
        catch (parseErr) {
            stages.push({
                stage: 'response_parsing_failed',
                startedAt: parseStart,
                completedAt: Date.now(),
                durationMs: Date.now() - parseStart,
            });
            throw new CognitiveError('PROVIDER_MALFORMED_OUTPUT', `Failed to parse JSON response from Ollama: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`, { providerType: this.providerType, cause: parseErr });
        }
        stages.push({
            stage: 'response_parsing',
            startedAt: parseStart,
            completedAt: Date.now(),
            durationMs: Date.now() - parseStart,
        });
        const validatedResult = this.normalizeCognitiveOutput(parsedData, context, rawResponse, stages, startedAt, promptEvalCount, evalCount);
        return validatedResult;
    }
    /**
     * Safe normalization ensuring all contract invariants are satisfied.
     */
    normalizeCognitiveOutput(raw, _context, rawText, stages, startedAt, promptTokens, completionTokens) {
        const requestId = makeCognitiveRequestId();
        const traceId = makeCognitiveTraceId();
        const planId = makeCognitivePlanId();
        const intent = (typeof raw.intent === 'string' ? raw.intent.toUpperCase() : 'UNKNOWN');
        const interpretation = typeof raw.interpretation === 'string'
            ? PromptBuilder.sanitizeText(raw.interpretation)
            : 'Interpreted model proposal.';
        const reasoningSummary = typeof raw.reasoningSummary === 'string'
            ? PromptBuilder.sanitizeText(raw.reasoningSummary)
            : 'High-level reasoning proposal.';
        // Plan steps
        const rawSteps = Array.isArray(raw.plan?.steps) ? raw.plan.steps : [];
        const steps = rawSteps.map((s, idx) => ({
            stepIndex: typeof s.stepIndex === 'number' ? s.stepIndex : idx + 1,
            action: typeof s.action === 'string' ? s.action : 'propose_action',
            target: typeof s.target === 'string' ? s.target : undefined,
            parameters: typeof s.parameters === 'object' && s.parameters !== null ? s.parameters : {},
            requiredCapability: typeof s.requiredCapability === 'string' ? s.requiredCapability : 'fs:read',
            validationCriteria: typeof s.validationCriteria === 'string' ? s.validationCriteria : undefined,
        }));
        const estimatedRisk = (typeof raw.plan?.estimatedRisk === 'string'
            ? raw.plan.estimatedRisk.toUpperCase()
            : 'LOW');
        const plan = {
            planId,
            steps,
            summary: typeof raw.plan?.summary === 'string' ? raw.plan.summary : 'Proposed cognitive plan.',
            estimatedRisk,
            requiredCapabilities: Array.isArray(raw.plan?.requiredCapabilities)
                ? raw.plan.requiredCapabilities
                : ['fs:read'],
        };
        // Decision
        const decisionType = (typeof raw.decision?.decisionType === 'string'
            ? raw.decision.decisionType.toUpperCase()
            : 'PROCEED');
        const riskLevel = (typeof raw.decision?.riskLevel === 'string'
            ? raw.decision.riskLevel.toUpperCase()
            : estimatedRisk);
        const decision = {
            decisionType,
            riskLevel,
            requiredCapabilities: Array.isArray(raw.decision?.requiredCapabilities)
                ? raw.decision.requiredCapabilities
                : plan.requiredCapabilities,
            requiresApproval: Boolean(raw.decision?.requiresApproval || riskLevel === 'HIGH' || riskLevel === 'CRITICAL'),
            executionEligibility: Boolean(raw.decision?.executionEligibility ?? true),
            reasonSummary: typeof raw.decision?.reasonSummary === 'string' ? raw.decision.reasonSummary : 'Model decision proposal.',
        };
        // Confidence
        const rawScore = typeof raw.confidence?.score === 'number' ? raw.confidence.score : 0.85;
        const confidence = {
            score: Math.max(0.0, Math.min(1.0, rawScore)),
            calibrationRationale: typeof raw.confidence?.calibrationRationale === 'string' ? raw.confidence.calibrationRationale : 'Model confidence estimate.',
            meetsExecutionThreshold: rawScore >= 0.7,
        };
        // Tool candidates
        const rawCandidates = Array.isArray(raw.toolCandidates) ? raw.toolCandidates : [];
        const toolCandidates = rawCandidates.map((c) => ({
            toolName: typeof c.toolName === 'string' ? c.toolName : 'brain_echo',
            toolArgs: typeof c.toolArgs === 'object' && c.toolArgs !== null ? c.toolArgs : {},
            intent: (typeof c.intent === 'string' ? c.intent.toUpperCase() : intent),
            capability: typeof c.capability === 'string' ? c.capability : 'fs:read',
        }));
        return {
            requestId,
            provider: this.providerType,
            model: this.modelName,
            intent,
            interpretation,
            reasoningSummary,
            plan,
            decision,
            confidence,
            requestedCapabilities: decision.requiredCapabilities,
            riskLevel,
            toolCandidates,
            requiresApproval: decision.requiresApproval,
            createdAt: new Date().toISOString(),
            traceId,
            rawOutput: PromptBuilder.sanitizeText(rawText),
        };
    }
    async summarize(taskSummary) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        try {
            const prompt = `Summarize this task completion safely in one concise sentence: ${JSON.stringify(taskSummary)}`;
            const res = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelName,
                    prompt,
                    stream: false,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
                return `Task completed: ${taskSummary.taskId ?? 'unknown'} with status ${taskSummary.success ? 'SUCCESS' : 'FAILED'}.`;
            }
            const json = (await res.json());
            return json.response?.trim() || `Task completed: ${taskSummary.taskId ?? 'unknown'}.`;
        }
        catch {
            clearTimeout(timeoutId);
            return `Task completed: ${taskSummary.taskId ?? 'unknown'} with status ${taskSummary.success ? 'SUCCESS' : 'FAILED'}.`;
        }
    }
    async shutdown() {
        // Stateless HTTP provider, nothing to drain
    }
}
