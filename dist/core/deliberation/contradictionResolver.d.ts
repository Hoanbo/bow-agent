import { type DeliberationContradiction, type DeliberationHypothesis, type EvidenceBinding, type SymbolicConstraint } from './deliberationTypes.js';
export interface ContradictionAnalysisResult {
    readonly contradictions: readonly DeliberationContradiction[];
    readonly hasCriticalContradiction: boolean;
    readonly requiresHumanReview: boolean;
    readonly resolvableContradictions: readonly DeliberationContradiction[];
    readonly unresolvedContradictions: readonly DeliberationContradiction[];
    readonly rationale: string;
}
export interface ContradictionResolverOptions {
    readonly userStopProvider?: () => boolean;
}
export declare class ContradictionResolver {
    private readonly userStopProvider;
    constructor(options?: ContradictionResolverOptions);
    /**
     * Scans hypotheses, constraints, and evidence for contradictions across all 6 canonical categories.
     * Fails closed: does not silently mutate, delete, or rewrite evidence/hypotheses.
     */
    detectAndAnalyze(hypotheses: readonly DeliberationHypothesis[], constraints: readonly SymbolicConstraint[], evidenceBindings: readonly EvidenceBinding[], targetGoalId?: string): ContradictionAnalysisResult;
    private detectConstraintContradictions;
    private detectEvidenceContradictions;
    private detectLogicalContradictions;
    private detectGoalContradictions;
    private detectResourceContradictions;
    private detectPolicyContradictions;
}
export declare const globalContradictionResolver: ContradictionResolver;
