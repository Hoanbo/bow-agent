// src/core/policyDecision/policyDecisionTypes.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Canonical strongly-typed contracts for the governed policy decision and controlled remediation layer:
// branded identifiers, proposal state machine, remediation state machine, authorization tokens,
// remediation plans, execution envelopes, and audit event types.
// Strictly governed. Zero autonomous authority.
//
// Hợp đồng kiểu TypeScript chuẩn tắc cho lớp quyết định chính sách và khắc phục có kiểm soát:
// định danh có thương hiệu, máy trạng thái đề xuất, máy trạng thái khắc phục, token ủy quyền,
// kế hoạch khắc phục, phong bì thực thi và các loại sự kiện kiểm toán.
// Hoàn toàn có quản trị. Không có thẩm quyền tự động.
//
// Authority Invariants:
// - OBSERVATION != RECOMMENDATION
// - RECOMMENDATION != DECISION
// - DECISION != AUTHORIZATION
// - AUTHORIZATION != EXECUTION
// - ZERO_AUTONOMOUS_PROMOTION
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_ROLLBACK
// - ZERO_AUTONOMOUS_CIRCUIT_BREAKER_RESET
// - USER_STOP > ALL_DECISION_AND_REMEDIATION_OPERATIONS
// - HARD_FORBIDDEN_ACTIONS_PERMANENTLY_IMMUTABLE
/**
 * Creates and validates a branded DecisionId.
 * Tạo và xác thực DecisionId có thương hiệu.
 */
export function createDecisionId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_DECISION_ID: Decision ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded DecisionProposalId.
 * Tạo và xác thực DecisionProposalId có thương hiệu.
 */
export function createDecisionProposalId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_DECISION_PROPOSAL_ID: Decision Proposal ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded RemediationRequestId.
 * Tạo và xác thực RemediationRequestId có thương hiệu.
 */
export function createRemediationRequestId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_REMEDIATION_REQUEST_ID: Remediation Request ID must be a non-empty string');
    }
    return raw.trim();
}
/**
 * Creates and validates a branded DecisionProvenanceId.
 * Tạo và xác thực DecisionProvenanceId có thương hiệu.
 */
export function createDecisionProvenanceId(raw) {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
        throw new Error('INVALID_DECISION_PROVENANCE_ID: Decision Provenance ID must be a non-empty string');
    }
    return raw.trim();
}
