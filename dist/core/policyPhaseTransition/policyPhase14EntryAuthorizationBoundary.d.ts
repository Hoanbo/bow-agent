import { type Phase14EntryReadinessRecord, type Phase14EntryAuthorizationRequest, type Phase14EntryAuthorizationRecord } from './policyPhaseTransitionTypes.js';
export declare class PolicyPhase14EntryAuthorizationBoundary {
    private readonly consumedFingerprints;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Evaluates separate human authorization for entering Phase 1.4.
     */
    authorizePhase14Entry(readiness: Phase14EntryReadinessRecord, request: Phase14EntryAuthorizationRequest): Phase14EntryAuthorizationRecord;
}
