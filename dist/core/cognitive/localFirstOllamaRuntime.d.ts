import type { CognitiveActionProposal, CognitiveProviderHealthReport, CognitiveFailureDetail } from './providerNeutralContracts.js';
import { type CognitivePromptContext, type CognitiveInferenceBudget } from './cognitiveTypes.js';
export interface LocalOllamaRuntimeOptions {
    readonly baseUrl?: string;
    readonly modelName?: string;
    readonly defaultTimeoutMs?: number;
    readonly fetchFn?: typeof fetch;
}
export interface LocalOllamaExecutionResult {
    readonly proposal: CognitiveActionProposal;
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
    readonly latencyMs: number;
    readonly estimatedCostUsd: number;
    readonly isLocal: boolean;
}
export declare class LocalFirstOllamaRuntime {
    readonly providerName = "ollama-local-runtime";
    readonly baseUrl: string;
    readonly modelName: string;
    readonly defaultTimeoutMs: number;
    private readonly fetchFn;
    constructor(options?: LocalOllamaRuntimeOptions);
    /**
     * Health check probing the local Ollama daemon and dynamically updating capability registry.
     */
    probeHealth(): Promise<CognitiveProviderHealthReport>;
    /**
     * Executes local inference using the local model runtime.
     */
    execute(context: CognitivePromptContext, options?: {
        readonly budget?: CognitiveInferenceBudget;
        readonly signal?: AbortSignal;
        readonly timeoutMs?: number;
        readonly isUserStopActive?: () => boolean;
    }): Promise<LocalOllamaExecutionResult>;
    /**
     * Drop-in compatibility method for CognitiveCircuitBreaker and legacy callers.
     */
    executeInference(context: CognitivePromptContext, options?: {
        readonly budget?: CognitiveInferenceBudget;
        readonly signal?: AbortSignal;
        readonly timeoutMs?: number;
        readonly isUserStopActive?: () => boolean;
    }): Promise<{
        readonly cognitiveResult: any;
        readonly usage: {
            readonly promptTokens: number;
            readonly completionTokens: number;
            readonly totalTokens: number;
            readonly latencyMs: number;
            readonly estimatedCostUsd: number;
        };
    }>;
    /**
     * Helper to classify a caught error into typed failure detail.
     */
    classifyFailure(err: any): CognitiveFailureDetail;
}
