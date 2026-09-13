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
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class PolicyCandidateAuthorizationAuditEngine {
    static CANONICAL_DOMAIN = 'POLICY_CANDIDATE_AUTHORIZATION';
    auditLedger;
    sanitizer;
    constructor(options) {
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * Records a sanitized authorization audit event into the append-only ledger.
     */
    recordEvent(record) {
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
            domain: PolicyCandidateAuthorizationAuditEngine.CANONICAL_DOMAIN,
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
