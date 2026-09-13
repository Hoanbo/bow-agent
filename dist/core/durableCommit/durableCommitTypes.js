// src/core/durableCommit/durableCommitTypes.ts
// BOWCON V4.0 — MS-1.4.08: DURABLE COMMIT ENGINE TYPES
//
// EN:
// Authoritative type definitions, contracts, and error taxonomy for the Durable Commit Engine.
// Enforces the strict governance boundary where only verified empirical reality produced by
// MS-1.4.07 can be committed to durable, crash-safe, immutable internal state.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền, hợp đồng và phân loại lỗi cho Động cơ Commit Bền vững.
// Thực thi ranh giới quản trị nghiêm ngặt, nơi chỉ thực tế kinh nghiệm đã xác minh bởi MS-1.4.07
// mới được commit vào trạng thái nội bộ bất biến, an toàn sau sự cố và bền vững.
//
// Invariants:
// COGNITION != AUTHORIZATION
// PLAN != EXECUTION
// LLM_OUTPUT != AUTHORITY
// PROPOSAL != AUTHORIZATION
// AUTHORIZATION != EXECUTION
// PEP != TOOL
// TOOL_OUTPUT != REALITY_PROOF
// REALITY_VERIFICATION != DURABLE_COMMIT
// TOOL_OUTPUT != REALITY_PROOF != DURABLE_COMMIT
// USER_STOP > ALL_COMMIT
// HUMAN_AUTHORITY > AGENT
// FAIL_CLOSED > FAIL_OPEN
export const DURABLE_COMMIT_VERSION = '4.0.0';
export const DURABLE_COMMIT_AUDIT_DOMAIN = 'agent_durable_commit';
export const MAX_COMMIT_PAYLOAD_BYTES = 65536; // 64 KB
export const MAX_COMMIT_DEPTH = 10;
export const DURABLE_COMMIT_BOUNDS = {
    MAX_PAYLOAD_BYTES: MAX_COMMIT_PAYLOAD_BYTES,
    MAX_DEPTH: MAX_COMMIT_DEPTH,
};
// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================
export class DurableCommitError extends Error {
    details;
    timestamp;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = this.constructor.name;
        this.timestamp = new Date().toISOString();
    }
}
export class DuplicateCommitError extends DurableCommitError {
    code = 'DUPLICATE_COMMIT_ERROR';
}
export class StaleTaskCommitError extends DurableCommitError {
    code = 'STALE_TASK_COMMIT_ERROR';
}
export class CrossTenantCommitError extends DurableCommitError {
    code = 'CROSS_TENANT_COMMIT_ERROR';
}
export class CommitSecurityViolationError extends DurableCommitError {
    code = 'COMMIT_SECURITY_VIOLATION';
}
export class CommitAbortedError extends DurableCommitError {
    code = 'COMMIT_ABORTED_ERROR';
}
export class CommitValidationError extends DurableCommitError {
    code = 'COMMIT_VALIDATION_ERROR';
}
export class CommitPersistenceError extends DurableCommitError {
    code = 'COMMIT_PERSISTENCE_ERROR';
}
