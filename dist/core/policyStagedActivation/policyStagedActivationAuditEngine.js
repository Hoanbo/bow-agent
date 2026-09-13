// src/core/policyStagedActivation/policyStagedActivationAuditEngine.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Governed Staged Activation Audit Engine (Component 794).
// Records all staged activation and active state transition lifecycle events
// into the append-only AuditLedger under domain POLICY_STAGED_ACTIVATION.
// Redacts sensitive payloads using DiagnosisSanitizer.
//
// Authority Invariants:
// - CANONICAL_DOMAIN: POLICY_STAGED_ACTIVATION
// - ZERO_SECRET_LEAKAGE: Sensitive credentials deeply redacted
// - REUSES_GLOBAL_AUDIT_LEDGER: Zero parallel unverified ledgers
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class PolicyStagedActivationAuditEngine {
    static CANONICAL_DOMAIN = 'POLICY_STAGED_ACTIVATION';
    auditLedger;
    sanitizer;
    constructor(options) {
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * Records a sanitized activation audit event into the append-only ledger.
     */
    recordEvent(record) {
        const timestamp = new Date().toISOString();
        const rawPayload = {
            tenantPartition: record.tenantPartition,
            candidateDraftId: record.candidateDraftId,
            stagedActivationId: record.stagedActivationId,
            preflightId: record.preflightId,
            activationCommitId: record.activationCommitId,
            activePolicyStateId: record.activePolicyStateId,
            operatorId: record.operatorId,
            operatorRole: record.operatorRole,
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
                userId: record.operatorId ?? 'system_staged_activation_governance',
                role: record.operatorRole ?? 'activation_operator',
                channel: 'policy_staged_activation_boundary',
            },
            domain: PolicyStagedActivationAuditEngine.CANONICAL_DOMAIN,
            toolName: `policy_staged_activation_${record.eventType.toLowerCase()}`,
            classification: 'CRITICAL',
            policyDecision: record.eventType.includes('BLOCKED') || record.eventType.includes('REJECTED') || record.eventType.includes('CONFLICT') ? 'DENY' : 'PERMIT',
            executionStatus: record.eventType.includes('BLOCKED') || record.eventType.includes('REJECTED') || record.eventType.includes('CONFLICT')
                ? 'BLOCKED'
                : 'SUCCESS',
            argumentsHash,
            approvalId: record.activationCommitId ?? record.stagedActivationId,
        });
    }
}
export const globalPolicyStagedActivationAuditEngine = new PolicyStagedActivationAuditEngine();
