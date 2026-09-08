import type { CognitiveProviderType, CognitivePromptContext, CognitiveResult, CognitiveHealthStatus } from './cognitiveTypes.js';
import type { CognitiveProvider, CognitiveExecutionOptions } from './cognitiveProvider.js';
export declare class DeterministicFallbackProvider implements CognitiveProvider {
    readonly providerType: CognitiveProviderType;
    readonly providerName = "deterministic-local-fallback";
    readonly modelName = "bowcon-rule-engine-v4";
    healthCheck(): Promise<CognitiveHealthStatus>;
    process(context: CognitivePromptContext, _options?: CognitiveExecutionOptions): Promise<CognitiveResult>;
    summarize(taskSummary: Record<string, unknown>): Promise<string>;
    shutdown(): Promise<void>;
}
