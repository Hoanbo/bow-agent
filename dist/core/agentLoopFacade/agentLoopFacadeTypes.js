// src/core/agentLoopFacade/agentLoopFacadeTypes.ts
// BOWCON V4.0 — MS-1.4.10: PRODUCTION AGENT LOOP FAÇADE TYPES
//
// EN:
// Authoritative type definitions, contracts, bounds, and error taxonomy for the
// Production Agent Loop Façade.
// Enforces hard governance invariants:
// COGNITION != AUTHORIZATION, PLAN != EXECUTION, LLM_OUTPUT != AUTHORITY,
// PROPOSAL != AUTHORIZATION, AUTHORIZATION != EXECUTION, PEP != TOOL,
// TOOL_OUTPUT != REALITY_PROOF, REALITY_VERIFICATION != DURABLE_COMMIT,
// DURABLE_COMMIT != MEMORY_SYNTHESIS, MEMORY != AUTHORITY, MEMORY != POLICY,
// MEMORY != EXECUTION, USER_STOP > ALL_AGENT_ACTIVITY.
//
// VI:
// Định nghĩa kiểu dữ liệu có thẩm quyền, hợp đồng, giới hạn và phân loại lỗi cho
// Mặt tiền Chu trình Agent Sản xuất (Production Agent Loop Façade).
export const AGENT_LOOP_FACADE_VERSION = '4.0.0';
export const AGENT_LOOP_FACADE_AUDIT_DOMAIN = 'agent_production_loop';
export const MAX_LOOP_ITERATIONS = 20;
export const MAX_STEP_ATTEMPTS = 3;
export const MAX_CONSECUTIVE_DENIALS = 3;
export const MAX_TASK_EXECUTION_TIME_MS = 300000; // 5 minutes
export const AGENT_LOOP_BOUNDS = {
    MAX_LOOP_ITERATIONS,
    MAX_STEP_ATTEMPTS,
    MAX_CONSECUTIVE_DENIALS,
    MAX_TASK_EXECUTION_TIME_MS,
};
// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================
export class AgentLoopError extends Error {
    details;
    timestamp;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = this.constructor.name;
        this.timestamp = new Date().toISOString();
    }
}
export class AgentLoopAbortedError extends AgentLoopError {
    code = 'AGENT_LOOP_ABORTED_ERROR';
    checkpoint;
    constructor(message, details) {
        super(message, details);
        this.checkpoint = details?.checkpointNumber ?? details?.checkpoint;
    }
}
export class AgentLoopValidationError extends AgentLoopError {
    code = 'AGENT_LOOP_VALIDATION_ERROR';
}
export class AgentLoopSecurityViolationError extends AgentLoopError {
    code = 'AGENT_LOOP_SECURITY_VIOLATION';
}
export class AgentLoopConcurrencyError extends AgentLoopError {
    code = 'AGENT_LOOP_CONCURRENCY_ERROR';
}
export class AgentLoopBudgetExceededError extends AgentLoopError {
    code = 'AGENT_LOOP_BUDGET_EXCEEDED';
}
export class AgentLoopAuthorizationError extends AgentLoopError {
    code = 'AGENT_LOOP_AUTHORIZATION_ERROR';
}
export class AgentLoopExecutionError extends AgentLoopError {
    code = 'AGENT_LOOP_EXECUTION_ERROR';
}
