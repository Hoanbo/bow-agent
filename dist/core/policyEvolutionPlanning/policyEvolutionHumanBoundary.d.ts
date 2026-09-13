import type { CandidateDraft, HumanEvolutionReviewRequirement, PolicyEvolutionPlanningOptions } from './policyEvolutionPlanningTypes.js';
export declare class PolicyEvolutionHumanBoundary {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyEvolutionPlanningOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Asserts that a reviewer identity is not an autonomous persona.
     */
    assertHumanIdentity(reviewerId: string): void;
    /**
     * Formulates a mandatory human review requirement for a candidate draft.
     */
    createReviewRequirement(draft: CandidateDraft, requestedAction?: HumanEvolutionReviewRequirement['requestedReviewAction'], ttlMs?: number): HumanEvolutionReviewRequirement;
}
