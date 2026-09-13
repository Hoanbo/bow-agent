// src/core/taskLifecycle/agentTaskTypes.ts
// BOWCON V4.0 — MS-1.4.01: AGENT TASK LIFECYCLE & STATE ENGINE TYPES
//
// EN:
// Authoritative type definitions for the Agent Task Lifecycle & State Engine.
// Enforces explicit 9-state task lifecycle, ordered step models, tenant-partitioned
// storage contracts, optimistic concurrency control, and cryptographic provenance.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền cho Phân hệ Vòng đời & Máy Trạng thái Nhiệm vụ Agent.
// Thực thi vòng đời nhiệm vụ 9 trạng thái tường minh, mô hình bước có thứ tự, hợp đồng
// lưu trữ phân vùng theo tenant, kiểm soát đồng thời lạc quan và provenance mật mã.
import crypto from 'node:crypto';
// ============================================================================
// ERROR CONTRACTS (Các Hợp đồng Lỗi)
// ============================================================================
export class IllegalStateTransitionError extends Error {
    fromState;
    toState;
    taskId;
    constructor(fromState, toState, taskId, details) {
        super(`[ILLEGAL_TASK_TRANSITION] Cannot transition task${taskId ? ` '${taskId}'` : ''} from '${fromState}' to '${toState}'${details ? `: ${details}` : ''}`);
        this.name = 'IllegalStateTransitionError';
        this.fromState = fromState;
        this.toState = toState;
        this.taskId = taskId;
    }
}
export class ConcurrencyConflictError extends Error {
    taskId;
    currentVersion;
    expectedVersion;
    constructor(taskId, currentVersion, expectedVersion) {
        super(`[CONCURRENCY_CONFLICT] Task '${taskId}' version mismatch: expected version ${expectedVersion}, but current version is ${currentVersion}`);
        this.name = 'ConcurrencyConflictError';
        this.taskId = taskId;
        this.currentVersion = currentVersion;
        this.expectedVersion = expectedVersion;
    }
}
export class CrossTenantAccessViolationError extends Error {
    requestedTenantId;
    actualTenantId;
    taskId;
    constructor(requestedTenantId, actualTenantId, taskId) {
        super(`[CROSS_TENANT_ACCESS_VIOLATION] Access denied: tenant '${requestedTenantId}' attempted to access task '${taskId}' belonging to tenant '${actualTenantId}'`);
        this.name = 'CrossTenantAccessViolationError';
        this.requestedTenantId = requestedTenantId;
        this.actualTenantId = actualTenantId;
        this.taskId = taskId;
    }
}
export class ProvenanceTamperError extends Error {
    taskId;
    calculatedHash;
    recordedHash;
    constructor(taskId, calculatedHash, recordedHash) {
        super(`[PROVENANCE_TAMPER_DETECTED] Task '${taskId}' provenance integrity check failed: calculated hash '${calculatedHash}' != recorded hash '${recordedHash}'`);
        this.name = 'ProvenanceTamperError';
        this.taskId = taskId;
        this.calculatedHash = calculatedHash;
        this.recordedHash = recordedHash;
    }
}
export class UserStopActiveError extends Error {
    constructor(operation) {
        super(`[USER_STOP_ACTIVE] Operation '${operation}' denied because USER_STOP is currently active`);
        this.name = 'UserStopActiveError';
    }
}
export class TaskNotFoundError extends Error {
    taskId;
    tenantId;
    constructor(taskId, tenantId) {
        super(`[TASK_NOT_FOUND] Task '${taskId}' not found in tenant partition '${tenantId}'`);
        this.name = 'TaskNotFoundError';
        this.taskId = taskId;
        this.tenantId = tenantId;
    }
}
export class TaskValidationError extends Error {
    constructor(message) {
        super(`[TASK_VALIDATION_ERROR] ${message}`);
        this.name = 'TaskValidationError';
    }
}
// ============================================================================
// DETERMINISTIC IDENTIFIER GENERATORS
// ============================================================================
export function createTaskId(tenantId, timestamp, rand) {
    const ts = timestamp ?? Date.now();
    const rnd = rand ?? crypto.randomBytes(4).toString('hex');
    const safeTenant = tenantId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    return `task_${safeTenant}_${ts}_${rnd}`;
}
export function createStepId(taskId, index) {
    return `step_${taskId}_${index}`;
}
