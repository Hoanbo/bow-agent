// src/core/policyPhaseTransition/policyPhaseExitAuthorizationBoundary.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Phase Exit Authorization Boundary (Component 874).
// Establishes the non-bypassable Human Authorization Boundary for Phase 1.3 Exit.
// Enforces:
// 1. Mandatory legitimate human identity verification.
// 2. Strict rejection of autonomous, robotic, synthetic, scheduler, or daemon personas.
// 3. Mandatory human role authorization (MASTER_HUMAN_OPERATOR, HUMAN_SECURITY_ADMIN, OWNER).
// 4. Strict anti-self-approval (proposer / candidate author cannot authorize own candidate).
// 5. Anti-replay and deterministic fingerprinting.
// 6. USER_STOP supremacy over all authorization operations.
//
// Authority Invariants:
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - ANTI_SELF_APPROVAL: Reviewer cannot be the proposal author or candidate creator
// - ZERO_AUTONOMOUS_AUTHORIZATION: System cannot self-authorize
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import * as crypto from 'crypto';
import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import {
  type PhaseExitCandidate,
  type PhaseExitAuthorizationRequest,
  type PhaseExitAuthorizationRecord,
  createPhaseExitAuthorizationId,
} from './policyPhaseTransitionTypes.js';

const AUTONOMOUS_ACTOR_PATTERNS = [
  /^auto_/i,
  /^bot_/i,
  /^ai_agent/i,
  /^ai_/i,
  /^autonomous/i,
  /^synthetic_/i,
  /^system_daemon/i,
  /^system_auto/i,
  /^system/i,
  /^agent_/i,
  /^daemon/i,
  /^cron_/i,
  /^scheduler/i,
  /^service_/i,
  /^runtime/i,
];

const ANONYMOUS_OR_GUEST_IDENTITIES = new Set([
  'anonymous',
  'anon',
  'guest',
  'public',
  'default',
  'unknown',
  'null',
  'undefined',
]);

const AUTHORIZED_HUMAN_ROLES = new Set<HumanAuthorizationRole>([
  'MASTER_HUMAN_OPERATOR',
  'HUMAN_SECURITY_ADMIN',
  'OWNER',
]);

export class PolicyPhaseExitAuthorizationBoundary {
  private readonly consumedFingerprints = new Set<string>();
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: { readonly isUserStopActive?: () => boolean }) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Exit authorization gate suspended by USER_STOP supremacy');
    }
  }

  /**
   * Evaluates human authorization for a PhaseExitCandidate.
   */
  public authorizePhaseExit(
    candidate: PhaseExitCandidate,
    request: PhaseExitAuthorizationRequest
  ): PhaseExitAuthorizationRecord {
    this.assertUserStopInactive();

    if (!candidate || !candidate.candidateId) {
      throw new Error('INVALID_CANDIDATE: Phase exit candidate is required');
    }

    if (!request || !request.candidateId) {
      throw new Error('INVALID_REQUEST: Phase exit authorization request is required');
    }

    // 1. Cross-candidate binding check
    if (candidate.candidateId !== request.candidateId) {
      throw new Error(`BINDING_MISMATCH: Candidate ID '${candidate.candidateId}' does not match request '${request.candidateId}'`);
    }

    // 2. Cross-tenant isolation check
    if (candidate.tenantId !== request.tenantId) {
      throw new Error(`CROSS_TENANT_ACCESS_REJECTED: Candidate tenant '${candidate.tenantId}' does not match request tenant '${request.tenantId}'`);
    }

    const authorizedBy = (request.authorizedBy ?? '').trim();
    if (authorizedBy.length === 0) {
      throw new Error('AUTHORIZATION_SECURITY_VIOLATION: authorizedBy operatorId must be a non-empty string');
    }

    // 3. Reject anonymous and guest actors
    if (ANONYMOUS_OR_GUEST_IDENTITIES.has(authorizedBy.toLowerCase())) {
      throw new Error(`ANONYMOUS_AUTHORIZATION_REJECTED: Persona '${authorizedBy}' is not permitted to authorize phase transitions`);
    }

    // 4. Reject autonomous actors
    for (const pattern of AUTONOMOUS_ACTOR_PATTERNS) {
      if (pattern.test(authorizedBy)) {
        throw new Error(`AUTONOMOUS_AUTHORIZATION_REJECTED: Autonomous actor pattern '${authorizedBy}' is strictly forbidden from authorizing phase transitions`);
      }
    }

    // 5. Verify legitimate human role
    if (!AUTHORIZED_HUMAN_ROLES.has(request.operatorRole)) {
      throw new Error(`UNAUTHORIZED_ROLE: Role '${request.operatorRole}' is not an authorized human governance role`);
    }

    // 6. Anti-Self-Approval
    const proposer = candidate.proposedBy.trim();
    const requester = (request.requestedBy ?? '').trim();

    if (authorizedBy.toLowerCase() === proposer.toLowerCase()) {
      throw new Error(`SELF_APPROVAL_VIOLATION: Operator '${authorizedBy}' proposed candidate '${candidate.candidateId}' and cannot approve it`);
    }
    if (requester.length > 0 && authorizedBy.toLowerCase() === requester.toLowerCase()) {
      throw new Error(`SELF_APPROVAL_VIOLATION: Operator '${authorizedBy}' initiated authorization request and cannot approve it`);
    }

    // 7. Mandatory substantive rationale
    const rationale = (request.rationale ?? '').trim();
    if (rationale.length < 10) {
      throw new Error('INVALID_RATIONALE: Substantive authorization rationale of at least 10 characters is required');
    }

    // 8. Fingerprint and anti-replay verification
    const fingerprintPayload = `${request.tenantId}:${candidate.candidateId}:${authorizedBy}:${request.operatorRole}:${request.decision}`;
    const fingerprint = crypto.createHash('sha256').update(fingerprintPayload).digest('hex');

    if (this.consumedFingerprints.has(fingerprint)) {
      throw new Error(`REPLAY_REJECTED: Authorization for candidate '${candidate.candidateId}' with decision '${request.decision}' has already been processed`);
    }

    this.consumedFingerprints.add(fingerprint);

    const authorizationId = createPhaseExitAuthorizationId(
      `auth_exit_${request.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    );

    const authorizedAt = request.timestamp ?? new Date().toISOString();

    return Object.freeze({
      authorizationId,
      candidateId: candidate.candidateId,
      tenantId: request.tenantId,
      requestedBy: requester || proposer,
      authorizedBy,
      operatorRole: request.operatorRole,
      rationale,
      decision: request.decision === 'AUTHORIZE' ? 'AUTHORIZED' : 'REJECTED',
      authorizedAt,
      fingerprint,
    });
  }
}
