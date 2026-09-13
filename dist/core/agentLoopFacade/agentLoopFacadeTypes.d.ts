export declare const AGENT_LOOP_FACADE_VERSION = "4.0.0";
export declare const AGENT_LOOP_FACADE_AUDIT_DOMAIN = "agent_production_loop";
export declare const MAX_LOOP_ITERATIONS = 20;
export declare const MAX_STEP_ATTEMPTS = 3;
export declare const MAX_CONSECUTIVE_DENIALS = 3;
export declare const MAX_TASK_EXECUTION_TIME_MS = 300000;
export declare const AGENT_LOOP_BOUNDS: {
    readonly MAX_LOOP_ITERATIONS: 20;
    readonly MAX_STEP_ATTEMPTS: 3;
    readonly MAX_CONSECUTIVE_DENIALS: 3;
    readonly MAX_TASK_EXECUTION_TIME_MS: 300000;
};
/**
 * 14-state deterministic progression for an agent loop cycle plus terminal failure states.
 */
export type AgentLoopState = 'IDLE' | 'TASK_ACCEPTED' | 'CONTEXT_ASSEMBLED' | 'COGNITION_COMPLETED' | 'PLAN_FORMULATED' | 'ACTION_PROPOSED' | 'AUTHORIZATION_EVALUATED' | 'AWAITING_HUMAN_APPROVAL' | 'TOOL_EXECUTING' | 'REALITY_VERIFYING' | 'DURABLE_COMMITTING' | 'MEMORY_SYNTHESIZING' | 'CYCLE_EVALUATION' | 'COMPLETED' | 'FAILED' | 'USER_STOP_ABORTED' | 'SECURITY_REJECTED' | 'STALE_TASK_CONCURRENCY_ABORT' | 'CYCLE_BUDGET_EXCEEDED';
/**
 * Terminal outcome status of an agent loop execution.
 */
export type AgentLoopOutcomeStatus = 'COMPLETED' | 'AWAITING_APPROVAL' | 'FAILED' | 'USER_STOP_ABORTED' | 'SECURITY_REJECTED' | 'CONCURRENCY_ABORTED' | 'BUDGET_EXCEEDED';
/**
 * Contextual metadata for an agent loop execution request.
 */
export interface AgentLoopContext {
    readonly correlationId?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * Public request presented to ProductionAgentLoopFacade.
 */
export interface AgentLoopRequest {
    readonly taskId: string;
    readonly tenantId: string;
    readonly prompt?: string;
    readonly expectedTaskVersion?: number;
    readonly executionToken?: string;
    readonly maxIterations?: number;
    readonly maxStepAttempts?: number;
    readonly timeoutMs?: number;
    readonly context?: AgentLoopContext;
}
/**
 * Immutable execution record for a single step within an iteration.
 */
export interface AgentLoopStepExecution {
    readonly stepId: string;
    readonly stepIndex: number;
    readonly actionName: string;
    readonly proposalId?: string;
    readonly executionId?: string;
    readonly verificationId?: string;
    readonly commitId?: string;
    readonly memoryId?: string;
    readonly status: 'SUCCESS' | 'DENIED' | 'FAILED' | 'AWAITING_APPROVAL' | 'ABORTED';
    readonly durationMs: number;
    readonly failureReason?: string;
}
/**
 * Sealed, deeply immutable result emitted by ProductionAgentLoopFacade.
 */
export interface AgentLoopResult {
    readonly taskId: string;
    readonly tenantId: string;
    readonly status: AgentLoopOutcomeStatus;
    readonly finalState: AgentLoopState;
    readonly iterationsExecuted: number;
    readonly stepExecutions: readonly AgentLoopStepExecution[];
    readonly startedAt: string;
    readonly completedAt: string;
    readonly totalDurationMs: number;
    readonly loopProvenanceHash: string;
    readonly failureReason?: string;
    readonly pendingApprovalStepId?: string;
}
/**
 * Audit event types emitted across the agent loop lifecycle.
 */
export type AgentLoopAuditEventType = 'AGENT_LOOP_STARTED' | 'AGENT_LOOP_STEP_DISPATCHED' | 'AGENT_LOOP_APPROVAL_DEMANDED' | 'AGENT_LOOP_STEP_EXECUTED' | 'AGENT_LOOP_VERIFIED' | 'AGENT_LOOP_COMMITTED' | 'AGENT_LOOP_STEP_COMPLETED' | 'AGENT_LOOP_ITERATION_COMPLETED' | 'AGENT_LOOP_TASK_COMPLETED' | 'AGENT_LOOP_USER_STOP_ABORTED' | 'AGENT_LOOP_FAILED' | 'AGENT_LOOP_SECURITY_REJECTED' | 'AGENT_LOOP_CONCURRENCY_CONFLICT';
export declare abstract class AgentLoopError extends Error {
    readonly details?: Readonly<Record<string, unknown>> | undefined;
    abstract readonly code: string;
    readonly timestamp: string;
    constructor(message: string, details?: Readonly<Record<string, unknown>> | undefined);
}
export declare class AgentLoopAbortedError extends AgentLoopError {
    readonly code = "AGENT_LOOP_ABORTED_ERROR";
    readonly checkpoint?: number;
    constructor(message: string, details?: Readonly<Record<string, unknown>>);
}
export declare class AgentLoopValidationError extends AgentLoopError {
    readonly code = "AGENT_LOOP_VALIDATION_ERROR";
}
export declare class AgentLoopSecurityViolationError extends AgentLoopError {
    readonly code = "AGENT_LOOP_SECURITY_VIOLATION";
}
export declare class AgentLoopConcurrencyError extends AgentLoopError {
    readonly code = "AGENT_LOOP_CONCURRENCY_ERROR";
}
export declare class AgentLoopBudgetExceededError extends AgentLoopError {
    readonly code = "AGENT_LOOP_BUDGET_EXCEEDED";
}
export declare class AgentLoopAuthorizationError extends AgentLoopError {
    readonly code = "AGENT_LOOP_AUTHORIZATION_ERROR";
}
export declare class AgentLoopExecutionError extends AgentLoopError {
    readonly code = "AGENT_LOOP_EXECUTION_ERROR";
}
