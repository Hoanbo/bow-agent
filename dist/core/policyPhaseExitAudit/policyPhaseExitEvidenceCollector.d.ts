import { type AuditEvidenceItem } from './policyPhaseExitAuditTypes.js';
export interface RepositoryEvidenceBundle {
    readonly collectedAt: string;
    readonly evidenceItems: readonly AuditEvidenceItem[];
    readonly totalItemsCount: number;
}
export declare class PolicyPhaseExitEvidenceCollector {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Collects verifiable physical evidence from the repository.
     */
    collectEvidence(): RepositoryEvidenceBundle;
}
