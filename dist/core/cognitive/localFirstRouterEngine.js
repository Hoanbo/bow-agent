// src/core/cognitive/localFirstRouterEngine.ts
// BOWCON V4.0 — MS-1.5.01: INVERTED LOCAL-FIRST PROVIDER ROUTER
// Component 986 — REAL
//
// Invariants:
// HIERARCHY: LOCAL_SLM -> CLOUD_ESCALATION -> DETERMINISTIC_FALLBACK
// LOCAL_FIRST_BY_DEFAULT == TRUE
// CLOUD_ESCALATION_REQUIRES_SANITIZATION == TRUE
// PROPOSAL != EXECUTION_AUTHORITY == TRUE
// USER_STOP_PREEMPTS_ALL_TIERS == TRUE
import { LocalFirstOllamaRuntime } from './localFirstOllamaRuntime.js';
import { GeminiCognitiveProvider, DeterministicFallbackCognitiveProvider } from './cognitiveProviders.js';
import { CloudEscalationSanitizer } from './cloudEscalationSanitizer.js';
import { StructuredCognitiveValidator } from './structuredCognitiveValidator.js';
import { CognitiveUserStopError, } from './cognitiveTypes.js';
export class LocalFirstRouterEngine {
    localRuntime;
    geminiProvider;
    fallbackProvider;
    cloudEscalationPolicy;
    constructor(options) {
        this.localRuntime = options?.localRuntime || new LocalFirstOllamaRuntime();
        this.geminiProvider = options?.geminiProvider || new GeminiCognitiveProvider();
        this.fallbackProvider = options?.fallbackProvider || new DeterministicFallbackCognitiveProvider();
        const envCloudEnabled = process.env.CLOUD_ESCALATION_ENABLED !== 'false';
        this.cloudEscalationPolicy = Object.freeze({
            enabled: options?.cloudEscalationPolicy?.enabled ?? envCloudEnabled,
            allowDataEgress: options?.cloudEscalationPolicy?.allowDataEgress ?? true,
            maxLatencyMs: options?.cloudEscalationPolicy?.maxLatencyMs ?? 15000,
            maxEscalationCostUsd: options?.cloudEscalationPolicy?.maxEscalationCostUsd ?? 0.05,
            disallowedKeywords: Object.freeze(options?.cloudEscalationPolicy?.disallowedKeywords || ['CONFIDENTIAL', 'SECRET_KEY']),
            stripEnvironmentVariables: options?.cloudEscalationPolicy?.stripEnvironmentVariables ?? true,
            stripFilePaths: options?.cloudEscalationPolicy?.stripFilePaths ?? true,
        });
    }
    /**
     * Routes inference using the canonical inverted Local-First ladder:
     * Tier 1: Local Ollama (SLM)
     * Tier 2: Cloud Gemini Escalation (Sanitized & Gated)
     * Tier 3: Deterministic Fallback (Zero-network rule engine)
     */
    async route(context, options) {
        const started = Date.now();
        const fallbackChain = [];
        const checkStop = (checkpoint) => {
            if (options?.isUserStopActive && options.isUserStopActive()) {
                throw new CognitiveUserStopError(checkpoint);
            }
        };
        // If deterministic fallback explicitly forced, bypass LLMs
        if (options?.forceTier === 'deterministic-fallback') {
            checkStop('deterministic_forced');
            options?.onTierAttempt?.('deterministic-fallback');
            return this.executeDeterministicFallback(context, fallbackChain, started, options?.signal);
        }
        // ========================================================================
        // TIER 1: LOCAL SLM (OLLAMA)
        // ========================================================================
        if (!options?.forceTier || options.forceTier === 'local-slm') {
            checkStop('tier1_precheck');
            fallbackChain.push('local-slm');
            options?.onTierAttempt?.('local-slm');
            try {
                const localResult = await this.localRuntime.execute(context, {
                    budget: options?.budget,
                    signal: options?.signal,
                    isUserStopActive: options?.isUserStopActive,
                });
                checkStop('tier1_postcheck');
                return Object.freeze({
                    proposal: localResult.proposal,
                    activeTier: 'local-slm',
                    providerName: this.localRuntime.providerName,
                    modelName: this.localRuntime.modelName,
                    fallbackOccurred: false,
                    fallbackChain: Object.freeze([...fallbackChain]),
                    promptTokens: localResult.promptTokens,
                    completionTokens: localResult.completionTokens,
                    totalTokens: localResult.totalTokens,
                    latencyMs: Date.now() - started,
                    estimatedCostUsd: 0.0,
                    wasEscalatedToCloud: false,
                });
            }
            catch (err) {
                checkStop('tier1_catch');
                if (err instanceof CognitiveUserStopError || options?.isUserStopActive?.() || options?.signal?.aborted) {
                    throw err;
                }
                // Local tier failed -> Record and fall through to Tier 2 (Cloud Escalation)
                fallbackChain.push(`local-slm:failed(${err.name || 'Error'})`);
            }
        }
        // ========================================================================
        // TIER 2: CLOUD GEMINI ESCALATION (OPTIONAL, SANITIZED & GATED)
        // ========================================================================
        checkStop('tier2_precheck');
        const isCloudPermitted = this.cloudEscalationPolicy.enabled &&
            this.cloudEscalationPolicy.allowDataEgress &&
            this.geminiProvider.isConfigured() &&
            (!options?.forceTier || options.forceTier === 'cloud-escalation');
        if (isCloudPermitted) {
            fallbackChain.push('cloud-escalation');
            options?.onTierAttempt?.('cloud-escalation');
            try {
                // Step 1: Strict privacy sanitization before data leaves the machine
                const { sanitizedContext, report } = CloudEscalationSanitizer.sanitize(context);
                // Step 2: Invoke cloud provider with sanitized context
                const geminiRes = await this.geminiProvider.executeInference(sanitizedContext, {
                    timeoutMs: Math.min(options?.budget?.maxLatencyMs || 10000, this.cloudEscalationPolicy.maxLatencyMs),
                    budget: options?.budget,
                    signal: options?.signal,
                });
                checkStop('tier2_postcheck');
                // Step 3: Convert to provider-neutral proposal
                const proposal = StructuredCognitiveValidator.validateParsedObject({
                    intent: geminiRes.cognitiveResult.intent,
                    interpretation: geminiRes.cognitiveResult.interpretation,
                    reasoningSummary: geminiRes.cognitiveResult.reasoningSummary,
                    plan: geminiRes.cognitiveResult.plan,
                    decision: geminiRes.cognitiveResult.decision,
                    confidence: geminiRes.cognitiveResult.confidence,
                    toolCandidates: geminiRes.cognitiveResult.toolCandidates,
                }, geminiRes.cognitiveResult.rawOutput || '', {
                    tier: 'cloud-escalation',
                    providerName: this.geminiProvider.providerName,
                    modelName: this.geminiProvider.modelName,
                });
                return Object.freeze({
                    proposal,
                    activeTier: 'cloud-escalation',
                    providerName: this.geminiProvider.providerName,
                    modelName: this.geminiProvider.modelName,
                    fallbackOccurred: true,
                    fallbackChain: Object.freeze([...fallbackChain]),
                    promptTokens: geminiRes.usage.promptTokens,
                    completionTokens: geminiRes.usage.completionTokens,
                    totalTokens: geminiRes.usage.totalTokens,
                    latencyMs: Date.now() - started,
                    estimatedCostUsd: geminiRes.usage.estimatedCostUsd,
                    wasEscalatedToCloud: true,
                    sanitizationSummary: {
                        redactedCount: report.redactedCount,
                        redactedCategories: report.redactedCategories,
                    },
                });
            }
            catch (err) {
                checkStop('tier2_catch');
                if (err instanceof CognitiveUserStopError || options?.isUserStopActive?.() || options?.signal?.aborted) {
                    throw err;
                }
                fallbackChain.push(`cloud-escalation:failed(${err.name || 'Error'})`);
            }
        }
        else {
            fallbackChain.push('cloud-escalation:skipped(disabled_or_unconfigured)');
        }
        // ========================================================================
        // TIER 3: DETERMINISTIC FALLBACK (GUARANTEED AIR-GAPPED ORACLE)
        // ========================================================================
        checkStop('tier3_precheck');
        return this.executeDeterministicFallback(context, fallbackChain, started, options?.signal);
    }
    async executeDeterministicFallback(context, fallbackChain, started, signal) {
        fallbackChain.push('deterministic-fallback');
        const fallbackRes = await this.fallbackProvider.executeInference(context, { signal });
        const proposal = StructuredCognitiveValidator.validateParsedObject({
            intent: fallbackRes.cognitiveResult.intent,
            interpretation: fallbackRes.cognitiveResult.interpretation,
            reasoningSummary: fallbackRes.cognitiveResult.reasoningSummary,
            plan: fallbackRes.cognitiveResult.plan,
            decision: fallbackRes.cognitiveResult.decision,
            confidence: fallbackRes.cognitiveResult.confidence,
            toolCandidates: fallbackRes.cognitiveResult.toolCandidates,
        }, fallbackRes.cognitiveResult.rawOutput || '', {
            tier: 'deterministic-fallback',
            providerName: this.fallbackProvider.providerName,
            modelName: this.fallbackProvider.modelName,
        });
        return Object.freeze({
            proposal,
            activeTier: 'deterministic-fallback',
            providerName: this.fallbackProvider.providerName,
            modelName: this.fallbackProvider.modelName,
            fallbackOccurred: true,
            fallbackChain: Object.freeze([...fallbackChain]),
            promptTokens: fallbackRes.usage.promptTokens,
            completionTokens: fallbackRes.usage.completionTokens,
            totalTokens: fallbackRes.usage.totalTokens,
            latencyMs: Date.now() - started,
            estimatedCostUsd: 0.0,
            wasEscalatedToCloud: false,
        });
    }
}
