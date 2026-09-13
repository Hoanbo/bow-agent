import { type PhaseExitCandidate, type PhaseExitAuthorizationRecord, type PhaseExitCommitRecord, type PhaseState } from './policyPhaseTransitionTypes.js';
export interface PhaseExitCommitParams {
    readonly candidate: PhaseExitCandidate;
    readonly authorization: PhaseExitAuthorizationRecord;
    readonly currentPhase: PhaseState;
    readonly committedBy: string;
}
export declare class PolicyPhaseExitTransitionEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Commits the exit of Phase 1.3.
     * Strictly requires human authorization and valid current phase.
     * Does NOT transition into Phase 1.4.
     */
    commitPhaseExit(params: PhaseExitCommitParams): PhaseExitCommitRecord;
}
