import type { CandidateDraft, CandidateValidationResult, PolicyEvolutionPlanningOptions } from './policyEvolutionPlanningTypes.js';
import { PolicyEvolutionConstraintEngine } from './policyEvolutionConstraintEngine.js';
export declare class PolicyCandidateValidationEngine {
    private readonly constraintEngine;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyEvolutionPlanningOptions, constraintEngine?: PolicyEvolutionConstraintEngine);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Independently validates a candidate policy draft.
     */
    validateCandidateDraft(draft: CandidateDraft): CandidateValidationResult;
}
