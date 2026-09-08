import type { BrainModelOutput } from './brainTypes.js';
export interface BrainModelProvider {
    /** Returns a proposed understanding + plan for the given input. */
    understand(input: string, context?: Record<string, unknown>): Promise<BrainModelOutput>;
    /** Returns a reasoning trace for a given plan + observations. */
    reason(plan: string, observations: string[], context?: Record<string, unknown>): Promise<string>;
    /** Summarizes a completed task result for human-readable output. */
    summarize(taskSummary: Record<string, unknown>): Promise<string>;
    /** Health check — returns true if provider is usable. */
    isAvailable(): Promise<boolean>;
    /** Provider name for observability. */
    readonly providerName: string;
}
export declare class DeterministicBrainModelProvider implements BrainModelProvider {
    readonly providerName = "deterministic";
    private readonly fallback;
    understand(input: string, context?: Record<string, unknown>): Promise<BrainModelOutput>;
    reason(plan: string, observations: string[], _context?: Record<string, unknown>): Promise<string>;
    summarize(taskSummary: Record<string, unknown>): Promise<string>;
    isAvailable(): Promise<boolean>;
}
export declare class OllamaModelProvider implements BrainModelProvider {
    readonly providerName = "ollama-local";
    private readonly ollama;
    private readonly fallback;
    constructor(endpoint?: string, model?: string);
    isAvailable(): Promise<boolean>;
    understand(input: string, context?: Record<string, unknown>): Promise<BrainModelOutput>;
    reason(plan: string, observations: string[], context?: Record<string, unknown>): Promise<string>;
    summarize(taskSummary: Record<string, unknown>): Promise<string>;
}
export declare class CognitiveBrainModelProvider implements BrainModelProvider {
    readonly providerName = "cognitive-pipeline";
    private readonly pipeline;
    private readonly fallback;
    constructor(preferred?: 'deterministic' | 'ollama' | 'auto');
    understand(input: string, context?: Record<string, unknown>): Promise<BrainModelOutput>;
    reason(plan: string, observations: string[], context?: Record<string, unknown>): Promise<string>;
    summarize(taskSummary: Record<string, unknown>): Promise<string>;
    isAvailable(): Promise<boolean>;
}
export declare function createBrainModelProvider(preferred?: 'deterministic' | 'ollama' | 'auto'): BrainModelProvider;
