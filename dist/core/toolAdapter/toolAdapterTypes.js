// src/core/toolAdapter/toolAdapterTypes.ts
// BOWCON V4.0 — MS-1.4.06: PRODUCTION TOOL ADAPTER PLANE TYPES
//
// EN:
// Authoritative type definitions, contracts, and error taxonomy for the Production Tool Adapter Plane.
// Serves as the controlled execution boundary that consumes AuthorizedActionHandoff from MS-1.4.05
// and invokes registered production adapters under strict governance invariants.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền, hợp đồng và phân loại lỗi cho Mặt phẳng Adapter Công cụ Sản xuất.
// Đóng vai trò là ranh giới thực thi có kiểm soát tiếp nhận AuthorizedActionHandoff từ MS-1.4.05
// và gọi các adapter sản xuất đã đăng ký theo các bất biến quản trị nghiêm ngặt.
//
// Invariants:
// COGNITION != AUTHORIZATION
// PLAN != EXECUTION
// LLM_OUTPUT != AUTHORITY
// PROPOSAL != AUTHORIZATION
// AUTHORIZATION != EXECUTION
// PEP != TOOL
// USER_STOP > ALL_EXECUTION
// HUMAN_AUTHORITY > AGENT
// FAIL_CLOSED > FAIL_OPEN
export const TOOL_ADAPTER_PLANE_VERSION = '4.0.0';
export const TOOL_ADAPTER_AUDIT_DOMAIN = 'agent_tool_execution';
// Bounded execution defaults & ceilings
export const DEFAULT_EXECUTION_TIMEOUT_MS = 10000;
export const MAX_EXECUTION_TIMEOUT_MS = 60000;
export const MAX_ARG_PAYLOAD_BYTES = 65536; // 64 KB
export const MAX_RESULT_PAYLOAD_BYTES = 131072; // 128 KB
export const MAX_ARG_DEPTH = 10;
// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================
export class ToolAdapterError extends Error {
    details;
    timestamp;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = this.constructor.name;
        this.timestamp = new Date().toISOString();
    }
}
export class ToolExecutionAbortedError extends ToolAdapterError {
    code = 'TOOL_EXECUTION_ABORTED';
}
export class ToolAdapterNotFoundError extends ToolAdapterError {
    code = 'TOOL_ADAPTER_NOT_FOUND';
}
export class ToolAdapterDisabledError extends ToolAdapterError {
    code = 'TOOL_ADAPTER_DISABLED';
}
export class ToolAdapterTimeoutError extends ToolAdapterError {
    code = 'TOOL_ADAPTER_TIMEOUT';
}
export class ToolExecutionFailureError extends ToolAdapterError {
    code = 'TOOL_EXECUTION_FAILURE';
}
export class ToolHandoffValidationError extends ToolAdapterError {
    code = 'TOOL_HANDOFF_VALIDATION_ERROR';
}
export class ToolSecurityViolationError extends ToolAdapterError {
    code = 'TOOL_SECURITY_VIOLATION';
}
export class CrossTenantToolExecutionError extends ToolAdapterError {
    code = 'CROSS_TENANT_TOOL_EXECUTION_ERROR';
}
export class StaleToolExecutionError extends ToolAdapterError {
    code = 'STALE_TOOL_EXECUTION_ERROR';
}
export class ToolReplayError extends ToolAdapterError {
    code = 'TOOL_REPLAY_ERROR';
}
