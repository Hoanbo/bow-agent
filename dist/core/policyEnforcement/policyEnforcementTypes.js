// src/core/policyEnforcement/policyEnforcementTypes.ts
// BOWCON V4.0 — MS-1.3.59: GOVERNED RUNTIME POLICY ENFORCEMENT POINT (PEP),
// DYNAMIC PDP SYNCHRONIZATION & LIVE GUARDRAIL EXECUTION PIPELINE
//
// Canonical type definitions and DTO contracts for governed runtime policy enforcement,
// active policy resolution, atomic hot-swapping, runtime guardrail enforcement,
// policy drift reconciliation, fail-closed baseline fallback, and violation auditing.
// Định nghĩa kiểu chuẩn tắc và các hợp đồng DTO cho thực thi chính sách thời gian chạy có quản trị,
// giải quyết chính sách hoạt động, hoán đổi nóng nguyên tử, thực thi rào chắn thời gian chạy,
// đối soát độ lệch chính sách, dự phòng đường cơ sở đóng an toàn và kiểm toán vi phạm.
//
// Authority Invariants:
// - Level 0 Read-Only Policy Resolution / Inspection / Drift Detection
// - Level 1 Advisory / Diagnostic Information
// - Level 2 Controlled Runtime Enforcement
// - ACTIVE_POLICY_ENFORCEMENT != AUTONOMOUS_POLICY_MUTATION
// - ACTIVE_POLICY_ENFORCEMENT != AUTONOMOUS_POLICY_AUTHORIZATION
// - CONFIDENCE != AUTHORITY
// - SIMULATION != EXECUTION
// - POLICY_PROPOSAL != POLICY_MUTATION
// - POLICY_EVALUATION != POLICY_APPROVAL
// - TENANT_POLICY != CROSS_TENANT_POLICY
// - GUARDRAIL_ENFORCEMENT != HARD_GATE_RELAXATION
// - USER_STOP > ALL_RUNTIME_POLICY_OPERATIONS
// - HARD_FORBIDDEN_POLICY > DYNAMIC_POLICY
// - FAIL_CLOSED > SPECULATIVE_EXECUTION
/**
 * Creates and validates a branded EnforcementDecisionId.
 * Tạo và xác thực EnforcementDecisionId có thương hiệu.
 */
export function createEnforcementDecisionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ENFORCEMENT_DECISION_ID: Decision ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded ActivePolicyId.
 * Tạo và xác thực ActivePolicyId có thương hiệu.
 */
export function createActivePolicyId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_ACTIVE_POLICY_ID: Active Policy ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded DriftReportId.
 * Tạo và xác thực DriftReportId có thương hiệu.
 */
export function createDriftReportId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_DRIFT_REPORT_ID: Drift Report ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded ViolationAuditId.
 * Tạo và xác thực ViolationAuditId có thương hiệu.
 */
export function createViolationAuditId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_VIOLATION_AUDIT_ID: Violation Audit ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded GuardrailEvaluationId.
 * Tạo và xác thực GuardrailEvaluationId có thương hiệu.
 */
export function createGuardrailEvaluationId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_GUARDRAIL_EVALUATION_ID: Guardrail Evaluation ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded ExecutionLeaseId.
 * Tạo và xác thực ExecutionLeaseId có thương hiệu.
 */
export function createExecutionLeaseId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_EXECUTION_LEASE_ID: Execution Lease ID must be a non-empty string');
    }
    return raw.trim();
}
// ============================================================================
// CANONICAL CONSTANTS
// HẰNG SỐ CHUẨN TẮC
// ============================================================================
/**
 * Canonical immutable hard-forbidden actions.
 * Any dynamic attempt to downgrade these below FORBIDDEN is strictly rejected.
 * Các hành động bị cấm tuyệt đối chuẩn tắc bất biến.
 * Bất kỳ nỗ lực động nào nhằm hạ cấp chúng dưới FORBIDDEN đều bị từ chối nghiêm ngặt.
 */
export const CANONICAL_HARD_FORBIDDEN_ACTIONS = Object.freeze([
    'transfer_funds',
    'delete_database',
    'bypass_robot_interlocks',
    'execute_untrusted_host_script',
]);
