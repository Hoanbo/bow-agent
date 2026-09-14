import { type SymbolicConstraint, type SymbolicConstraintPolarity, type DeliberationHypothesis, type DeliberationContradiction, type EvidenceBinding } from './deliberationTypes.js';
export interface SymbolicConstraintEvaluationResult {
    readonly hypothesisId: string;
    readonly satisfiedConstraintIds: readonly string[];
    readonly violatedConstraintIds: readonly string[];
    readonly validityScore: number;
    readonly contradictions: readonly DeliberationContradiction[];
    readonly evaluatedAt: string;
}
export interface SymbolicConstraintEngineOptions {
    readonly userStopProvider?: () => boolean;
}
export declare class SymbolicConstraintEngine {
    private readonly userStopProvider;
    constructor(options?: SymbolicConstraintEngineOptions);
    /**
     * Creates and registers a validated SymbolicConstraint.
     * Dynamic code execution or shell invocation is strictly forbidden.
     */
    createConstraint(input: {
        constraintId: string;
        predicate: string;
        polarity: SymbolicConstraintPolarity;
        sourceGoalId?: string;
        active?: boolean;
        description?: string;
    }): SymbolicConstraint;
    /**
     * Deterministically evaluates a hypothesis against an array of symbolic constraints.
     * Fails closed: if an evaluation throws or cannot be verified safely, treated as violated for MUST.
     */
    evaluateHypothesis(hypothesis: DeliberationHypothesis, constraints: readonly SymbolicConstraint[], evidenceBindings?: readonly EvidenceBinding[]): SymbolicConstraintEvaluationResult;
    /**
     * Deterministic, bounded predicate evaluation.
     * Supported formats:
     *  - "contains:<term>"
     *  - "prohibits:<term>"
     *  - "requires:<capability_or_evidence>"
     *  - "scope:<path>"
     *  - "max_length:<num>"
     *  - "evidence_verified:<sourceType>"
     *  - "not:<inner_predicate>"
     *  - "all:<p1>,<p2>"
     *  - "any:<p1>,<p2>"
     *  - simple text search fallback
     */
    private evaluatePredicate;
}
export declare const globalSymbolicConstraintEngine: SymbolicConstraintEngine;
