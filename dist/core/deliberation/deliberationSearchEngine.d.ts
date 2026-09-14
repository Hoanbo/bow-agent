import { type DeliberationHypothesis, type EvidenceBinding, type SymbolicConstraint, type DeliberationContradiction } from './deliberationTypes.js';
import { type SymbolicConstraintEngine } from './symbolicConstraintEngine.js';
import { type HypothesisEngine } from './hypothesisEngine.js';
export interface SearchEvaluationOutcome {
    readonly evaluatedHypotheses: readonly DeliberationHypothesis[];
    readonly topHypotheses: readonly DeliberationHypothesis[];
    readonly winningHypothesis: DeliberationHypothesis | null;
    readonly contradictions: readonly DeliberationContradiction[];
    readonly isConverged: boolean;
    readonly isExhausted: boolean;
    readonly iterationsRun: number;
}
export interface DeliberationSearchEngineOptions {
    readonly constraintEngine?: SymbolicConstraintEngine;
    readonly hypothesisEngine?: HypothesisEngine;
    readonly userStopProvider?: () => boolean;
}
export declare class DeliberationSearchEngine {
    private readonly constraintEngine;
    private readonly hypothesisEngine;
    private readonly userStopProvider;
    constructor(options?: DeliberationSearchEngineOptions);
    /**
     * Deterministically scores and ranks candidate hypotheses within bounded depth and count limits.
     */
    searchAndRank(hypotheses: readonly DeliberationHypothesis[], constraints: readonly SymbolicConstraint[], evidenceBindings: readonly EvidenceBinding[], options?: {
        readonly maxDepth?: number;
        readonly convergenceThreshold?: number;
    }): SearchEvaluationOutcome;
}
export declare const globalDeliberationSearchEngine: DeliberationSearchEngine;
