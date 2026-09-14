// src/core/cognitive/localFirstOllamaRuntime.ts
// BOWCON V4.0 — MS-1.5.01: FIRST-CLASS LOCAL OLLAMA COGNITIVE RUNTIME
// Component 985 — REAL
//
// Invariants:
// GENUINE_LOCAL_EXECUTION == TRUE
// ZERO_COST_LOCAL_INFERENCE == TRUE
// FAIL_CLOSED_ON_MALFORMED_OUTPUT == TRUE
// TIMEOUT_AND_CANCELLATION_ENFORCED == TRUE
// PROPOSAL != EXECUTION_AUTHORITY == TRUE
import { PromptBuilder } from './promptBuilder.js';
import { StructuredCognitiveValidator } from './structuredCognitiveValidator.js';
import { defaultModelCapabilityRegistry } from './modelCapabilityRegistry.js';
import { CognitiveTimeoutError, CognitiveProviderUnavailableError, CognitiveUserStopError, } from './cognitiveTypes.js';
export class LocalFirstOllamaRuntime {
    providerName = 'ollama-local-runtime';
    baseUrl;
    modelName;
    defaultTimeoutMs;
    fetchFn;
    constructor(options) {
        this.baseUrl = (options?.baseUrl ||
            process.env.LOCAL_OLLAMA_BASE_URL ||
            process.env.BRAIN_OLLAMA_BASE_URL ||
            'http://127.0.0.1:11434').replace(/\/+$/, '');
        this.modelName =
            options?.modelName ||
                process.env.LOCAL_MODEL ||
                process.env.BRAIN_OLLAMA_MODEL ||
                'qwen2.5:7b';
        this.defaultTimeoutMs =
            options?.defaultTimeoutMs ||
                Number(process.env.LOCAL_MODEL_TIMEOUT) ||
                Number(process.env.BRAIN_OLLAMA_TIMEOUT_MS) ||
                30000;
        this.fetchFn = options?.fetchFn || fetch;
    }
    /**
     * Health check probing the local Ollama daemon and dynamically updating capability registry.
     */
    async probeHealth() {
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
                    providerName: this.providerName,
                    tier: 'local-slm',
                    isHealthy: false,
                    activeModel: this.modelName,
                    availableModels: [],
                    latencyMs,
                    checkedAt: new Date().toISOString(),
                    lastError: `Ollama returned HTTP ${res.status}`,
                };
            }
            const body = (await res.json());
            // Ingest dynamically into capability registry
            defaultModelCapabilityRegistry.ingestOllamaTags(body);
            const availableModels = body.models?.map((m) => m.name) || [];
            const hasModel = availableModels.some((m) => m === this.modelName || m.startsWith(this.modelName.split(':')[0]));
            return {
                providerName: this.providerName,
                tier: 'local-slm',
                isHealthy: hasModel,
                activeModel: this.modelName,
                availableModels: Object.freeze(availableModels),
                latencyMs,
                checkedAt: new Date().toISOString(),
                lastError: hasModel ? undefined : `Model '${this.modelName}' not found in Ollama daemon`,
            };
        }
        catch (err) {
            clearTimeout(timeoutId);
            return {
                providerName: this.providerName,
                tier: 'local-slm',
                isHealthy: false,
                activeModel: this.modelName,
                availableModels: [],
                latencyMs: Date.now() - started,
                checkedAt: new Date().toISOString(),
                lastError: err.message || 'Connection refused or timeout',
            };
        }
    }
    /**
     * Executes local inference using the local model runtime.
     */
    async execute(context, options) {
        if (options?.isUserStopActive && options.isUserStopActive()) {
            throw new CognitiveUserStopError('execute_local_ollama_precheck');
        }
        const started = Date.now();
        const prompt = PromptBuilder.buildStructuredPrompt(context);
        const timeoutMs = options?.timeoutMs || options?.budget?.maxLatencyMs || this.defaultTimeoutMs;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        // Forward external abort signal
        if (options?.signal) {
            options.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        try {
            const response = await this.fetchFn(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    model: this.modelName,
                    prompt,
                    format: 'json',
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_ctx: 32768,
                    },
                }),
            });
            clearTimeout(timeoutId);
            if (options?.isUserStopActive && options.isUserStopActive()) {
                throw new CognitiveUserStopError('execute_local_ollama_postcheck');
            }
            if (!response.ok) {
                throw new CognitiveProviderUnavailableError('ollama-local', `HTTP ${response.status} from Ollama daemon`);
            }
            const data = (await response.json());
            const rawText = data?.response || '';
            const latencyMs = Date.now() - started;
            // Validate through strict structured boundary (fails closed on malformed output)
            const proposal = StructuredCognitiveValidator.parseAndValidate(rawText, {
                tier: 'local-slm',
                providerName: this.providerName,
                modelName: this.modelName,
            });
            const promptTokens = data.prompt_eval_count || 100;
            const completionTokens = data.eval_count || 50;
            return Object.freeze({
                proposal,
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
                latencyMs,
                estimatedCostUsd: 0.0, // Strictly free for local hardware
                isLocal: true,
            });
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (options?.isUserStopActive && options.isUserStopActive()) {
                throw new CognitiveUserStopError('execute_local_ollama_aborted');
            }
            if (err.name === 'AbortError' || controller.signal.aborted) {
                throw new CognitiveTimeoutError(timeoutMs, 'ollama-local', {
                    model: this.modelName,
                    endpoint: this.baseUrl,
                });
            }
            if (err instanceof CognitiveProviderUnavailableError ||
                err instanceof CognitiveTimeoutError ||
                err.name === 'CognitiveValidationError') {
                throw err;
            }
            throw new CognitiveProviderUnavailableError('ollama-local', `Failed to reach Ollama endpoint ${this.baseUrl}: ${err.message}`);
        }
    }
    /**
     * Drop-in compatibility method for CognitiveCircuitBreaker and legacy callers.
     */
    async executeInference(context, options) {
        const res = await this.execute(context, options);
        const p = res.proposal;
        return {
            cognitiveResult: {
                requestId: p.proposalId,
                provider: 'ollama-local',
                model: p.modelName,
                intent: p.intent,
                interpretation: p.interpretation,
                reasoningSummary: p.interpretation,
                plan: {
                    planId: p.proposalId,
                    steps: p.toolProposals.map((t, idx) => ({
                        stepIndex: idx,
                        action: t.toolName,
                        parameters: t.parameters,
                        requiredCapability: t.requiredCapability,
                        validationCriteria: t.rationale,
                    })),
                    summary: p.interpretation,
                    estimatedRisk: p.decision.riskLevel,
                    requiredCapabilities: p.toolProposals.map((t) => t.requiredCapability),
                },
                decision: {
                    decisionType: p.decision.decisionType,
                    riskLevel: p.decision.riskLevel,
                    requiredCapabilities: p.toolProposals.map((t) => t.requiredCapability),
                    requiresApproval: p.decision.requiresApproval,
                    executionEligibility: p.decision.executionEligibility,
                    reasonSummary: p.decision.reasoning,
                },
                confidence: {
                    score: p.confidence.score,
                    calibrationRationale: p.confidence.calibrationNote,
                    meetsExecutionThreshold: p.confidence.meetsThreshold,
                },
                requestedCapabilities: p.toolProposals.map((t) => t.requiredCapability),
                riskLevel: p.decision.riskLevel,
                toolCandidates: p.toolProposals.map((t) => ({
                    toolName: t.toolName,
                    toolArgs: t.parameters,
                    intent: p.intent,
                    capability: t.requiredCapability,
                })),
                requiresApproval: p.decision.requiresApproval,
                createdAt: p.createdAt,
                traceId: p.provenanceHash,
                rawOutput: p.rawTextOutput,
            },
            usage: {
                promptTokens: res.promptTokens,
                completionTokens: res.completionTokens,
                totalTokens: res.totalTokens,
                latencyMs: res.latencyMs,
                estimatedCostUsd: 0.0,
            },
        };
    }
    /**
     * Helper to classify a caught error into typed failure detail.
     */
    classifyFailure(err) {
        const msg = String(err?.message || err);
        let reason = 'UNKNOWN_ERROR';
        if (err instanceof CognitiveTimeoutError || msg.includes('timed out') || msg.includes('timeout')) {
            reason = 'TIMEOUT';
        }
        else if (msg.includes('ECONNREFUSED') || msg.includes('Failed to reach')) {
            reason = 'CONNECTION_REFUSED';
        }
        else if (msg.includes('not found')) {
            reason = 'MODEL_NOT_FOUND';
        }
        else if (err.name === 'CognitiveValidationError' || msg.includes('schema validation')) {
            reason = 'SCHEMA_VALIDATION_FAILED';
        }
        else if (err instanceof CognitiveUserStopError || msg.includes('USER_STOP')) {
            reason = 'USER_STOP_PREEMPTED';
        }
        return Object.freeze({
            reason,
            tier: 'local-slm',
            providerName: this.providerName,
            modelName: this.modelName,
            message: msg,
            timestamp: Date.now(),
            isRecoverable: reason !== 'USER_STOP_PREEMPTED',
        });
    }
}
