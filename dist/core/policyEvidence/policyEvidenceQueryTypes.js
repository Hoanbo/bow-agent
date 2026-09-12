// src/core/policyEvidence/policyEvidenceQueryTypes.ts
// BOWCON V4.0 — MS-1.3.63: GOVERNED POLICY EVIDENCE QUERY,
// AUDIT CORRELATION & INTEGRITY VERIFICATION LAYER
//
// Canonical strongly-typed contracts for the policy evidence investigation layer:
// branded identifiers, query filters, lifecycle traces, audit correlations, and integrity verification results.
// Strictly read-only contracts. Zero autonomous authority.
//
// Hợp đồng kiểu TypeScript chuẩn tắc cho lớp điều tra bằng chứng chính sách:
// định danh có thương hiệu, bộ lọc truy vấn, dấu vết vòng đời, tương quan kiểm toán và kết quả xác minh toàn vẹn.
// Hợp đồng thuần túy chỉ đọc. Không có thẩm quyền tự động.
//
// Authority Invariants:
// - INVESTIGATION != AUTHORITY
// - QUERY != MUTATION
// - TRACE != EXECUTION
// - CORRELATION != APPROVAL
// - VERIFICATION != RECOVERY
// - READ_ONLY > SPECULATIVE_ACTION
// - USER_STOP > ALL_INVESTIGATION_OPERATIONS
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_PROMOTION
// - ZERO_AUTONOMOUS_ROLLBACK
// - ZERO_AUTONOMOUS_CIRCUIT_BREAKER_RESET
/**
 * Creates and validates a branded EvidenceQueryId.
 * Tạo và xác thực EvidenceQueryId có thương hiệu.
 */
export function createEvidenceQueryId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_EVIDENCE_QUERY_ID: Query ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded EvidenceCorrelationId.
 * Tạo và xác thực EvidenceCorrelationId có thương hiệu.
 */
export function createEvidenceCorrelationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_EVIDENCE_CORRELATION_ID: Correlation ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyLifecycleTraceId.
 * Tạo và xác thực PolicyLifecycleTraceId có thương hiệu.
 */
export function createPolicyLifecycleTraceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_LIFECYCLE_TRACE_ID: Trace ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded IntegrityVerificationId.
 * Tạo và xác thực IntegrityVerificationId có thương hiệu.
 */
export function createIntegrityVerificationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_INTEGRITY_VERIFICATION_ID: Verification ID must be a non-empty string');
    }
    return raw.trim();
}
