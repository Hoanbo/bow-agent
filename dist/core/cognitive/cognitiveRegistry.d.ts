import type { CognitiveProvider } from './cognitiveProvider.js';
import type { CognitiveProviderType, CognitiveProviderConfig, CognitiveHealthStatus } from './cognitiveTypes.js';
export interface ProviderSelectionResult {
    readonly provider: CognitiveProvider;
    readonly providerType: CognitiveProviderType;
    readonly isFallback: boolean;
    readonly reason: string;
}
export declare class CognitiveRegistry {
    private readonly providers;
    private readonly fallbackProvider;
    private config;
    constructor(config?: CognitiveProviderConfig);
    registerProvider(provider: CognitiveProvider): void;
    getProvider(type: CognitiveProviderType): CognitiveProvider | undefined;
    updateConfig(config: Partial<CognitiveProviderConfig>): void;
    private readonly failureTracking;
    private readonly cooldownMs;
    recordProviderFailure(type: CognitiveProviderType): void;
    recordProviderSuccess(type: CognitiveProviderType): void;
    isProviderDegraded(type: CognitiveProviderType): boolean;
    /**
     * Evaluates provider health and selects the authoritative provider according to hierarchy:
     * 1. If preference is 'deterministic-fallback' -> use fallback
     * 2. If 'local-real' or 'ollama' or 'auto' -> probe Ollama health
     * 3. If healthy -> return Ollama
     * 4. If unhealthy -> fall back to DeterministicFallbackProvider with honest metadata
     */
    selectActiveProvider(): Promise<ProviderSelectionResult>;
    /**
     * Health check all registered providers
     */
    checkAllHealth(): Promise<Record<string, CognitiveHealthStatus>>;
    shutdownAll(): Promise<void>;
}
