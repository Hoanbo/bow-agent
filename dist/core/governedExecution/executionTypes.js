// src/core/governedExecution/executionTypes.ts
// BOWCON V4.0 — MS-1.5.09: GOVERNED EXECUTION WORKER & LEASE-BOUND ACTUATION ENGINE
// Component 1058 — REAL
//
// EN: Canonical domain contracts for Governed Execution, lease-bound actuation,
//     execution requests, authorization envelopes, execution results, and deterministic SHA-256 provenance.
// VI: Hợp đồng miền chuẩn mực cho Thực thi có Quản trị, bộ truyền động ràng buộc hợp đồng thuê,
//     yêu cầu thực thi, phong bì ủy quyền, kết quả thực thi và provenance mật mã SHA-256.
import crypto from 'node:crypto';
export const GOVERNED_EXECUTION_SCHEMA_VERSION = '1.0.0';
export const DEFAULT_EXECUTION_LEASE_TTL_MS = 60 * 1000; // 60 seconds
export const MAX_EXECUTION_PAYLOAD_BYTES = 256 * 1024; // 256 KB
// ============================================================================
// TYPED ERROR HIERARCHY
// PHÂN CẤP LỖI ĐỊNH KIỂU
// ============================================================================
export class GovernedExecutionError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.name = 'GovernedExecutionError';
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class ExecutionValidationError extends GovernedExecutionError {
    constructor(message, details) {
        super('EXECUTION_VALIDATION_ERROR', message, details);
        this.name = 'ExecutionValidationError';
    }
}
export class ExecutionAuthorizationError extends GovernedExecutionError {
    constructor(message, details) {
        super('EXECUTION_AUTHORIZATION_ERROR', message, details);
        this.name = 'ExecutionAuthorizationError';
    }
}
export class ExecutionLeaseError extends GovernedExecutionError {
    constructor(message, details) {
        super('EXECUTION_LEASE_ERROR', message, details);
        this.name = 'ExecutionLeaseError';
    }
}
export class ExecutionTenantIsolationError extends GovernedExecutionError {
    constructor(requestedTenant, targetTenant) {
        super('EXECUTION_TENANT_ISOLATION_ERROR', `Tenant access violation: requested tenant "${requestedTenant}" does not match target "${targetTenant}"`, { requestedTenant, targetTenant });
        this.name = 'ExecutionTenantIsolationError';
    }
}
export class ExecutionSessionIsolationError extends GovernedExecutionError {
    constructor(requestedSession, targetSession) {
        super('EXECUTION_SESSION_ISOLATION_ERROR', `Session access violation: requested session "${requestedSession}" does not match target "${targetSession}"`, { requestedSession, targetSession });
        this.name = 'ExecutionSessionIsolationError';
    }
}
export class ExecutionConcurrencyError extends GovernedExecutionError {
    constructor(expectedVersion, actualVersion, details) {
        super('EXECUTION_CONCURRENCY_ERROR', `OCC CAS mismatch: expected version ${expectedVersion}, found ${actualVersion}`, { expectedVersion, actualVersion, ...details });
        this.name = 'ExecutionConcurrencyError';
    }
}
export class ExecutionUserStopError extends GovernedExecutionError {
    constructor(checkpoint) {
        super('EXECUTION_USER_STOP_PREEMPTED', `Execution terminated by USER_STOP at checkpoint "${checkpoint}"`, { checkpoint });
        this.name = 'ExecutionUserStopError';
    }
}
export class ExecutionAdapterError extends GovernedExecutionError {
    constructor(message, details) {
        super('EXECUTION_ADAPTER_ERROR', message, details);
        this.name = 'ExecutionAdapterError';
    }
}
export class ExecutionPersistenceError extends GovernedExecutionError {
    constructor(message, details) {
        super('EXECUTION_PERSISTENCE_ERROR', message, details);
        this.name = 'ExecutionPersistenceError';
    }
}
// ============================================================================
// DETERMINISTIC SHA-256 PROVENANCE FUNCTIONS
// CÁC HÀM PROVENANCE SHA-256 XÁC ĐỊNH
// ============================================================================
export function computeLeaseSignatureHash(lease) {
    const content = JSON.stringify({
        leaseId: lease.leaseId,
        tenantId: lease.tenantId,
        sessionId: lease.sessionId,
        taskId: lease.taskId,
        stepId: lease.stepId,
        stepIndex: lease.stepIndex,
        operationKind: lease.operationKind,
        riskLevel: lease.riskLevel,
        issuedAt: lease.issuedAt,
        expiresAt: lease.expiresAt,
        nonce: lease.nonce,
        singleUse: lease.singleUse,
        isConsumed: lease.isConsumed,
        version: lease.version,
    });
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
export function computeAuthorizationHash(auth) {
    const content = JSON.stringify({
        authorizationId: auth.authorizationId,
        tenantId: auth.tenantId,
        sessionId: auth.sessionId,
        bindingId: auth.bindingId,
        sourcePlanId: auth.sourcePlanId,
        sourcePlanProvenanceHash: auth.sourcePlanProvenanceHash,
        bindingProvenanceHash: auth.bindingProvenanceHash,
        taskId: auth.taskId,
        taskProvenanceHash: auth.taskProvenanceHash,
        stepId: auth.stepId,
        stepProvenanceHash: auth.stepProvenanceHash,
        riskLevel: auth.riskLevel,
        requiresHumanConfirmation: auth.requiresHumanConfirmation,
        humanConfirmationSignature: auth.humanConfirmationSignature ?? '',
        pdpVerdict: auth.pdpVerdict,
        pepLeaseId: auth.pepLeaseId,
        verifiedAt: auth.verifiedAt,
    });
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
export function computeRequestHash(req) {
    const content = JSON.stringify({
        requestId: req.requestId,
        tenantId: req.tenantId,
        sessionId: req.sessionId,
        taskId: req.taskId,
        stepId: req.stepId,
        stepIndex: req.stepIndex,
        operation: req.operation,
        authorizationHash: req.authorization.authorizationHash,
        leaseId: req.lease.leaseId,
        bindingId: req.bindingSnapshot.bindingId,
        requestedAt: req.requestedAt,
    });
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
export function computeExecutionResultProvenanceHash(res) {
    const content = JSON.stringify({
        executionId: res.executionId,
        requestId: res.requestId,
        tenantId: res.tenantId,
        sessionId: res.sessionId,
        taskId: res.taskId,
        stepId: res.stepId,
        stepIndex: res.stepIndex,
        state: res.state,
        outcome: res.outcome,
        success: res.success,
        output: res.output ?? null,
        failure: res.failure ?? null,
        leaseId: res.leaseId,
        completedAt: res.completedAt,
        sessionVersion: res.sessionVersion,
    });
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
export function computeExecutionSessionDocumentHash(doc) {
    const content = JSON.stringify({
        schemaVersion: doc.schemaVersion,
        tenantId: doc.tenantId,
        sessionId: doc.sessionId,
        sessionVersion: doc.sessionVersion,
        activeLeases: doc.activeLeases.map((l) => l.signatureHash),
        executionResults: doc.executionResults.map((r) => r.provenanceHash),
        updatedAt: doc.updatedAt,
    });
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
