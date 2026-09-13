import type { ReadinessAssessmentReport } from '../policyGovernanceReadiness/policyGovernanceReadinessTypes.js';
export interface ReadinessResolutionResult {
    readonly valid: boolean;
    readonly isReadyForPhaseExit: boolean;
    readonly assessmentId: string;
    readonly tenantId: string;
    readonly reportId: string;
    readonly provenanceHash: string;
    readonly issues: readonly string[];
}
export declare class PolicyPhaseExitReadinessResolver {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Resolves and verifies an MS-1.3.76 readiness assessment report.
     * Strictly read-only and non-authoritative.
     */
    resolveReadiness(report: ReadinessAssessmentReport): ReadinessResolutionResult;
}
