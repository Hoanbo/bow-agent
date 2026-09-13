// src/core/policyExecution/policyExecutionTypes.ts
// BOWCON V4.0 — MS-1.3.65: GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION LAYER
//
// Canonical types, branded identifiers, lifecycle state machines, and DTO contracts
// for Governed Remediation Execution and Outcome Verification.
//
// Các kiểu canonical, định danh có thương hiệu, máy trạng thái vòng đời và hợp đồng DTO
// cho việc thực thi khắc phục có quản trị và xác minh kết quả.
//
// Authority Invariants:
// - OBSERVATION != RECOMMENDATION != DECISION != AUTHORIZATION != EXECUTION != VERIFICATION
// - ZERO_AUTONOMOUS_AUTHORITY: Execution requires prior explicit human authorization
// - HARD_CODED_SAFETY_FLOOR: Hard-forbidden actions permanently non-executable
// - ABSOLUTE_USER_STOP_SUPREMACY: Immediate fail-closed suspension on USER_STOP
// - STRICT_TENANT_ISOLATION: Strict partition sandboxing across all execution state
export function createExecutionId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_EXECUTION_ID: ExecutionId must be a non-empty string');
    }
    return val.trim();
}
export function createExecutionRequestId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_EXECUTION_REQUEST_ID: ExecutionRequestId must be a non-empty string');
    }
    return val.trim();
}
export function createExecutionEnvelopeId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_EXECUTION_ENVELOPE_ID: ExecutionEnvelopeId must be a non-empty string');
    }
    return val.trim();
}
export function createExecutionOutcomeId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_EXECUTION_OUTCOME_ID: ExecutionOutcomeId must be a non-empty string');
    }
    return val.trim();
}
export function createExecutionAttemptId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_EXECUTION_ATTEMPT_ID: ExecutionAttemptId must be a non-empty string');
    }
    return val.trim();
}
export function createExecutionProvenanceId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_EXECUTION_PROVENANCE_ID: ExecutionProvenanceId must be a non-empty string');
    }
    return val.trim();
}
