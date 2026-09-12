// src/core/release/releaseTypes.ts
// BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
//
// Canonical type contracts, branded identifiers, state machines, and error codes
// for the governed release verification subsystem.
// Hợp đồng định kiểu chuẩn tắc, định danh có thương hiệu, máy trạng thái và mã lỗi
// cho phân hệ xác minh phát hành có quản trị.
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
// - TECHNICAL_VERIFICATION != OWNER_APPROVAL
// - QUALITY_PASS != RELEASE_AUTHORIZATION
// - RELEASE_CANDIDATE != RELEASE_TOKEN
// - VERIFICATION_PIPELINE_PASS != RELEASE_AUTHORIZATION
// - SUPERVISOR_REVIEW != RELEASE_AUTHORIZATION
// - RELEASE_CANDIDATE_VERIFICATION != PROMOTION_AUTHORIZATION
// - CONTRADICTION => ESCALATE_TO_SUPERVISOR (no majority voting, ever)
// - FAILED/BLOCKED/STALE states => prohibit release authorization without re-verification
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - AGENT_COUNT != AUTHORITY_COUNT
// - CAPABILITY != AUTHORIZATION
// - DELEGATION != EXECUTION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export const RELEASE_SCHEMA_VERSION = '4.0.0';
/**
 * Factory helper to construct a branded ReleaseCandidateId.
 * Hàm hỗ trợ tạo ReleaseCandidateId có thương hiệu.
 */
export function createReleaseCandidateId(id) {
    return id;
}
/**
 * Factory helper to construct a branded ReleaseVerificationId.
 * Hàm hỗ trợ tạo ReleaseVerificationId có thương hiệu.
 */
export function createReleaseVerificationId(id) {
    return id;
}
/**
 * Factory helper to construct a branded ReleaseAcceptanceCriteriaId.
 * Hàm hỗ trợ tạo ReleaseAcceptanceCriteriaId có thương hiệu.
 */
export function createReleaseAcceptanceCriteriaId(id) {
    return id;
}
// ─────────────────────────────────────────────────────────────────────────────
// ERROR CODES & ERROR CLASS
// MÃ LỖI & LỚP LỖI
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Error code enum for the Release verification subsystem.
 * Mã lỗi chuẩn cho các lỗi thuộc hệ thống con xác minh Phát hành.
 */
export var ReleaseErrorCode;
(function (ReleaseErrorCode) {
    ReleaseErrorCode["PROTECTED_WORKSPACE_VIOLATION"] = "PROTECTED_WORKSPACE_VIOLATION";
    ReleaseErrorCode["USER_STOP_ACTIVE"] = "USER_STOP_ACTIVE";
    ReleaseErrorCode["REVOCATION_ACTIVE"] = "REVOCATION_ACTIVE";
    ReleaseErrorCode["CANDIDATE_NOT_FOUND"] = "CANDIDATE_NOT_FOUND";
    ReleaseErrorCode["CANDIDATE_EXPIRED"] = "CANDIDATE_EXPIRED";
    ReleaseErrorCode["CANDIDATE_STALE"] = "CANDIDATE_STALE";
    ReleaseErrorCode["CANDIDATE_REVOKED"] = "CANDIDATE_REVOKED";
    ReleaseErrorCode["CANDIDATE_FAILED"] = "CANDIDATE_FAILED";
    ReleaseErrorCode["QUALITY_REPORT_NOT_FOUND"] = "QUALITY_REPORT_NOT_FOUND";
    ReleaseErrorCode["EVIDENCE_BUNDLE_NOT_FOUND"] = "EVIDENCE_BUNDLE_NOT_FOUND";
    ReleaseErrorCode["PROVENANCE_HASH_MISMATCH"] = "PROVENANCE_HASH_MISMATCH";
    ReleaseErrorCode["MANIFEST_HASH_MISMATCH"] = "MANIFEST_HASH_MISMATCH";
    ReleaseErrorCode["EVIDENCE_CORRUPTED"] = "EVIDENCE_CORRUPTED";
    ReleaseErrorCode["ACCEPTANCE_CRITERIA_FAILED"] = "ACCEPTANCE_CRITERIA_FAILED";
    ReleaseErrorCode["CONTRADICTION_DETECTED"] = "CONTRADICTION_DETECTED";
    ReleaseErrorCode["SUPERVISOR_GATE_REQUIRED"] = "SUPERVISOR_GATE_REQUIRED";
    ReleaseErrorCode["MISSING_REQUIRED_BINDING"] = "MISSING_REQUIRED_BINDING";
    ReleaseErrorCode["INVALID_MILESTONE_TAG"] = "INVALID_MILESTONE_TAG";
    ReleaseErrorCode["RELEASE_AUTHORIZATION_ATTEMPT"] = "RELEASE_AUTHORIZATION_ATTEMPT";
})(ReleaseErrorCode || (ReleaseErrorCode = {}));
/**
 * Branded error class for all Release subsystem failures.
 * Lớp lỗi có thương hiệu cho tất cả các sự cố của hệ thống con Phát hành.
 */
export class ReleaseError extends Error {
    code;
    timestamp;
    constructor(code, message) {
        super(`[RELEASE_${code}] ${message}`);
        this.name = 'ReleaseError';
        this.code = code;
        this.timestamp = Date.now();
        Object.setPrototypeOf(this, ReleaseError.prototype);
    }
}
