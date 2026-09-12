// src/core/quality/qualityTypes.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Canonical type contracts, schemas, and error definitions for the governed quality pipeline.
// Hợp đồng định kiểu chuẩn tắc, lược đồ và định nghĩa lỗi cho đường ống chất lượng có quản trị.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - TASK != AUTHORITY
// - SANDBOX != AUTHORITY
// - WORKTREE != AUTHORITY
// - BUILD != AUTHORITY
// - TEST != AUTHORITY
// - QUALITY_RESULT != AUTHORITY
// - QUALITY_REPORT != AUTHORIZATION
// - VALIDATION != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - VERIFICATION != AUTHORIZATION
// - PROMOTION_PROPOSAL != PROMOTION_AUTHORIZATION
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - AGENT_COUNT != AUTHORITY_COUNT
// - CAPABILITY != AUTHORIZATION
// - DELEGATION != EXECUTION
// - BUILD_SUCCESS != OWNER_APPROVAL
// - TEST_SUCCESS != OWNER_APPROVAL
// - QUALITY_PASS != PROMOTION_AUTHORIZATION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export const QUALITY_SCHEMA_VERSION = '4.0.0';
/**
 * Factory helper to construct a branded BuildExecutionId.
 * Hàm hỗ trợ tạo BuildExecutionId có thương hiệu.
 */
export function createBuildExecutionId(id) {
    return id;
}
/**
 * Factory helper to construct a branded TestExecutionId.
 * Hàm hỗ trợ tạo TestExecutionId có thương hiệu.
 */
export function createTestExecutionId(id) {
    return id;
}
/**
 * Factory helper to construct a branded QualityReportId.
 * Hàm hỗ trợ tạo QualityReportId có thương hiệu.
 */
export function createQualityReportId(id) {
    return id;
}
/**
 * Factory helper to construct a branded QualityEvidenceId.
 * Hàm hỗ trợ tạo QualityEvidenceId có thương hiệu.
 */
export function createQualityEvidenceId(id) {
    return id;
}
/**
 * Factory helper to construct a branded QualityGateId.
 * Hàm hỗ trợ tạo QualityGateId có thương hiệu.
 */
export function createQualityGateId(id) {
    return id;
}
/**
 * Error code enum for quality subsystem errors.
 * Mã lỗi chuẩn cho các lỗi thuộc hệ thống con chất lượng.
 */
export var QualityErrorCode;
(function (QualityErrorCode) {
    QualityErrorCode["PROTECTED_WORKSPACE_VIOLATION"] = "PROTECTED_WORKSPACE_VIOLATION";
    QualityErrorCode["PATH_TRAVERSAL_VIOLATION"] = "PATH_TRAVERSAL_VIOLATION";
    QualityErrorCode["COMMAND_NOT_ALLOWLISTED"] = "COMMAND_NOT_ALLOWLISTED";
    QualityErrorCode["SANDBOX_NOT_FOUND"] = "SANDBOX_NOT_FOUND";
    QualityErrorCode["WORKTREE_NOT_FOUND"] = "WORKTREE_NOT_FOUND";
    QualityErrorCode["SESSION_MISMATCH"] = "SESSION_MISMATCH";
    QualityErrorCode["TASK_MISMATCH"] = "TASK_MISMATCH";
    QualityErrorCode["DELEGATION_INVALID"] = "DELEGATION_INVALID";
    QualityErrorCode["CAPABILITY_LEASE_INVALID"] = "CAPABILITY_LEASE_INVALID";
    QualityErrorCode["USER_STOP_ACTIVE"] = "USER_STOP_ACTIVE";
    QualityErrorCode["REVOCATION_ACTIVE"] = "REVOCATION_ACTIVE";
    QualityErrorCode["TIMEOUT_EXCEEDED"] = "TIMEOUT_EXCEEDED";
    QualityErrorCode["COMMAND_EXECUTION_FAILED"] = "COMMAND_EXECUTION_FAILED";
    QualityErrorCode["EVIDENCE_CORRUPTED"] = "EVIDENCE_CORRUPTED";
    QualityErrorCode["MANIFEST_HASH_MISMATCH"] = "MANIFEST_HASH_MISMATCH";
    QualityErrorCode["STALE_WORKTREE"] = "STALE_WORKTREE";
    QualityErrorCode["CONTRADICTION_DETECTED"] = "CONTRADICTION_DETECTED";
    QualityErrorCode["PROMOTION_AUTHORIZATION_ATTEMPT"] = "PROMOTION_AUTHORIZATION_ATTEMPT";
    QualityErrorCode["CREDENTIAL_PERSISTENCE_ATTEMPT"] = "CREDENTIAL_PERSISTENCE_ATTEMPT";
    QualityErrorCode["RESOURCE_LIMIT_EXCEEDED"] = "RESOURCE_LIMIT_EXCEEDED";
})(QualityErrorCode || (QualityErrorCode = {}));
/**
 * Branded error class for all Quality subsystem failures.
 * Lớp lỗi có thương hiệu cho tất cả các sự cố của hệ thống con Chất lượng.
 */
export class QualityError extends Error {
    code;
    timestamp;
    constructor(code, message) {
        super(`[QUALITY_${code}] ${message}`);
        this.name = 'QualityError';
        this.code = code;
        this.timestamp = Date.now();
        Object.setPrototypeOf(this, QualityError.prototype);
    }
}
