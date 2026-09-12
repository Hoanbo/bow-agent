// src/core/policyObservability/policyObservabilityTypes.ts
// BOWCON V4.0 — MS-1.3.62: GOVERNED POLICY OPERATIONAL OBSERVABILITY,
// GOVERNANCE EVIDENCE & RUNTIME INTEGRITY AUDIT LAYER
//
// Canonical strongly-typed contracts for the policy observability layer:
// evidence records, runtime health snapshots, governance reports, and query filters.
// Every record is tenant-scoped. No anonymous persistence.
//
// Hợp đồng kiểu TypeScript chuẩn tắc cho lớp quan sát chính sách:
// bản ghi bằng chứng, ảnh chụp sức khỏe thời gian chạy, báo cáo quản trị và bộ lọc truy vấn.
// Mỗi bản ghi được gắn phạm vi người thuê. Không có lưu trữ ẩn danh.
//
// Authority Invariants:
// - OBSERVABILITY != AUTHORITY
// - CONFIDENCE != AUTHORITY
// - HEALTH_EVIDENCE != APPROVAL
// - TELEMETRY != PROMOTION
// - SIMULATION != EXECUTION
// - CANARY_EVALUATION != POLICY_APPROVAL
// - TENANT_POLICY != CROSS_TENANT_POLICY
// - FAIL_CLOSED > SPECULATIVE_EXECUTION
// - USER_STOP > ALL_OBSERVABILITY_OPERATIONS
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_PROMOTION
// - ZERO_AUTONOMOUS_POLICY_MUTATION
/**
 * Creates and validates a branded PolicyEvidenceId.
 * Tạo và xác thực PolicyEvidenceId có thương hiệu.
 */
export function createPolicyEvidenceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_EVIDENCE_ID: Evidence ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyObservabilitySnapshotId.
 * Tạo và xác thực PolicyObservabilitySnapshotId có thương hiệu.
 */
export function createPolicyObservabilitySnapshotId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_OBSERVABILITY_SNAPSHOT_ID: Snapshot ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyGovernanceReportId.
 * Tạo và xác thực PolicyGovernanceReportId có thương hiệu.
 */
export function createPolicyGovernanceReportId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_GOVERNANCE_REPORT_ID: Report ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded PolicyEvidenceQueryId.
 * Tạo và xác thực PolicyEvidenceQueryId có thương hiệu.
 */
export function createPolicyEvidenceQueryId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_POLICY_EVIDENCE_QUERY_ID: Query ID must be a non-empty string');
    }
    return raw.trim();
}
