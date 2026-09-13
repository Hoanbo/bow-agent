// src/core/policyPhaseTransition/policyPhaseExitTransitionEngine.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Phase Exit Transition Engine (Component 875).
// Atomically commits Phase 1.3 exit upon valid human authorization.
//
// Core Authority Invariants:
// - PHASE_EXIT_COMMIT != PHASE_1_4_ENTRY
// - AUTONOMOUS_PHASE_EXIT = FORBIDDEN
// - ZERO POLICY MUTATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import * as crypto from 'crypto';
import {
  type PhaseExitCandidate,
  type PhaseExitAuthorizationRecord,
  type PhaseExitCommitRecord,
  type PhaseState,
  createPhaseExitCommitId,
} from './policyPhaseTransitionTypes.js';

export interface PhaseExitCommitParams {
  readonly candidate: PhaseExitCandidate;
  readonly authorization: PhaseExitAuthorizationRecord;
  readonly currentPhase: PhaseState;
  readonly committedBy: string;
}

export class PolicyPhaseExitTransitionEngine {
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Exit transition engine suspended by USER_STOP supremacy');
    }
  }

  /**
   * Commits the exit of Phase 1.3.
   * Strictly requires human authorization and valid current phase.
   * Does NOT transition into Phase 1.4.
   */
  public commitPhaseExit(params: PhaseExitCommitParams): PhaseExitCommitRecord {
    this.assertUserStopInactive();

    if (!params || !params.candidate || !params.authorization) {
      throw new Error('INVALID_COMMIT_PARAMS: Candidate and authorization records are required');
    }

    const { candidate, authorization, currentPhase, committedBy } = params;

    // 1. Verify candidate and authorization match
    if (candidate.candidateId !== authorization.candidateId) {
      throw new Error(`BINDING_MISMATCH: Candidate ID '${candidate.candidateId}' does not match authorization '${authorization.candidateId}'`);
    }

    // 2. Verify authorization decision is positive
    if (authorization.decision !== 'AUTHORIZED') {
      throw new Error(`AUTHORIZATION_DENIED: Cannot commit phase exit with authorization decision '${authorization.decision}'`);
    }

    // 3. Concurrency / State Validation: Current phase must be Phase 1.3
    if (currentPhase !== 'PHASE_1_3_ACTIVE' && currentPhase !== 'PHASE_1_3_EXIT_PENDING_REVIEW' && currentPhase !== 'PHASE_1_3_EXIT_AUTHORIZED') {
      throw new Error(`INVALID_PHASE_STATE: Cannot commit Phase 1.3 exit when current phase is '${currentPhase}'`);
    }

    // 4. CommittedBy actor must be specified
    if (!committedBy || typeof committedBy !== 'string' || committedBy.trim().length === 0) {
      throw new Error('INVALID_COMMITTER: committedBy must be a non-empty string');
    }

    const commitId = createPhaseExitCommitId(
      `commit_exit_${candidate.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    );

    const committedAt = new Date().toISOString();

    const commitPayload = {
      commitId,
      tenantId: candidate.tenantId,
      candidateId: candidate.candidateId,
      authorizationId: authorization.authorizationId,
      previousPhase: currentPhase,
      committedPhase: 'PHASE_1_3_EXIT_COMMITTED',
      committedAt,
      committedBy: committedBy.trim(),
    };

    const provenanceHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(commitPayload))
      .digest('hex');

    return Object.freeze({
      commitId,
      tenantId: candidate.tenantId,
      candidateId: candidate.candidateId,
      authorizationId: authorization.authorizationId,
      previousPhase: currentPhase,
      committedPhase: 'PHASE_1_3_EXIT_COMMITTED',
      committedAt,
      committedBy: committedBy.trim(),
      provenanceHash,
    });
  }
}
