import { type PhaseExitCandidate, type PhaseExitAuthorizationRequest, type PhaseExitAuthorizationRecord } from './policyPhaseTransitionTypes.js';
export declare class PolicyPhaseExitAuthorizationBoundary {
    private readonly consumedFingerprints;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Evaluates human authorization for a PhaseExitCandidate.
     */
    authorizePhaseExit(candidate: PhaseExitCandidate, request: PhaseExitAuthorizationRequest): PhaseExitAuthorizationRecord;
}
