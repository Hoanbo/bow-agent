// src/core/policyCandidateAuthorization/policyCandidateAuthorizationAuditEngine.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Governed Candidate Authorization Audit Engine (Component 783).
// Records all candidate authorization and activation readiness lifecycle events
// into the append-only AuditLedger under domain POLICY_CANDIDATE_AUTHORIZATION.
// Redacts sensitive payloads using DiagnosisSanitizer.
//
// Authority Invariants:
// - CANONICAL_DOMAIN: POLICY_CANDIDATE_AUTHORIZATION
// - ZERO_SECRET_LEAKAGE: Sensitive credentials deeply redacted
// - REUSES_GLOBAL_AUDIT_LEDGER: Zero parallel unverified ledgers
// - USER_STOP > EVERYTHING

import crypto from 'node:crypto';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export type PolicyCandidateAuthorizationAuditEventType =
  | 'CANDIDATE_AUTHORIZATION_REQUESTED'
  | 'CANDIDATE_AUTHORIZATION_REVALIDATED'
  | 'HUMAN_AUTHORIZATION_REQUIRED'
  | 'CANDIDATE_AUTHORIZED'
  | 'CANDIDATE_REJECTED'
  | 'CANDIDATE_DEFERRED'
  | 'CANDIDATE_MORE_EVIDENCE_REQUESTED'
  | 'CANDIDATE_CANCELLED'
  | 'ACTIVATION_READINESS_CONFIRMED'
  | 'ACTIVATION_READINESS_BLOCKED'
  | 'AUTONOMOUS_AUTHORIZATION_BLOCKED'
  | 'SELF_APPROVAL_BLOCKED'
  | 'TENANT_ISOLATION_BLOCKED'
  | 'USER_STOP_BLOCKED'
  | 'PROVENANCE_TAMPER_BLOCKED'
  | 'EXPIRED_CANDIDATE_BLOCKED'
  | 'SUPERSEDED_CANDIDATE_BLOCKED';

export interface PolicyCandidateAuthorizationAuditRecord {
  readonly eventType: PolicyCandidateAuthorizationAuditEventType;
  readonly tenantPartition: string;
  readonly candidateDraftId?: string;
  readonly evolutionPlanId?: string;
  readonly authorizationRequestId?: string;
  readonly authorizationDecisionId?: string;
  readonly activationReadinessId?: string;
  readonly reviewerId?: string;
  readonly reviewerRole?: string;
  readonly decision?: string;
  readonly readinessState?: string;
  readonly status?: string;
  readonly reason?: string;
  readonly details?: Record<string, any>;
}

export interface PolicyCandidateAuthorizationAuditEngineOptions {
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class PolicyCandidateAuthorizationAuditEngine {
  public static readonly CANONICAL_DOMAIN = 'POLICY_CANDIDATE_AUTHORIZATION';

  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;

  constructor(options?: PolicyCandidateAuthorizationAuditEngineOptions) {
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  /**
   * Records a sanitized authorization audit event into the append-only ledger.
   */
  public recordEvent(record: PolicyCandidateAuthorizationAuditRecord): void {
    const timestamp = new Date().toISOString();

    const rawPayload = {
      tenantPartition: record.tenantPartition,
      candidateDraftId: record.candidateDraftId,
      evolutionPlanId: record.evolutionPlanId,
      authorizationRequestId: record.authorizationRequestId,
      authorizationDecisionId: record.authorizationDecisionId,
      activationReadinessId: record.activationReadinessId,
      reviewerId: record.reviewerId,
      reviewerRole: record.reviewerRole,
      decision: record.decision,
      readinessState: record.readinessState,
      status: record.status,
      reason: record.reason,
      details: record.details,
    };

    const sanitizedPayload = this.sanitizer.sanitize(rawPayload);
    const argumentsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(sanitizedPayload))
      .digest('hex');

    this.auditLedger.record({
      timestamp,
      actor: {
        userId: record.reviewerId ?? 'system_candidate_authorization_governance',
        role: record.reviewerRole ?? 'candidate_authorizer',
        channel: 'policy_candidate_authorization_boundary',
      },
      domain: PolicyCandidateAuthorizationAuditEngine.CANONICAL_DOMAIN as any,
      toolName: `policy_candidate_authorization_${record.eventType.toLowerCase()}`,
      classification: 'CRITICAL',
      policyDecision: record.eventType.includes('BLOCKED') || record.eventType.includes('REJECTED') ? 'DENY' : 'PERMIT',
      executionStatus: record.eventType.includes('BLOCKED') || record.eventType.includes('REJECTED')
        ? 'BLOCKED'
        : 'SUCCESS',
      argumentsHash,
      approvalId: record.authorizationDecisionId ?? record.authorizationRequestId,
    });
  }
}

export const globalPolicyCandidateAuthorizationAuditEngine = new PolicyCandidateAuthorizationAuditEngine();

