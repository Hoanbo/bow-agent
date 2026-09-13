import { type ContextFragment, type ContextBudgetOptions } from './contextTypes.js';
export interface NormalizedBudget {
    readonly maxPromptTokens: number;
    readonly maxCompletionTokens: number;
    readonly reservedCompletionTokens: number;
}
export declare class TokenBudgetManager {
    private readonly maxPromptTokens;
    private readonly maxCompletionTokens;
    private readonly reservedCompletionTokens;
    constructor(options?: ContextBudgetOptions);
    getBudget(): NormalizedBudget;
    /**
     * Deterministic token estimation approximation.
     * Standard 4 characters per token heuristic accounting for UTF-8 bytes.
     */
    estimateTokens(content: string): number;
    /**
     * Estimates aggregate token count across a collection of fragments.
     */
    estimateFragmentsTotalTokens(fragments: readonly ContextFragment[]): number;
    /**
     * Validates whether Tier 1 (critical safety and task identity) fits within budget.
     * If Tier 1 alone breaches the budget, assembly cannot succeed safely and must fail closed.
     */
    validateTier1Budget(fragments: readonly ContextFragment[]): void;
    /**
     * Checks if total estimated tokens exceed the max prompt tokens.
     */
    exceedsBudget(fragments: readonly ContextFragment[]): boolean;
}
