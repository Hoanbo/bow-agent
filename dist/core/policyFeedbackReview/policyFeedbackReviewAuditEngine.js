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
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class PolicyFeedbackReviewAuditEngine {
    static CANONICAL_DOMAIN = 'POLICY_FEEDBACK_REVIEW';
    auditLedger;
    sanitizer;
    constructor(options) {
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * Records a sanitized review audit event into the append-only ledger.
     */
    recordEvent(record) {
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
            domain: PolicyFeedbackReviewAuditEngine.CANONICAL_DOMAIN,
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
