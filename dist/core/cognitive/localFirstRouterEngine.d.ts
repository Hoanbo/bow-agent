import { LocalFirstOllamaRuntime } from './localFirstOllamaRuntime.js';
import { GeminiCognitiveProvider, DeterministicFallbackCognitiveProvider } from './cognitiveProviders.js';
import type { CognitiveActionProposal, CognitiveRuntimeTier, CloudEscalationPolicy } from './providerNeutralContracts.js';
import { type CognitivePromptContext, type CognitiveInferenceBudget } from './cognitiveTypes.js';
export interface LocalFirstRouterOptions {
    readonly localRuntime?: LocalFirstOllamaRuntime;
    readonly geminiProvider?: GeminiCognitiveProvider;
    readonly fallbackProvider?: DeterministicFallbackCognitiveProvider;
    readonly cloudEscalationPolicy?: Partial<CloudEscalationPolicy>;
}
export interface RoutedCognitiveResult {
    readonly proposal: CognitiveActionProposal;
    readonly activeTier: CognitiveRuntimeTier;
    readonly providerName: string;
    readonly modelName: string;
    readonly fallbackOccurred: boolean;
    readonly fallbackChain: readonly string[];
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
    readonly latencyMs: number;
    readonly estimatedCostUsd: number;
    readonly wasEscalatedToCloud: boolean;
    readonly sanitizationSummary?: {
        readonly redactedCount: number;
        readonly redactedCategories: readonly string[];
    };
}
export declare class LocalFirstRouterEngine {
    readonly localRuntime: LocalFirstOllamaRuntime;
    readonly geminiProvider: GeminiCognitiveProvider;
    readonly fallbackProvider: DeterministicFallbackCognitiveProvider;
    readonly cloudEscalationPolicy: CloudEscalationPolicy;
    constructor(options?: LocalFirstRouterOptions);
    /**
     * Routes inference using the canonical inverted Local-First ladder:
     * Tier 1: Local Ollama (SLM)
     * Tier 2: Cloud Gemini Escalation (Sanitized & Gated)
     * Tier 3: Deterministic Fallback (Zero-network rule engine)
     */
    route(context: CognitivePromptContext, options?: {
        readonly budget?: CognitiveInferenceBudget;
        readonly signal?: AbortSignal;
        readonly isUserStopActive?: () => boolean;
        readonly forceTier?: CognitiveRuntimeTier;
        readonly onTierAttempt?: (tier: CognitiveRuntimeTier) => void;
    }): Promise<RoutedCognitiveResult>;
    private executeDeterministicFallback;
}
