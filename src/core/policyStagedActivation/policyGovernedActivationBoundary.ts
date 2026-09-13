// src/core/policyStagedActivation/policyGovernedActivationBoundary.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Governed Activation Boundary (Component 790).
// Non-bypassable governance boundary between STAGED policies and ACTIVE_POLICY.
// Enforces:
// 1. Mandatory legitimate human operator identity clearance.
// 2. Strict rejection of autonomous, robotic, synthetic, scheduler, or daemon personas.
// 3. Preflight status MUST strictly be 'READY' (UNKNOWN is fail-closed rejected).
// 4. Strict anti-self-approval (proposer cannot grant activation clearance).
// 5. USER_STOP supremacy over all activation clearance decisions.
//
// Authority Invariants:
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - NO AUTONOMOUS ACTIVATION: System cannot self-activate
// - UNKNOWN != READY: Inconclusive preflight cannot authorize activation
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import path from 'node:path';
import type {
  HumanAuthorizationRole,
} from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type {
  StagedPolicy,
  ActivationPreflightResult,
  GovernedActivationAuthorization,
  PolicyStagedActivationOptions,
} from './policyStagedActivationTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

const AUTONOMOUS_OPERATOR_PATTERNS = [
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

const AUTHORIZED_ACTIVATION_ROLES = new Set<HumanAuthorizationRole>([
  'MASTER_HUMAN_OPERATOR',
  'HUMAN_SECURITY_ADMIN',
  'OWNER',
]);

export class PolicyGovernedActivationBoundary {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyStagedActivationOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Governed activation boundary evaluation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('BOUNDARY_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Asserts that an operator identity represents a verified human and not an autonomous actor.
   */
  public assertHumanOperator(operatorId: string): void {
    const trimmed = (operatorId ?? '').trim();
    if (!trimmed) {
      throw new Error('MISSING_OPERATOR_ID: Operator identifier must be a non-empty string');
    }

    if (ANONYMOUS_OR_GUEST_IDENTITIES.has(trimmed.toLowerCase())) {
      throw new Error(`UNAUTHORIZED_OPERATOR_IDENTITY: Identity '${trimmed}' is anonymous or guest`);
    }

    for (const pattern of AUTONOMOUS_OPERATOR_PATTERNS) {
      if (pattern.test(trimmed)) {
        throw new Error(`AUTONOMOUS_ACTIVATION_BLOCKED: Autonomous persona '${trimmed}' cannot grant policy activation clearance. Explicit human authority is mandatory.`);
      }
    }
  }

  /**
   * Asserts that the operator holds an authorized governance role.
   */
  public assertAuthorizedRole(role: string): asserts role is HumanAuthorizationRole {
    if (!role || !AUTHORIZED_ACTIVATION_ROLES.has(role as HumanAuthorizationRole)) {
      throw new Error(`UNAUTHORIZED_ACTIVATION_ROLE: Role '${role}' is not authorized to grant activation. Required: ${Array.from(AUTHORIZED_ACTIVATION_ROLES).join(', ')}`);
    }
  }

  /**
   * Evaluates and grants governed activation clearance for a staged policy.
   */
  public authorizeActivation(params: {
    readonly stagedPolicy: StagedPolicy;
    readonly preflight: ActivationPreflightResult;
    readonly operatorId: string;
    readonly operatorRole: HumanAuthorizationRole;
    readonly governanceRationale: string;
    readonly candidateProposer?: string;
  }): GovernedActivationAuthorization {
    this.assertUserStopInactive();
    this.validateTenant(params.stagedPolicy.tenantPartition);

    // 1. Operator persona check
    this.assertHumanOperator(params.operatorId);

    // 2. Role check
    this.assertAuthorizedRole(params.operatorRole);

    // 3. Anti-self-approval: Proposer cannot authorize own activation
    if (params.candidateProposer) {
      const normOp = params.operatorId.trim().toLowerCase();
      const normProp = params.candidateProposer.trim().toLowerCase();
      if (normOp === normProp) {
        throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Candidate proposer '${params.candidateProposer}' cannot grant activation clearance for their own candidate`);
      }
    }

    // 4. Non-empty justification
    if (!params.governanceRationale || params.governanceRationale.trim().length === 0) {
      throw new Error('MISSING_GOVERNANCE_RATIONALE: Governed activation clearance requires an explicit non-empty justification');
    }

    // 5. Preflight status check: MUST be 'READY'
    if (params.preflight.status !== 'READY') {
      throw new Error(`ACTIVATION_PREFLIGHT_NOT_READY: Activation clearance refused because preflight status is '${params.preflight.status}': ${params.preflight.blockingReasons.join('; ')}`);
    }

    // 6. Linkage check
    if (params.preflight.stagedActivationId !== params.stagedPolicy.stagedActivationId) {
      throw new Error(`PREFLIGHT_LINKAGE_MISMATCH: Preflight stagedActivationId '${params.preflight.stagedActivationId}' does not match staged policy '${params.stagedPolicy.stagedActivationId}'`);
    }

    const now = new Date().toISOString();
    const rawAuthHash = crypto.createHash('sha256')
      .update(`${params.stagedPolicy.stagedActivationId}:${params.operatorId}:${params.operatorRole}:${now}`)
      .digest('hex');
    const authorizationId = `actauth_${rawAuthHash.substring(0, 16)}`;

    const provenanceHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        authorizationId,
        stagedActivationId: params.stagedPolicy.stagedActivationId,
        candidateDraftId: params.stagedPolicy.candidateDraftId,
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        preflightId: params.preflight.preflightId,
        previousHash: params.stagedPolicy.provenanceHeadHash,
      }))
      .digest('hex');

    const result: GovernedActivationAuthorization = Object.freeze({
      authorizationId,
      stagedActivationId: params.stagedPolicy.stagedActivationId,
      candidateDraftId: params.stagedPolicy.candidateDraftId,
      tenantPartition: params.stagedPolicy.tenantPartition,
      authorizedBy: params.operatorId,
      authorizedRole: params.operatorRole,
      governanceRationale: params.governanceRationale,
      preflightId: params.preflight.preflightId,
      authorizedAt: now,
      provenanceHash,
    });

    return result;
  }
}
