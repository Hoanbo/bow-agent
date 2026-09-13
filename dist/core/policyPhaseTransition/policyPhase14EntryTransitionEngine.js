// src/core/policyPhaseTransition/policyPhase14EntryTransitionEngine.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Phase 1.4 Entry Transition Engine (Component 878).
// Atomically commits Phase 1.4 entry upon separate, valid human authorization.
//
// Core Authority Invariants:
// - DIRECT PHASE 1.3 -> PHASE 1.4 JUMP = FORBIDDEN
// - AUTONOMOUS_PHASE_1_4_ENTRY = FORBIDDEN
// - ZERO POLICY MUTATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import * as crypto from 'crypto';
import { createPhase14EntryCommitId, } from './policyPhaseTransitionTypes.js';
export class PolicyPhase14EntryTransitionEngine {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Phase 1.4 transition engine suspended by USER_STOP supremacy');
        }
    }
    /**
     * Commits the entry into Phase 1.4.
     * Strictly requires Phase 1.3 exit commit and separate Phase 1.4 human authorization.
     */
    commitPhase14Entry(params) {
        this.assertUserStopInactive();
        if (!params || !params.exitCommit || !params.entryReadiness || !params.entryAuthorization) {
            throw new Error('INVALID_COMMIT_PARAMS: Exit commit, entry readiness, and entry authorization are all required');
        }
        const { exitCommit, entryReadiness, entryAuthorization, currentPhase, committedBy } = params;
        // 1. Direct Phase 1.3 -> Phase 1.4 jump rejection
        if (currentPhase === 'PHASE_1_3_ACTIVE' || currentPhase === 'PHASE_1_3_EXIT_PENDING_REVIEW') {
            throw new Error(`DIRECT_JUMP_REJECTED: Cannot transition directly from '${currentPhase}' to Phase 1.4 without committed Phase 1.3 exit`);
        }
        // 2. Concurrency check: Current phase must be PHASE_1_3_EXIT_COMMITTED or PHASE_1_4_ENTRY_READY or PHASE_1_4_ENTRY_AUTHORIZED
        if (currentPhase !== 'PHASE_1_3_EXIT_COMMITTED' && currentPhase !== 'PHASE_1_4_ENTRY_READY' && currentPhase !== 'PHASE_1_4_ENTRY_AUTHORIZED') {
            throw new Error(`INVALID_PHASE_STATE: Cannot commit Phase 1.4 entry when current phase is '${currentPhase}'`);
        }
        // 3. Verify exit commit is committed
        if (exitCommit.committedPhase !== 'PHASE_1_3_EXIT_COMMITTED') {
            throw new Error(`UNCOMMITTED_EXIT: Expected Phase 1.3 exit to be 'PHASE_1_3_EXIT_COMMITTED', found '${exitCommit.committedPhase}'`);
        }
        // 4. Verify binding linkage
        if (entryReadiness.exitCommitId !== exitCommit.commitId) {
            throw new Error(`LINKAGE_MISMATCH: Entry readiness exitCommitId '${entryReadiness.exitCommitId}' does not match exit commit '${exitCommit.commitId}'`);
        }
        if (entryAuthorization.readinessId !== entryReadiness.readinessId) {
            throw new Error(`LINKAGE_MISMATCH: Entry authorization readinessId '${entryAuthorization.readinessId}' does not match readiness '${entryReadiness.readinessId}'`);
        }
        // 5. Verify authorization decision
        if (entryAuthorization.decision !== 'AUTHORIZED') {
            throw new Error(`AUTHORIZATION_DENIED: Cannot commit Phase 1.4 entry with authorization decision '${entryAuthorization.decision}'`);
        }
        // 6. Verify committedBy actor
        if (!committedBy || typeof committedBy !== 'string' || committedBy.trim().length === 0) {
            throw new Error('INVALID_COMMITTER: committedBy must be a non-empty string');
        }
        const commitId = createPhase14EntryCommitId(`commit_14_${exitCommit.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
        const committedAt = new Date().toISOString();
        const commitPayload = {
            commitId,
            tenantId: exitCommit.tenantId,
            exitCommitId: exitCommit.commitId,
            entryReadinessId: entryReadiness.readinessId,
            authorizationId: entryAuthorization.authorizationId,
            previousPhase: currentPhase,
            committedPhase: 'PHASE_1_4_ENTRY_COMMITTED',
            committedAt,
            committedBy: committedBy.trim(),
        };
        const provenanceHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(commitPayload))
            .digest('hex');
        return Object.freeze({
            commitId,
            tenantId: exitCommit.tenantId,
            exitCommitId: exitCommit.commitId,
            entryReadinessId: entryReadiness.readinessId,
            authorizationId: entryAuthorization.authorizationId,
            previousPhase: currentPhase,
            committedPhase: 'PHASE_1_4_ENTRY_COMMITTED',
            committedAt,
            committedBy: committedBy.trim(),
            provenanceHash,
        });
    }
}
