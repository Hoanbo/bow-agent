// src/core/realityVerification/realityVerificationTypes.ts
// BOWCON V4.0 — MS-1.4.07: EMPIRICAL REALITY VERIFICATION ENGINE TYPES
//
// EN:
// Authoritative type definitions, contracts, and error taxonomy for the Reality Verification Engine.
// Evaluates whether an authorized, executed tool operation genuinely produced observable real-world
// state transitions satisfying intended postcondition invariants.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền, hợp đồng và phân loại lỗi cho Động cơ Xác minh Thực tế.
// Đánh giá xem một thao tác công cụ đã được ủy quyền và thực thi có thực sự tạo ra các biến đổi trạng thái
// thế giới thực quan sát được thỏa mãn các bất biến điều kiện sau (postcondition) dự kiến hay không.
//
// Invariants:
// COGNITION != AUTHORIZATION
// PLAN != EXECUTION
// LLM_OUTPUT != AUTHORITY
// PROPOSAL != AUTHORIZATION
// AUTHORIZATION != EXECUTION
// PEP != TOOL
// TOOL_OUTPUT != REALITY_PROOF
// REALITY_VERIFICATION != EXECUTION
// USER_STOP > ALL_VERIFICATION
// HUMAN_AUTHORITY > AGENT
// FAIL_CLOSED > FAIL_OPEN
export const REALITY_VERIFICATION_VERSION = '4.0.0';
export const REALITY_VERIFICATION_AUDIT_DOMAIN = 'agent_reality_verification';
export const MAX_EVIDENCE_PAYLOAD_BYTES = 65536; // 64 KB
export const MAX_EVIDENCE_DEPTH = 10;
export const DEFAULT_MAX_EVIDENCE_AGE_MS = 60000; // 1 minute
export const REALITY_VERIFICATION_BOUNDS = {
    MAX_PAYLOAD_BYTES: MAX_EVIDENCE_PAYLOAD_BYTES,
    MAX_DEPTH: MAX_EVIDENCE_DEPTH,
    DEFAULT_MAX_AGE_MS: DEFAULT_MAX_EVIDENCE_AGE_MS,
};
// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================
export class RealityVerificationError extends Error {
    details;
    timestamp;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = this.constructor.name;
        this.timestamp = new Date().toISOString();
    }
}
export class VerificationAbortedError extends RealityVerificationError {
    code = 'VERIFICATION_ABORTED';
}
export class VerificationValidationError extends RealityVerificationError {
    code = 'VERIFICATION_VALIDATION_ERROR';
}
export class CrossTenantVerificationError extends RealityVerificationError {
    code = 'CROSS_TENANT_VERIFICATION_ERROR';
}
export class StaleTaskVerificationError extends RealityVerificationError {
    code = 'STALE_TASK_VERIFICATION_ERROR';
}
export class ContradictoryEvidenceError extends RealityVerificationError {
    code = 'CONTRADICTORY_EVIDENCE_ERROR';
}
export class VerificationSecurityViolationError extends RealityVerificationError {
    code = 'VERIFICATION_SECURITY_VIOLATION';
}
