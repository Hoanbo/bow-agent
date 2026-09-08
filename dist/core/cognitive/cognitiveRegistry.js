// src/core/cognitive/cognitiveRegistry.ts
// BOWCON V4.0 — MS-1.3.32: COGNITIVE PROVIDER REGISTRY & HIERARCHY SELECTOR
//
// Invariants:
// PROVIDER_HIERARCHY: LOCAL_REAL -> OLLAMA -> DETERMINISTIC_FALLBACK
// NEVER_PRETEND_FALLBACK_IS_LLM == TRUE
// FAILURE != BRAIN_DEATH
import { OllamaProvider } from './ollamaProvider.js';
import { DeterministicFallbackProvider } from './deterministicFallbackProvider.js';
export class CognitiveRegistry {
    providers = new Map();
    fallbackProvider;
    config;
    constructor(config) {
        this.config = {
            providerPreference: config?.providerPreference || process.env.BRAIN_COGNITIVE_PROVIDER || 'auto',
            ollamaBaseUrl: config?.ollamaBaseUrl || process.env.BRAIN_OLLAMA_BASE_URL,
            ollamaModel: config?.ollamaModel || process.env.BRAIN_OLLAMA_MODEL,
            timeoutMs: config?.timeoutMs || (process.env.BRAIN_OLLAMA_TIMEOUT_MS ? Number(process.env.BRAIN_OLLAMA_TIMEOUT_MS) : undefined),
            maxRetries: config?.maxRetries || 2,
        };
        this.fallbackProvider = new DeterministicFallbackProvider();
        this.registerProvider(this.fallbackProvider);
        const ollama = new OllamaProvider({
            baseUrl: this.config.ollamaBaseUrl,
            model: this.config.ollamaModel,
            timeoutMs: this.config.timeoutMs,
        });
        this.registerProvider(ollama);
    }
    registerProvider(provider) {
        this.providers.set(provider.providerType, provider);
    }
    getProvider(type) {
        return this.providers.get(type);
    }
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    failureTracking = new Map();
    cooldownMs = 30000;
    recordProviderFailure(type) {
        const existing = this.failureTracking.get(type) || { consecutiveFailures: 0, lastFailureAt: 0 };
        existing.consecutiveFailures++;
        existing.lastFailureAt = Date.now();
        this.failureTracking.set(type, existing);
    }
    recordProviderSuccess(type) {
        this.failureTracking.delete(type);
    }
    isProviderDegraded(type) {
        const record = this.failureTracking.get(type);
        if (!record)
            return false;
        if (Date.now() - record.lastFailureAt > this.cooldownMs) {
            this.failureTracking.delete(type);
            return false;
        }
        return record.consecutiveFailures >= 1;
    }
    /**
     * Evaluates provider health and selects the authoritative provider according to hierarchy:
     * 1. If preference is 'deterministic-fallback' -> use fallback
     * 2. If 'local-real' or 'ollama' or 'auto' -> probe Ollama health
     * 3. If healthy -> return Ollama
     * 4. If unhealthy -> fall back to DeterministicFallbackProvider with honest metadata
     */
    async selectActiveProvider() {
        const pref = this.config.providerPreference;
        if (pref === 'deterministic-fallback') {
            return {
                provider: this.fallbackProvider,
                providerType: 'deterministic-fallback',
                isFallback: true,
                reason: 'Explicitly configured for deterministic fallback mode.',
            };
        }
        // Check circuit breaker cooldown
        if (this.isProviderDegraded('ollama')) {
            return {
                provider: this.fallbackProvider,
                providerType: 'deterministic-fallback',
                isFallback: true,
                reason: 'Ollama local model is in circuit-breaker cooldown after failure; fallback active.',
            };
        }
        // Try Ollama provider
        const ollama = this.providers.get('ollama');
        if (ollama) {
            const health = await ollama.healthCheck();
            if (health.isAvailable) {
                return {
                    provider: ollama,
                    providerType: 'ollama',
                    isFallback: false,
                    reason: `Real Ollama daemon active and healthy at ${ollama.baseUrl} (model: ${ollama.modelName}).`,
                };
            }
        }
        // Degrade to deterministic fallback
        return {
            provider: this.fallbackProvider,
            providerType: 'deterministic-fallback',
            isFallback: true,
            reason: 'Ollama local model unavailable or offline; activating deterministic fallback.',
        };
    }
    /**
     * Health check all registered providers
     */
    async checkAllHealth() {
        const results = {};
        for (const [key, provider] of this.providers) {
            results[key] = await provider.healthCheck();
        }
        return results;
    }
    async shutdownAll() {
        for (const provider of this.providers.values()) {
            await provider.shutdown();
        }
    }
}
