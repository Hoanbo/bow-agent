// src/core/policyFeedbackReview/policyFeedbackReviewAuditEngine.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Governed Policy Feedback Review Audit Engine (Component 763).
// Records review lifecycle, revalidation, queuing, human decisions, and intake creation events
// into the append-only AuditLedger under the POLICY_FEEDBACK_REVIEW domain.
// Redacts sensitive payloads using DiagnosisSanitizer.
//
// Authority Invariants:
// - CANONICAL_DOMAIN: POLICY_FEEDBACK_REVIEW
// - ZERO_SECRET_LEAKAGE: All credentials, keys, and tokens deeply redacted
// - REUSES_GLOBAL_AUDIT_LEDGER: Zero parallel unverified ledgers

import crypto from 'node:crypto';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export type PolicyFeedbackReviewAuditEventType =
  | 'FEEDBACK_REVIEW_RECEIVED'
  | 'FEEDBACK_REVALIDATION_STARTED'
  | 'FEEDBACK_REVALIDATION_PASSED'
  | 'FEEDBACK_REVALIDATION_FAILED'
  | 'FEEDBACK_REVIEW_QUEUED'
  | 'FEEDBACK_REVIEW_DEFERRED'
  | 'FEEDBACK_REVIEW_ACCEPTED'
  | 'FEEDBACK_REVIEW_REJECTED'
  | 'FEEDBACK_REVIEW_CANCELLED'
  | 'FEEDBACK_REVIEW_EXPIRED'
  | 'FEEDBACK_REVIEW_SUPERSEDED'
  | 'FEEDBACK_REVIEW_USER_STOP_BLOCKED'
  | 'FEEDBACK_REVIEW_TENANT_BLOCKED'
  | 'FEEDBACK_EVOLUTION_INTAKE_CREATED'
  | 'FEEDBACK_EVOLUTION_INTAKE_BLOCKED'
  | 'FEEDBACK_REVIEW_REPLAY_BLOCKED'
  | 'FEEDBACK_REVIEW_INTEGRITY_FAILURE';

export interface PolicyFeedbackReviewAuditRecord {
  readonly eventType: PolicyFeedbackReviewAuditEventType;
  readonly tenantPartition: string;
  readonly reviewId?: string;
  readonly proposalId?: string;
  readonly intakeId?: string;
  readonly reviewerId?: string;
  readonly status?: string;
  readonly reason?: string;
  readonly details?: Record<string, any>;
}

export interface PolicyFeedbackReviewAuditEngineOptions {
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class PolicyFeedbackReviewAuditEngine {
  public static readonly CANONICAL_DOMAIN = 'POLICY_FEEDBACK_REVIEW';

  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;

  constructor(options?: PolicyFeedbackReviewAuditEngineOptions) {
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  /**
   * Records a sanitized review audit event into the append-only ledger.
   */
  public recordEvent(record: PolicyFeedbackReviewAuditRecord): void {
    const timestamp = new Date().toISOString();

    const rawPayload = {
      reviewId: record.reviewId,
      proposalId: record.proposalId,
      intakeId: record.intakeId,
      reviewerId: record.reviewerId,
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
        userId: record.reviewerId ?? 'system_feedback_review_governance',
        role: 'governance_review',
        channel: 'policy_feedback_review_boundary',
      },
      domain: PolicyFeedbackReviewAuditEngine.CANONICAL_DOMAIN as any,
      toolName: `policy_feedback_review_${record.eventType.toLowerCase()}`,
      classification: 'HIGH_IMPACT',
      policyDecision: record.eventType.includes('BLOCKED') || record.eventType.includes('FAILURE') || record.eventType.includes('REJECTED') ? 'DENY' : 'PERMIT',
      executionStatus: record.eventType.includes('BLOCKED') || record.eventType.includes('FAILURE')
        ? 'BLOCKED'
        : 'SUCCESS',
      argumentsHash,
      approvalId: record.reviewId ?? record.proposalId,
    });
  }
}

export const globalPolicyFeedbackReviewAuditEngine = new PolicyFeedbackReviewAuditEngine();
