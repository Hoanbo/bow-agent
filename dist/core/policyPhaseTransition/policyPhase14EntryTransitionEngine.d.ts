import { type PhaseExitCommitRecord, type Phase14EntryReadinessRecord, type Phase14EntryAuthorizationRecord, type Phase14EntryCommitRecord, type PhaseState } from './policyPhaseTransitionTypes.js';
export interface Phase14EntryCommitParams {
    readonly exitCommit: PhaseExitCommitRecord;
    readonly entryReadiness: Phase14EntryReadinessRecord;
    readonly entryAuthorization: Phase14EntryAuthorizationRecord;
    readonly currentPhase: PhaseState;
    readonly committedBy: string;
}
export declare class PolicyPhase14EntryTransitionEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Commits the entry into Phase 1.4.
     * Strictly requires Phase 1.3 exit commit and separate Phase 1.4 human authorization.
     */
    commitPhase14Entry(params: Phase14EntryCommitParams): Phase14EntryCommitRecord;
}
