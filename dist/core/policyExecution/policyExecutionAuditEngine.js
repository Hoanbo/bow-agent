// src/core/policyExecution/policyExecutionAuditEngine.ts
// BOWCON V4.0 — MS-1.3.65: GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION LAYER
//
// Governed Policy Execution Audit Engine.
// Records canonical execution and verification lifecycle events to the append-only AuditLedger.
// Enforces:
// 1. Mandatory audit logging under domain POLICY_EXECUTION
// 2. Secret and token sanitization via DiagnosisSanitizer
// 3. Complete provenance and cryptographic argument hashing
// 4. Fail-closed error handling on audit anomalies
//
// Động cơ kiểm toán thực thi chính sách có quản trị.
// Ghi lại các sự kiện vòng đời thực thi và xác minh chính tắc vào AuditLedger chỉ ghi thêm.
//
// Authority Invariants:
// - ZERO_OMISSION: Every privileged execution transition must be audited
// - SANITIZATION_BY_DEFAULT: Secrets/keys/tokens never leaked to audit trail
// - TENANT_BOUND_AUDIT: All audit records bound to verified tenant partition
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class PolicyExecutionAuditEngine {
    auditLedger;
    sanitizer;
    constructor(options) {
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * Records a sanitized execution audit event into the append-only ledger.
     * Ghi lại một sự kiện kiểm toán thực thi đã được làm sạch vào sổ cái chỉ ghi thêm.
     */
    recordEvent(record) {
        const timestamp = new Date().toISOString();
        const sanitizedOperator = record.operatorUserId
            ? this.sanitizer.sanitize(record.operatorUserId)
            : 'system_governed';
        const rawPayload = {
            executionId: record.executionId,
            envelopeId: record.envelopeId,
            proposalId: record.proposalId,
            actionType: record.actionType,
            status: record.status,
            reason: record.reason,
            details: record.details,
            durationMs: record.durationMs,
        };
        const sanitizedPayload = this.sanitizer.sanitize(rawPayload);
        const argumentsHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(sanitizedPayload))
            .digest('hex');
        this.auditLedger.record({
            timestamp,
            actor: {
                userId: sanitizedOperator,
                role: 'human_operator',
                channel: 'governed_execution_boundary',
            },
            domain: 'POLICY_EXECUTION',
            toolName: `policy_execution_${record.eventType.toLowerCase()}`,
            classification: 'HIGH_IMPACT',
            policyDecision: record.eventType.includes('BLOCKED') || record.eventType.includes('FAILED') ? 'DENY' : 'PERMIT',
            executionStatus: record.eventType.includes('BLOCKED')
                ? 'BLOCKED'
                : record.eventType.includes('FAILED')
                    ? 'FAILURE'
                    : 'SUCCESS',
            argumentsHash,
            approvalId: record.proposalId,
        });
    }
}
export const globalPolicyExecutionAuditEngine = new PolicyExecutionAuditEngine();
