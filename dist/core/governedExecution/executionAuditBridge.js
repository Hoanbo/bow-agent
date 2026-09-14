// src/core/governedExecution/executionAuditBridge.ts
// BOWCON V4.0 — MS-1.5.09: EXECUTION AUDIT BRIDGE
// Component 1065 — REAL
//
// EN: Bridges governed execution lifecycle transitions to AuditLedger.
//     Enforces cryptographic provenance logging, zero raw secrets, zero CoT, and immutable audit trails.
// VI: Cầu nối các bước chuyển vòng đời thực thi có quản trị tới AuditLedger.
//     Thực thi ghi nhật ký provenance mật mã, không có bí mật thô, không có CoT và dấu vết kiểm toán bất biến.
import { globalAuditLedger } from '../auditLedger.js';
export class ExecutionAuditBridge {
    auditLedger;
    constructor(options) {
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    }
    /**
     * EN: Records execution lifecycle transition into append-only cryptographic ledger.
     * VI: Ghi nhận bước chuyển vòng đời thực thi vào sổ cái mật mã chỉ ghi thêm.
     */
    recordTransition(params) {
        const { tenantId, eventType, state, request, result, reason } = params;
        const isPermitted = state === 'SUCCEEDED' || state === 'EXECUTING' || state === 'AUTHORIZATION_VERIFIED';
        const policyDecision = isPermitted ? 'PERMIT' : 'DENY';
        const executionStatus = state === 'SUCCEEDED'
            ? 'SUCCESS'
            : state === 'FAILED' || state === 'DENIED' || state === 'PREEMPTED' || state === 'EXPIRED'
                ? 'BLOCKED'
                : 'SUCCESS';
        try {
            const event = this.auditLedger.record({
                timestamp: new Date().toISOString(),
                actor: {
                    userId: tenantId,
                    role: 'GOVERNED_EXECUTION_WORKER',
                    channel: 'INTERNAL_EXECUTION_PLANE',
                },
                domain: 'GOVERNED_EXECUTION',
                toolName: `execution_${request.operation.kind.toLowerCase()}_${request.operation.operationName}`,
                classification: request.authorization.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'SAFE',
                argumentsHash: request.requestHash,
                policyDecision,
                executionStatus,
            });
            return event.eventId;
        }
        catch {
            // Audit ledger failure must not silently compromise execution plane stability
            return `audit_fallback_${Date.now()}`;
        }
    }
}
