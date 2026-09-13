// src/core/policyCandidateAuthorization/policyHumanAuthorizationGate.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Governed Policy Human Authorization Gate (Component 778).
// Establishes the non-bypassable Human Authorization Boundary.
// Enforces:
// 1. Mandatory legitimate human identity verification.
// 2. Strict rejection of autonomous, robotic, synthetic, scheduler, or daemon personas.
// 3. Mandatory human role authorization (MASTER_HUMAN_OPERATOR, HUMAN_SECURITY_ADMIN, OWNER).
// 4. Strict anti-self-approval (proposer / candidate author cannot authorize own candidate).
// 5. USER_STOP supremacy over all authorization gate checks.
//
// Authority Invariants:
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - ANTI_SELF_APPROVAL: Reviewer cannot be the proposal author or candidate creator
// - ZERO_AUTONOMOUS_AUTHORIZATION: System cannot self-authorize
// - USER_STOP > EVERYTHING

import path from 'node:path';
import type {
  CandidateAuthorizationRequest,
  HumanAuthorizationRole,
  PolicyCandidateAuthorizationOptions,
} from './policyCandidateAuthorizationTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

const AUTONOMOUS_REVIEWER_PATTERNS = [
  /^auto_/i,
  /^bot_/i,
  /^ai_agent/i,
  /^ai_/i,
  /^autonomous/i,
  /^synthetic_/i,
  /^system_daemon/i,
  /^system/i,
  /^agent_/i,
  /^daemon/i,
  /^cron_/i,
  /^scheduler/i,
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

export class PolicyHumanAuthorizationGate {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyCandidateAuthorizationOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Human authorization gate suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('GATE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Asserts that a reviewer identity represents an authentic human and not an autonomous persona.
   */
  public assertHumanIdentity(reviewerId: string): void {
    const trimmed = (reviewerId ?? '').trim();
    if (!trimmed) {
      throw new Error('MISSING_REVIEWER_ID: Reviewer identifier must be a non-empty string');
    }

    if (ANONYMOUS_OR_GUEST_IDENTITIES.has(trimmed.toLowerCase())) {
      throw new Error(`UNAUTHORIZED_REVIEWER_IDENTITY: Identity '${trimmed}' is anonymous or unauthenticated`);
    }

    for (const pattern of AUTONOMOUS_REVIEWER_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new Error(`AUTONOMOUS_REVIEWER_BLOCKED: Autonomous persona '${trimmed}' cannot grant human authorization. Explicit human authorization is mandatory.`);
      }
    }
  }

  /**
   * Asserts that the reviewer holds an authorized governance role.
   */
  public assertAuthorizedRole(role: string): asserts role is HumanAuthorizationRole {
    if (!role || !AUTHORIZED_HUMAN_ROLES.has(role as HumanAuthorizationRole)) {
      throw new Error(`UNAUTHORIZED_GOVERNANCE_ROLE: Role '${role}' is not authorized to grant candidate authorization. Required one of: ${Array.from(AUTHORIZED_HUMAN_ROLES).join(', ')}`);
    }
  }

  /**
   * Validates a human reviewer against a candidate authorization request.
   * Enforces role authority, persona legitimacy, and anti-self-approval.
   */
  public validateReviewer(
    request: CandidateAuthorizationRequest,
    reviewerId: string,
    reviewerRole: string
  ): void {
    this.assertUserStopInactive();
    this.validateTenant(request.tenantPartition);

    // 1. Assert human identity
    this.assertHumanIdentity(reviewerId);

    // 2. Assert role
    this.assertAuthorizedRole(reviewerRole);

    // 3. Enforce required role matching
    if (request.requiredRole && reviewerRole !== request.requiredRole && reviewerRole !== 'OWNER') {
      throw new Error(`INSUFFICIENT_ROLE_AUTHORITY: Request requires role '${request.requiredRole}', but reviewer has '${reviewerRole}'`);
    }

    // 4. Anti-self-approval: Proposer / request submitter cannot authorize
    const normalizedReviewer = reviewerId.trim().toLowerCase();
    const normalizedProposer = (request.requestedBy ?? '').trim().toLowerCase();
    if (normalizedReviewer === normalizedProposer) {
      throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Proposer '${request.requestedBy}' cannot approve or authorize their own candidate request '${request.requestId}'`);
    }

    // 5. Anti-self-approval: Intake author cannot self-approve if known
    const draft = request.candidateDraft;
    if (draft && (draft as any).createdBy) {
      const creator = String((draft as any).createdBy).trim().toLowerCase();
      if (normalizedReviewer === creator) {
        throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Candidate creator '${(draft as any).createdBy}' cannot approve their own candidate draft '${draft.candidateDraftId}'`);
      }
    }
  }
}
