import { type GovernedCandidatePlan, type GovernedPlannerConfig, type GovernedPlanningRequest } from './governedPlanningTypes.js';
export interface PlanValidationResult {
    readonly valid: boolean;
    readonly errors: readonly string[];
    readonly passedRules: readonly string[];
}
export declare class GovernedPlanValidator {
    /**
     * Validates a GovernedPlanningRequest before planning begins.
     */
    static validateRequest(request: GovernedPlanningRequest): void;
    /**
     * Deeply validates the assembled GovernedCandidatePlan.
     * Fails closed if any rule is violated.
     */
    static validateCandidatePlan(plan: GovernedCandidatePlan, config?: GovernedPlannerConfig): PlanValidationResult;
    private static validateSteps;
}
