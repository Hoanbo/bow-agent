import type { PolicyEvolutionIntakeRequest } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type { EvolutionPlan, EvolutionPlanType, PolicyEvolutionPlanningOptions } from './policyEvolutionPlanningTypes.js';
export declare class PolicyEvolutionPlanEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly plans;
    constructor(options?: PolicyEvolutionPlanningOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantPlans;
    /**
     * Deterministically maps intake action to plan type.
     */
    mapIntakeActionToPlanType(intakeAction: string): EvolutionPlanType;
    /**
     * Creates an evolution plan from a verified intake request.
     */
    createEvolutionPlan(intake: PolicyEvolutionIntakeRequest): EvolutionPlan;
    /**
     * Retrieves an existing plan for an intakeId.
     */
    getPlanByIntakeId(tenantPartition: string, intakeId: string): EvolutionPlan | undefined;
}
