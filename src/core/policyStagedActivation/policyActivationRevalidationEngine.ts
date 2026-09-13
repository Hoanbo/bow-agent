// src/core/policyStagedActivation/policyActivationRevalidationEngine.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Governed Activation Revalidation Engine (Component 787).
// Independently revalidates candidate drafts, human authorization decisions, and activation readiness
// before staging or activation transitions.
//
// Authority Invariants:
// - LEVEL_0_ANALYSIS: Pure independent validation; zero active mutation
// - FAIL_CLOSED: Any missing, invalid, contradictory, or expired input fails closed
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - NEVER_REPAIR_INVALID_EVIDENCE: Bad inputs are never silently repaired
// - USER_STOP > EVERYTHING

import path from 'node:path';
import type {
  CandidateAuthorizationRequest,
  HumanAuthorizationDecision,
  ActivationReadinessDecision,
} from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';
import type {
  PolicyStagedActivationOptions,
} from './policyStagedActivationTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export const STAGED_ACTIVATION_HARD_FORBIDDEN = [
  'transfer_funds',
  'delete_database',
  'bypass_robot_interlocks',
  'execute_untrusted_host_script',
] as const;

export interface ActivationRevalidationResult {
  readonly valid: boolean;
  readonly status: 'VALID' | 'BLOCKED' | 'INVALID' | 'EXPIRED' | 'SUPERSEDED' | 'CONTRADICTORY';
  readonly tenantPartition: string;
  readonly candidateDraftId: string;
  readonly issues: readonly string[];
  readonly revalidatedAt: string;
}

export class PolicyActivationRevalidationEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PolicyStagedActivationOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Activation revalidation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('REVALIDATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Independently revalidates all prerequisites prior to policy staging or activation.
   */
  public revalidateForActivation(params: {
    readonly request: CandidateAuthorizationRequest;
    readonly decision: HumanAuthorizationDecision;
    readonly readiness: ActivationReadinessDecision;
  }): ActivationRevalidationResult {
    this.assertUserStopInactive();

    const { request, decision, readiness } = params;
    const issues: string[] = [];

    // 1. Basic payload checks
    if (!request || !decision || !readiness) {
      return Object.freeze({
        valid: false,
        status: 'INVALID',
        tenantPartition: request?.tenantPartition ?? 'UNKNOWN_TENANT',
        candidateDraftId: request?.candidateDraftId ?? 'UNKNOWN_DRAFT',
        issues: ['MISSING_INPUT_RECORD: request, decision, and readiness are all mandatory'],
        revalidatedAt: new Date().toISOString(),
      });
    }

    // 2. Strict tenant isolation
    try {
      this.validateTenant(request.tenantPartition);
    } catch (err: any) {
      return Object.freeze({
        valid: false,
        status: 'BLOCKED',
        tenantPartition: request.tenantPartition,
        candidateDraftId: request.candidateDraftId,
        issues: [`TENANT_ISOLATION_FAILURE: ${err.message}`],
        revalidatedAt: new Date().toISOString(),
      });
    }

    // 3. Tenant cross-match
    if (decision.tenantPartition !== request.tenantPartition) {
      issues.push(`TENANT_MISMATCH: Decision tenant '${decision.tenantPartition}' does not match request tenant '${request.tenantPartition}'`);
    }
    if (readiness.tenantPartition !== request.tenantPartition) {
      issues.push(`TENANT_MISMATCH: Readiness tenant '${readiness.tenantPartition}' does not match request tenant '${request.tenantPartition}'`);
    }

    // 4. Candidate linkage
    if (decision.candidateDraftId !== request.candidateDraftId) {
      issues.push(`CANDIDATE_LINKAGE_MISMATCH: Decision draft '${decision.candidateDraftId}' does not match request '${request.candidateDraftId}'`);
    }
    if (readiness.candidateDraftId !== request.candidateDraftId) {
      issues.push(`CANDIDATE_LINKAGE_MISMATCH: Readiness draft '${readiness.candidateDraftId}' does not match request '${request.candidateDraftId}'`);
    }

    // 5. Candidate validation status
    if (!request.candidateValidation || !request.candidateValidation.valid || request.candidateValidation.status !== 'VALID') {
      issues.push(`CANDIDATE_VALIDATION_NOT_VALID: Candidate status is '${request.candidateValidation?.status}'`);
    }

    // 6. Contradictory evidence
    if (request.candidateValidation?.valid && Array.isArray(request.candidateValidation.issues) && request.candidateValidation.issues.length > 0) {
      return Object.freeze({
        valid: false,
        status: 'CONTRADICTORY',
        tenantPartition: request.tenantPartition,
        candidateDraftId: request.candidateDraftId,
        issues: ['CONTRADICTORY_EVIDENCE: CandidateValidation claims valid=true but lists issues: ' + request.candidateValidation.issues.join('; ')],
        revalidatedAt: new Date().toISOString(),
      });
    }

    // 7. Human Authorization check
    if (decision.decision !== 'AUTHORIZE') {
      issues.push(`UNAUTHORIZED_CANDIDATE: Human decision is '${decision.decision}', requires 'AUTHORIZE'`);
    }

    // 8. Activation Readiness check
    if (readiness.state !== 'READY_FOR_ACTIVATION') {
      issues.push(`READINESS_NOT_CONFIRMED: Activation readiness state is '${readiness.state}', requires 'READY_FOR_ACTIVATION'`);
    }

    // 9. Candidate TTL Freshness
    if (request.expiresAt) {
      const expires = Date.parse(request.expiresAt);
      if (Number.isNaN(expires) || Date.now() > expires) {
        return Object.freeze({
          valid: false,
          status: 'EXPIRED',
          tenantPartition: request.tenantPartition,
          candidateDraftId: request.candidateDraftId,
          issues: [`CANDIDATE_AUTHORIZATION_EXPIRED: Request expired at ${request.expiresAt}`],
          revalidatedAt: new Date().toISOString(),
        });
      }
    }

    // 10. Supersession check
    if (request.supersededBy && request.supersededBy.trim().length > 0) {
      return Object.freeze({
        valid: false,
        status: 'SUPERSEDED',
        tenantPartition: request.tenantPartition,
        candidateDraftId: request.candidateDraftId,
        issues: [`CANDIDATE_SUPERSEDED: Candidate draft superseded by '${request.supersededBy}'`],
        revalidatedAt: new Date().toISOString(),
      });
    }

    // 11. Hard-forbidden actions check
    const draft = request.candidateDraft;
    if (draft) {
      const serialized = JSON.stringify(draft.proposedChanges ?? {}) + ' ' + (draft.rationale ?? '');
      for (const forbidden of STAGED_ACTIVATION_HARD_FORBIDDEN) {
        if (serialized.toLowerCase().includes(forbidden.toLowerCase())) {
          return Object.freeze({
            valid: false,
            status: 'BLOCKED',
            tenantPartition: request.tenantPartition,
            candidateDraftId: request.candidateDraftId,
            issues: [`HARD_FORBIDDEN_ACTION_DETECTED: Staged candidate invokes forbidden action '${forbidden}'`],
            revalidatedAt: new Date().toISOString(),
          });
        }
      }
    }

    // 12. Non-mutation invariants on inputs
    if (draft && (draft.isActivePolicy !== false || draft.isPolicyMutation !== false || draft.isAutonomousMutation !== false)) {
      issues.push('INVARIANT_VIOLATION: Candidate draft must have isActivePolicy=false, isPolicyMutation=false, isAutonomousMutation=false');
    }
    if (decision.isActivePolicy !== false || decision.isPolicyMutation !== false) {
      issues.push('INVARIANT_VIOLATION: Human authorization decision must have isActivePolicy=false, isPolicyMutation=false');
    }
    if (readiness.isActivePolicy !== false || readiness.isActivated !== false) {
      issues.push('INVARIANT_VIOLATION: Activation readiness decision must have isActivePolicy=false, isActivated=false');
    }

    if (issues.length > 0) {
      return Object.freeze({
        valid: false,
        status: 'INVALID',
        tenantPartition: request.tenantPartition,
        candidateDraftId: request.candidateDraftId,
        issues: Object.freeze(issues),
        revalidatedAt: new Date().toISOString(),
      });
    }

    return Object.freeze({
      valid: true,
      status: 'VALID',
      tenantPartition: request.tenantPartition,
      candidateDraftId: request.candidateDraftId,
      issues: Object.freeze([]),
      revalidatedAt: new Date().toISOString(),
    });
  }
}
