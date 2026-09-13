import type { GovernanceMilestone } from './policyPhaseExitAuditTypes.js';
export interface MilestoneAuditFinding {
    readonly milestone: GovernanceMilestone;
    readonly name: string;
    readonly directory: string;
    readonly testFile: string;
    readonly implemented: boolean;
    readonly exported: boolean;
    readonly tested: boolean;
    readonly documented: boolean;
    readonly issues: readonly string[];
}
export declare class PolicyPhaseExitMilestoneInspector {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Inspects all 16 Phase 1.3 milestones for concrete evidence.
     */
    inspectMilestones(): readonly MilestoneAuditFinding[];
}
