import type { CognitiveProviderType, CognitivePromptContext, CognitiveResult, CognitiveHealthStatus } from './cognitiveTypes.js';
import type { CognitiveProvider, CognitiveExecutionOptions } from './cognitiveProvider.js';
export declare class OllamaProvider implements CognitiveProvider {
    readonly providerType: CognitiveProviderType;
    readonly providerName = "ollama-local";
    readonly baseUrl: string;
    readonly modelName: string;
    readonly defaultTimeoutMs: number;
    constructor(options?: {
        baseUrl?: string;
        model?: string;
        timeoutMs?: number;
    });
    /**
     * Genuine health probe hitting /api/tags
     */
    healthCheck(): Promise<CognitiveHealthStatus>;
    /**
     * Executes genuine HTTP request against Ollama /api/generate
     */
    process(context: CognitivePromptContext, options?: CognitiveExecutionOptions): Promise<CognitiveResult>;
    /**
     * Safe normalization ensuring all contract invariants are satisfied.
     */
    private normalizeCognitiveOutput;
    summarize(taskSummary: Record<string, unknown>): Promise<string>;
    shutdown(): Promise<void>;
}
