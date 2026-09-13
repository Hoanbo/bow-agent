// src/core/actionProposal/actionProposalTypes.ts
// BOWCON V4.0 — MS-1.4.05: GOVERNED ACTION PROPOSAL & PDP / PEP BRIDGE TYPES
//
// EN:
// Authoritative type definitions and error taxonomy for the Action Proposal
// and Policy Decision Point (PDP) / Policy Enforcement Point (PEP) Bridge.
// Establishes the mandatory governance air-gap between candidate planning and execution.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền và phân loại lỗi cho Đề xuất Hành động
// và Cầu nối Điểm Quyết định Chính sách (PDP) / Điểm Thực thi Chính sách (PEP).
// Thiết lập khoảng cách an ninh quản trị bắt buộc giữa lập kế hoạch ứng viên và thực thi.
//
// Invariants:
// LLM_OUTPUT != AUTHORITY
// LLM_PROPOSAL != EXECUTION
// CONFIDENCE != AUTHORIZATION
// PLAN != EXECUTION
// PLANNER != TOOL_EXECUTOR
// COGNITION != AUTHORIZATION
// USER_STOP > ALL_ACTION_PROPOSALS
// PDP = AUTHORITATIVE POLICY DECISION
// PEP = AUTHORITATIVE ENFORCEMENT GATE
// ApprovalService = AUTHORITATIVE HUMAN APPROVAL TOKEN SOURCE
// AgentTaskStore = AUTHORITATIVE TASK / VERSION SOURCE
export const ACTION_PROPOSAL_VERSION = '4.0.0';
export const ACTION_PROPOSAL_AUDIT_DOMAIN = 'agent_action_proposal';
// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================
export class ActionProposalError extends Error {
    details;
    timestamp;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = this.constructor.name;
        this.timestamp = new Date().toISOString();
    }
}
export class ProposalValidationError extends ActionProposalError {
    code = 'PROPOSAL_VALIDATION_ERROR';
}
export class ProposalUserStopError extends ActionProposalError {
    code = 'PROPOSAL_USER_STOP_ERROR';
}
export class CrossTenantProposalError extends ActionProposalError {
    code = 'CROSS_TENANT_PROPOSAL_ERROR';
}
export class StaleProposalError extends ActionProposalError {
    code = 'STALE_PROPOSAL_ERROR';
}
export class ProposalPolicyUnavailableError extends ActionProposalError {
    code = 'PROPOSAL_POLICY_UNAVAILABLE_ERROR';
}
export class ProposalDeniedError extends ActionProposalError {
    code = 'PROPOSAL_DENIED_ERROR';
}
export class ProposalApprovalRequiredError extends ActionProposalError {
    code = 'PROPOSAL_APPROVAL_REQUIRED_ERROR';
}
export class ProposalPEPDenyError extends ActionProposalError {
    code = 'PROPOSAL_PEP_DENY_ERROR';
}
export class ProposalSourceCorruptedError extends ActionProposalError {
    code = 'PROPOSAL_SOURCE_CORRUPTED_ERROR';
}
export class ProposalSecurityViolationError extends ActionProposalError {
    code = 'PROPOSAL_SECURITY_VIOLATION_ERROR';
}
