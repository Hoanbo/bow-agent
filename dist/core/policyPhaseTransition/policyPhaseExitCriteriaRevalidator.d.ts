import type { ReadinessAssessmentReport } from '../policyGovernanceReadiness/policyGovernanceReadinessTypes.js';
export interface CriteriaRevalidationResult {
    readonly valid: boolean;
    readonly allCriteriaPass: boolean;
    readonly totalCriteriaChecked: number;
    readonly passedCount: number;
    readonly failedCount: number;
    readonly partialCount: number;
    readonly untestedCount: number;
    readonly issues: readonly string[];
}
export declare class PolicyPhaseExitCriteriaRevalidator {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Revalidates all mandatory criteria in a readiness assessment report.
     */
    revalidateCriteria(report: ReadinessAssessmentReport): CriteriaRevalidationResult;
}
