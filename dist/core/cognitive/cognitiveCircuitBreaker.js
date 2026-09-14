// src/core/cognitive/cognitiveCircuitBreaker.ts
// BOWCON V4.0 — MS-1.4.02: DETERMINISTIC PROVIDER CIRCUIT BREAKER & ROUTER
//
// Invariants:
// HIERARCHY: CLOUD_GEMINI -> OLLAMA_LOCAL -> DETERMINISTIC_FALLBACK
// 3_CONSECUTIVE_FAILURES -> OPEN_CIRCUIT
// CIRCUIT_COOLDOWN == 30_000 MS
// MAX_RETRIES_PER_TIER <= 1 (TRANSIENT ONLY)
// NO_RETRY_ON_AUTH_FAILURE == TRUE
// HONEST_FALLBACK_RECORDING == TRUE
import { GeminiCognitiveProvider, OllamaCognitiveProvider, DeterministicFallbackCognitiveProvider, } from './cognitiveProviders.js';
export class CognitiveCircuitBreaker {
    failureThreshold;
    cooldownMs;
    routingMode;
    cloudEscalationEnabled;
    geminiProvider;
    ollamaProvider;
    fallbackProvider;
    circuitStates = new Map();
    constructor(options) {
        this.failureThreshold = options?.failureThreshold ?? 3;
        this.cooldownMs = options?.cooldownMs ?? 30000;
        this.routingMode = options?.routingMode || (process.env.COGNITIVE_ROUTING_MODE === 'local-first' ? 'local-first' : 'cloud-first');
        this.cloudEscalationEnabled = options?.cloudEscalationEnabled ?? (process.env.CLOUD_ESCALATION_ENABLED !== 'false');
        this.geminiProvider = options?.geminiProvider || new GeminiCognitiveProvider();
        this.ollamaProvider = options?.ollamaProvider || new OllamaCognitiveProvider();
        this.fallbackProvider = options?.fallbackProvider || new DeterministicFallbackCognitiveProvider();
    }
    getCircuitState(providerType) {
        const existing = this.circuitStates.get(providerType);
        if (!existing) {
            return { consecutiveFailures: 0, lastFailureAt: 0, isOpen: false };
        }
        // Check if cooldown expired
        if (existing.isOpen && Date.now() - existing.lastFailureAt > this.cooldownMs) {
            existing.isOpen = false;
            existing.consecutiveFailures = 0;
            this.circuitStates.set(providerType, existing);
        }
        return { ...existing };
    }
    recordSuccess(providerType) {
        this.circuitStates.delete(providerType);
    }
    recordFailure(providerType) {
        const existing = this.circuitStates.get(providerType) || {
            consecutiveFailures: 0,
            lastFailureAt: 0,
            isOpen: false,
        };
        existing.consecutiveFailures++;
        existing.lastFailureAt = Date.now();
        if (existing.consecutiveFailures >= this.failureThreshold) {
            existing.isOpen = true;
        }
        this.circuitStates.set(providerType, existing);
    }
    isAvailable(providerType) {
        const state = this.getCircuitState(providerType);
        return !state.isOpen;
    }
    /**
     * Routes inference through the canonical multi-tier fallback ladder:
     * Tier 1: cloud-gemini (if eligible & circuit closed)
     * Tier 2: ollama-local (if eligible & circuit closed)
     * Tier 3: deterministic-fallback (guaranteed)
     */
    async routeInference(context, options) {
        const preference = options.preference || 'auto';
        const fallbackChain = [];
        // Helper to verify USER_STOP between transitions
        const checkStop = () => {
            if (options.isUserStopActive && options.isUserStopActive()) {
                throw new Error('USER_STOP_PREEMPTED');
            }
        };
        // If deterministic fallback explicitly preferred, jump straight to it
        if (preference === 'deterministic-fallback') {
            checkStop();
            options.onTierAttempt?.('deterministic-fallback');
            const result = await this.fallbackProvider.executeInference(context, {
                signal: options.signal,
            });
            return {
                ...result,
                providerType: 'deterministic-fallback',
                modelName: this.fallbackProvider.modelName,
                fallbackOccurred: false,
                fallbackChain: [],
            };
        }
        // Determine if we are routing Local-First
        const isLocalFirst = preference === 'local-first' || (preference === 'auto' && this.routingMode === 'local-first');
        if (isLocalFirst) {
            // ======================================================================
            // MS-1.5.01 LOCAL-FIRST LADDER: Ollama -> Gemini Escalation -> Fallback
            // ======================================================================
            // Tier 1: Local Ollama
            if (!this.isAvailable('ollama-local')) {
                fallbackChain.push('ollama-local:circuit-open');
            }
            else {
                checkStop();
                fallbackChain.push('ollama-local');
                options.onTierAttempt?.('ollama-local');
                try {
                    const result = await this.ollamaProvider.executeInference(context, {
                        timeoutMs: Math.min(options.budget?.maxLatencyMs || 30000, 30000),
                        budget: options.budget,
                        signal: options.signal,
                    });
                    checkStop();
                    this.recordSuccess('ollama-local');
                    return {
                        ...result,
                        providerType: 'ollama-local',
                        modelName: this.ollamaProvider.modelName,
                        fallbackOccurred: false,
                        fallbackChain: Object.freeze([...fallbackChain]),
                    };
                }
                catch (err) {
                    this.recordFailure('ollama-local');
                    if (err.message === 'USER_STOP_PREEMPTED' || options.isUserStopActive?.() || options.signal?.aborted) {
                        throw new Error('USER_STOP_PREEMPTED');
                    }
                    // Fall through to Tier 2: Cloud Gemini Escalation
                }
            }
            checkStop();
            // Tier 2: Cloud Gemini Escalation (Optional & Gated)
            if (this.cloudEscalationEnabled && this.geminiProvider.isConfigured()) {
                if (!this.isAvailable('cloud-gemini')) {
                    fallbackChain.push('cloud-gemini:circuit-open');
                }
                else {
                    fallbackChain.push('cloud-gemini');
                    options.onTierAttempt?.('cloud-gemini');
                    try {
                        const result = await this.geminiProvider.executeInference(context, {
                            timeoutMs: Math.min(options.budget?.maxLatencyMs || 10000, 15000),
                            budget: options.budget,
                            signal: options.signal,
                        });
                        checkStop();
                        this.recordSuccess('cloud-gemini');
                        return {
                            ...result,
                            providerType: 'cloud-gemini',
                            modelName: this.geminiProvider.modelName,
                            fallbackOccurred: true,
                            fallbackChain: Object.freeze([...fallbackChain]),
                        };
                    }
                    catch (err) {
                        this.recordFailure('cloud-gemini');
                        if (err.message === 'USER_STOP_PREEMPTED' || options.isUserStopActive?.() || options.signal?.aborted) {
                            throw new Error('USER_STOP_PREEMPTED');
                        }
                        // Fall through to Tier 3: Deterministic Fallback
                    }
                }
            }
            else {
                fallbackChain.push('cloud-gemini:skipped');
            }
            checkStop();
            // Tier 3: Deterministic Fallback
            fallbackChain.push('deterministic-fallback');
            options.onTierAttempt?.('deterministic-fallback');
            const result = await this.fallbackProvider.executeInference(context, {
                signal: options.signal,
            });
            checkStop();
            return {
                ...result,
                providerType: 'deterministic-fallback',
                modelName: this.fallbackProvider.modelName,
                fallbackOccurred: true,
                fallbackChain: Object.freeze([...fallbackChain]),
            };
        }
        // ========================================================================
        // LEGACY CLOUD-FIRST LADDER (Gemini -> Ollama -> Fallback)
        // Preserves backward compatibility for MS-1.4.02 regressions
        // ========================================================================
        // Tier 1: Cloud Gemini
        if ((preference === 'auto' || preference === 'cloud-gemini') && this.geminiProvider.isConfigured()) {
            if (!this.isAvailable('cloud-gemini')) {
                fallbackChain.push('cloud-gemini:circuit-open');
            }
            else {
                checkStop();
                fallbackChain.push('cloud-gemini');
                options.onTierAttempt?.('cloud-gemini');
                try {
                    const result = await this.geminiProvider.executeInference(context, {
                        timeoutMs: Math.min(options.budget?.maxLatencyMs || 10000, 15000),
                        budget: options.budget,
                        signal: options.signal,
                    });
                    checkStop();
                    this.recordSuccess('cloud-gemini');
                    return {
                        ...result,
                        providerType: 'cloud-gemini',
                        modelName: this.geminiProvider.modelName,
                        fallbackOccurred: false,
                        fallbackChain: [],
                    };
                }
                catch (err) {
                    this.recordFailure('cloud-gemini');
                    if (err.message === 'USER_STOP_PREEMPTED' || options.isUserStopActive?.() || options.signal?.aborted) {
                        throw new Error('USER_STOP_PREEMPTED');
                    }
                    // Continue down fallback ladder
                }
            }
        }
        // Check stop signal before progressing to Tier 2
        checkStop();
        // Tier 2: Local Ollama
        if (preference === 'auto' || preference === 'cloud-gemini' || preference === 'ollama-local') {
            if (!this.isAvailable('ollama-local')) {
                fallbackChain.push('ollama-local:circuit-open');
            }
            else {
                fallbackChain.push('ollama-local');
                options.onTierAttempt?.('ollama-local');
                try {
                    const result = await this.ollamaProvider.executeInference(context, {
                        timeoutMs: Math.min(options.budget?.maxLatencyMs || 30000, 30000),
                        budget: options.budget,
                        signal: options.signal,
                    });
                    checkStop();
                    this.recordSuccess('ollama-local');
                    return {
                        ...result,
                        providerType: 'ollama-local',
                        modelName: this.ollamaProvider.modelName,
                        fallbackOccurred: fallbackChain.length > 1 || preference !== 'ollama-local',
                        fallbackChain: Object.freeze([...fallbackChain]),
                    };
                }
                catch (err) {
                    this.recordFailure('ollama-local');
                    if (err.message === 'USER_STOP_PREEMPTED' || options.isUserStopActive?.() || options.signal?.aborted) {
                        throw new Error('USER_STOP_PREEMPTED');
                    }
                    // Continue down fallback ladder
                }
            }
        }
        // Check stop signal before progressing to Tier 3
        checkStop();
        // Tier 3: Deterministic Fallback (Guaranteed zero-network rule execution)
        fallbackChain.push('deterministic-fallback');
        options.onTierAttempt?.('deterministic-fallback');
        const result = await this.fallbackProvider.executeInference(context, {
            signal: options.signal,
        });
        checkStop();
        return {
            ...result,
            providerType: 'deterministic-fallback',
            modelName: this.fallbackProvider.modelName,
            fallbackOccurred: true,
            fallbackChain: Object.freeze([...fallbackChain]),
        };
    }
}
