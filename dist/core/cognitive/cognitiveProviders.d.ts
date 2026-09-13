import { type CognitiveProviderType, type CognitivePromptContext, type CognitiveResult, type CognitiveHealthStatus, type CognitiveInferenceBudget } from './cognitiveTypes.js';
import type { CognitiveProvider, CognitiveExecutionOptions } from './cognitiveProvider.js';
export interface ProviderExecutionMeta {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
    readonly latencyMs: number;
    readonly estimatedCostUsd: number;
}
export interface ProviderExecutionResult {
    readonly cognitiveResult: CognitiveResult;
    readonly usage: ProviderExecutionMeta;
}
export type FetchFunction = typeof fetch;
export interface GeminiProviderOptions {
    readonly apiKey?: string;
    readonly modelName?: string;
    readonly timeoutMs?: number;
    readonly baseUrl?: string;
    readonly fetchFn?: FetchFunction;
}
export declare class GeminiCognitiveProvider implements CognitiveProvider {
    readonly providerType: CognitiveProviderType;
    readonly providerName = "cloud-gemini-provider";
    readonly modelName: string;
    readonly defaultTimeoutMs: number;
    private readonly apiKeyResolver;
    private readonly baseUrl;
    private readonly fetchFn;
    private static readonly INPUT_PRICE_PER_TOKEN;
    private static readonly OUTPUT_PRICE_PER_TOKEN;
    constructor(options?: GeminiProviderOptions);
    isConfigured(): boolean;
    healthCheck(): Promise<CognitiveHealthStatus>;
    process(context: CognitivePromptContext, options?: CognitiveExecutionOptions & {
        readonly budget?: CognitiveInferenceBudget;
    }): Promise<CognitiveResult>;
    executeInference(context: CognitivePromptContext, options?: CognitiveExecutionOptions & {
        readonly budget?: CognitiveInferenceBudget;
    }): Promise<ProviderExecutionResult>;
    summarize(taskSummary: Record<string, unknown>): Promise<string>;
    shutdown(): Promise<void>;
    private parseAndValidateResult;
}
export interface OllamaProviderOptions {
    readonly baseUrl?: string;
    readonly modelName?: string;
    readonly timeoutMs?: number;
    readonly fetchFn?: FetchFunction;
}
export declare class OllamaCognitiveProvider implements CognitiveProvider {
    readonly providerType: CognitiveProviderType;
    readonly providerName = "ollama-local-provider";
    readonly baseUrl: string;
    readonly modelName: string;
    readonly defaultTimeoutMs: number;
    private readonly fetchFn;
    constructor(options?: OllamaProviderOptions);
    healthCheck(): Promise<CognitiveHealthStatus>;
    process(context: CognitivePromptContext, options?: CognitiveExecutionOptions & {
        readonly budget?: CognitiveInferenceBudget;
    }): Promise<CognitiveResult>;
    executeInference(context: CognitivePromptContext, options?: CognitiveExecutionOptions & {
        readonly budget?: CognitiveInferenceBudget;
    }): Promise<ProviderExecutionResult>;
    summarize(taskSummary: Record<string, unknown>): Promise<string>;
    shutdown(): Promise<void>;
    private parseAndValidateResult;
}
export declare class DeterministicFallbackCognitiveProvider implements CognitiveProvider {
    readonly providerType: CognitiveProviderType;
    readonly providerName = "deterministic-fallback-provider";
    readonly modelName = "bowcon-rule-engine-v4";
    healthCheck(): Promise<CognitiveHealthStatus>;
    process(context: CognitivePromptContext, options?: CognitiveExecutionOptions): Promise<CognitiveResult>;
    executeInference(context: CognitivePromptContext, _options?: CognitiveExecutionOptions): Promise<ProviderExecutionResult>;
    summarize(taskSummary: Record<string, unknown>): Promise<string>;
    shutdown(): Promise<void>;
}
