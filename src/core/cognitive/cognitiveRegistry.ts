// src/core/cognitive/cognitiveRegistry.ts
// BOWCON V4.0 — MS-1.3.32: COGNITIVE PROVIDER REGISTRY & HIERARCHY SELECTOR
//
// Invariants:
// PROVIDER_HIERARCHY: LOCAL_REAL -> OLLAMA -> DETERMINISTIC_FALLBACK
// NEVER_PRETEND_FALLBACK_IS_LLM == TRUE
// FAILURE != BRAIN_DEATH

import type {
  CognitiveProvider,
} from './cognitiveProvider.js';
import type {
  CognitiveProviderType,
  CognitiveProviderConfig,
  CognitiveHealthStatus,
} from './cognitiveTypes.js';
import { OllamaProvider } from './ollamaProvider.js';
import { DeterministicFallbackProvider } from './deterministicFallbackProvider.js';

export interface ProviderSelectionResult {
  readonly provider: CognitiveProvider;
  readonly providerType: CognitiveProviderType;
  readonly isFallback: boolean;
  readonly reason: string;
}

export class CognitiveRegistry {
  private readonly providers = new Map<string, CognitiveProvider>();
  private readonly fallbackProvider: DeterministicFallbackProvider;
  private config: CognitiveProviderConfig;

  constructor(config?: CognitiveProviderConfig) {
    this.config = {
      providerPreference: config?.providerPreference || (process.env.BRAIN_COGNITIVE_PROVIDER as any) || 'auto',
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

  public registerProvider(provider: CognitiveProvider): void {
    this.providers.set(provider.providerType, provider);
  }

  public getProvider(type: CognitiveProviderType): CognitiveProvider | undefined {
    return this.providers.get(type);
  }

  public updateConfig(config: Partial<CognitiveProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private readonly failureTracking = new Map<
    string,
    { consecutiveFailures: number; lastFailureAt: number }
  >();
  private readonly cooldownMs = 30000;

  public recordProviderFailure(type: CognitiveProviderType): void {
    const existing = this.failureTracking.get(type) || { consecutiveFailures: 0, lastFailureAt: 0 };
    existing.consecutiveFailures++;
    existing.lastFailureAt = Date.now();
    this.failureTracking.set(type, existing);
  }

  public recordProviderSuccess(type: CognitiveProviderType): void {
    this.failureTracking.delete(type);
  }

  public isProviderDegraded(type: CognitiveProviderType): boolean {
    const record = this.failureTracking.get(type);
    if (!record) return false;
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
  public async selectActiveProvider(): Promise<ProviderSelectionResult> {
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
    const ollama = this.providers.get('ollama') as OllamaProvider | undefined;
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
  public async checkAllHealth(): Promise<Record<string, CognitiveHealthStatus>> {
    const results: Record<string, CognitiveHealthStatus> = {};
    for (const [key, provider] of this.providers) {
      results[key] = await provider.healthCheck();
    }
    return results;
  }

  public async shutdownAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.shutdown();
    }
  }
}
