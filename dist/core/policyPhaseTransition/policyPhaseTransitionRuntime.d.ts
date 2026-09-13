import type { ReadinessAssessmentReport } from '../policyGovernanceReadiness/policyGovernanceReadinessTypes.js';
import { type PhaseState, type PhaseExitCandidate, type PhaseExitReviewPackage, type PhaseExitAuthorizationRequest, type PhaseExitAuthorizationRecord, type PhaseExitCommitRecord, type Phase14EntryReadinessRecord, type Phase14EntryAuthorizationRequest, type Phase14EntryAuthorizationRecord, type Phase14EntryCommitRecord } from './policyPhaseTransitionTypes.js';
export declare class PolicyPhaseTransitionRuntime {
    private readonly reviewEngine;
    private readonly exitAuthBoundary;
    private readonly exitTransitionEngine;
    private readonly entryReadinessEngine;
    private readonly entryAuthBoundary;
    private readonly entryTransitionEngine;
    private readonly store;
    private readonly provenanceEngine;
    private readonly auditEngine;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly baseDir?: string;
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Returns the current phase for a given tenant.
     */
    getCurrentPhase(tenantId: string): PhaseState;
    /**
     * 1. Generates a PhaseExitCandidate and ReviewPackage from verified MS-1.3.76 evidence.
     * Strictly non-mutating; does NOT alter current phase state or authorize exit.
     */
    generatePhaseExitCandidate(params: {
        readonly report: ReadinessAssessmentReport;
        readonly proposedBy: string;
    }): {
        readonly candidate: PhaseExitCandidate;
        readonly reviewPackage: PhaseExitReviewPackage;
    };
    /**
     * 2. Authorizes Phase 1.3 Exit through the non-bypassable human authorization boundary.
     */
    authorizePhaseExit(params: {
        readonly candidate: PhaseExitCandidate;
        readonly request: PhaseExitAuthorizationRequest;
    }): PhaseExitAuthorizationRecord;
    /**
     * 3. Atomically commits Phase 1.3 exit.
     * Strictly requires Phase 1.3 human authorization.
     * Does NOT automatically transition into Phase 1.4.
     */
    commitPhaseExit(params: {
        readonly candidate: PhaseExitCandidate;
        readonly authorization: PhaseExitAuthorizationRecord;
        readonly committedBy: string;
    }): PhaseExitCommitRecord;
    /**
     * 4. Evaluates whether Phase 1.4 entry prerequisites are satisfied.
     * Advisory only; creates ZERO entry transitions.
     */
    evaluatePhase14EntryReadiness(params: {
        readonly exitCommit: PhaseExitCommitRecord;
        readonly tenantId: string;
    }): Phase14EntryReadinessRecord;
    /**
     * 5. Authorizes Phase 1.4 entry through separate, non-bypassable human authorization boundary.
     */
    authorizePhase14Entry(params: {
        readonly readiness: Phase14EntryReadinessRecord;
        readonly request: Phase14EntryAuthorizationRequest;
    }): Phase14EntryAuthorizationRecord;
    /**
     * 6. Atomically commits Phase 1.4 entry.
     * Requires Phase 1.3 exit commit and separate Phase 1.4 human authorization.
     */
    commitPhase14Entry(params: {
        readonly exitCommit: PhaseExitCommitRecord;
        readonly entryReadiness: Phase14EntryReadinessRecord;
        readonly entryAuthorization: Phase14EntryAuthorizationRecord;
        readonly committedBy: string;
    }): Phase14EntryCommitRecord;
}
