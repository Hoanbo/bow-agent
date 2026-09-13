import { type ContextFragment, type ContextCompactionMetrics } from './contextTypes.js';
import { TokenBudgetManager } from './tokenBudgetManager.js';
export interface DynamicCompactionResult {
    readonly compactedFragments: readonly ContextFragment[];
    readonly metrics: ContextCompactionMetrics;
}
export declare class DynamicContextCompactor {
    private readonly budgetManager;
    constructor(budgetManager: TokenBudgetManager);
    /**
     * Evaluates if compaction is needed and performs deterministic multi-stage pruning.
     */
    compact(fragments: readonly ContextFragment[], onStageChange?: (stage: string) => void): DynamicCompactionResult;
    /**
     * Deterministically condenses Tier 3 textual content.
     */
    private condenseTier3Content;
    /**
     * Truncates Tier 2 content deterministically without destroying action labels.
     */
    private truncateTier2Content;
}
