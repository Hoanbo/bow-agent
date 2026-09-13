export interface AuthorityBoundaryFinding {
    readonly boundaryName: string;
    readonly milestone: string;
    readonly filePath: string;
    readonly rejectsAutonomous: boolean;
    readonly rejectsAnonymous: boolean;
    readonly enforcesAntiSelfApproval: boolean;
    readonly requiresHumanRole: boolean;
    readonly verdict: 'COMPLIANT' | 'NON_COMPLIANT';
    readonly deficiencies: readonly string[];
}
export declare class PolicyPhaseExitAuthorityBoundaryInspector {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Audits all critical human authorization boundaries in Phase 1.3.
     */
    inspectBoundaries(): readonly AuthorityBoundaryFinding[];
}
