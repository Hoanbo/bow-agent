import type { CognitivePromptContext, CognitiveInferenceBudget } from './cognitiveTypes.js';
import { GeminiCognitiveProvider, OllamaCognitiveProvider, DeterministicFallbackCognitiveProvider, type ProviderExecutionResult } from './cognitiveProviders.js';
export interface CognitiveCircuitState {
    consecutiveFailures: number;
    lastFailureAt: number;
    isOpen: boolean;
}
export type CognitiveRoutingHierarchy = 'local-first' | 'cloud-first';
export interface CognitiveCircuitBreakerOptions {
    readonly failureThreshold?: number;
    readonly cooldownMs?: number;
    readonly geminiProvider?: GeminiCognitiveProvider;
    readonly ollamaProvider?: OllamaCognitiveProvider;
    readonly fallbackProvider?: DeterministicFallbackCognitiveProvider;
    readonly routingMode?: CognitiveRoutingHierarchy;
    readonly cloudEscalationEnabled?: boolean;
}
export interface RoutedInferenceResult extends ProviderExecutionResult {
    readonly providerType: 'cloud-gemini' | 'ollama-local' | 'deterministic-fallback';
    readonly modelName: string;
    readonly fallbackOccurred: boolean;
    readonly fallbackChain: readonly string[];
}
export declare class CognitiveCircuitBreaker {
    private readonly failureThreshold;
    private readonly cooldownMs;
    readonly routingMode: CognitiveRoutingHierarchy;
    readonly cloudEscalationEnabled: boolean;
    readonly geminiProvider: GeminiCognitiveProvider;
    readonly ollamaProvider: OllamaCognitiveProvider;
    readonly fallbackProvider: DeterministicFallbackCognitiveProvider;
    private readonly circuitStates;
    constructor(options?: CognitiveCircuitBreakerOptions);
    getCircuitState(providerType: string): CognitiveCircuitState;
    recordSuccess(providerType: string): void;
    recordFailure(providerType: string): void;
    isAvailable(providerType: string): boolean;
    /**
     * Routes inference through the canonical multi-tier fallback ladder:
     * Tier 1: cloud-gemini (if eligible & circuit closed)
     * Tier 2: ollama-local (if eligible & circuit closed)
     * Tier 3: deterministic-fallback (guaranteed)
     */
    routeInference(context: CognitivePromptContext, options: {
        readonly preference?: 'auto' | 'cloud-gemini' | 'ollama-local' | 'deterministic-fallback' | 'local-first';
        readonly budget?: CognitiveInferenceBudget;
        readonly signal?: AbortSignal;
        readonly isUserStopActive?: () => boolean;
        readonly onTierAttempt?: (tier: string) => void;
    }): Promise<RoutedInferenceResult>;
}
