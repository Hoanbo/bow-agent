import type { CandidateDraft, PolicyEvolutionPlanningOptions } from './policyEvolutionPlanningTypes.js';
export declare const HARD_FORBIDDEN_ACTIONS: readonly string[];
export interface ConstraintEvaluationResult {
    readonly passed: boolean;
    readonly violations: readonly string[];
    readonly evaluatedAt: string;
}
export declare class PolicyEvolutionConstraintEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyEvolutionPlanningOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Checks if an action or string matches any hard-forbidden action.
     */
    isHardForbiddenAction(action: string): boolean;
    /**
     * Evaluates all 16 safety constraints against a CandidateDraft.
     */
    evaluateCandidateConstraints(draft: CandidateDraft): ConstraintEvaluationResult;
}
