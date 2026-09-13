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
} as const;

/**
 * 14-state deterministic progression for an agent loop cycle plus terminal failure states.
 */
export type AgentLoopState =
  | 'IDLE'
  | 'TASK_ACCEPTED'
  | 'CONTEXT_ASSEMBLED'
  | 'COGNITION_COMPLETED'
  | 'PLAN_FORMULATED'
  | 'ACTION_PROPOSED'
  | 'AUTHORIZATION_EVALUATED'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'TOOL_EXECUTING'
  | 'REALITY_VERIFYING'
  | 'DURABLE_COMMITTING'
  | 'MEMORY_SYNTHESIZING'
  | 'CYCLE_EVALUATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'USER_STOP_ABORTED'
  | 'SECURITY_REJECTED'
  | 'STALE_TASK_CONCURRENCY_ABORT'
  | 'CYCLE_BUDGET_EXCEEDED';

/**
 * Terminal outcome status of an agent loop execution.
 */
export type AgentLoopOutcomeStatus =
  | 'COMPLETED'
  | 'AWAITING_APPROVAL'
  | 'FAILED'
  | 'USER_STOP_ABORTED'
  | 'SECURITY_REJECTED'
  | 'CONCURRENCY_ABORTED'
  | 'BUDGET_EXCEEDED';

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
export type AgentLoopAuditEventType =
  | 'AGENT_LOOP_STARTED'
  | 'AGENT_LOOP_STEP_DISPATCHED'
  | 'AGENT_LOOP_APPROVAL_DEMANDED'
  | 'AGENT_LOOP_STEP_EXECUTED'
  | 'AGENT_LOOP_VERIFIED'
  | 'AGENT_LOOP_COMMITTED'
  | 'AGENT_LOOP_STEP_COMPLETED'
  | 'AGENT_LOOP_ITERATION_COMPLETED'
  | 'AGENT_LOOP_TASK_COMPLETED'
  | 'AGENT_LOOP_USER_STOP_ABORTED'
  | 'AGENT_LOOP_FAILED'
  | 'AGENT_LOOP_SECURITY_REJECTED'
  | 'AGENT_LOOP_CONCURRENCY_CONFLICT';

// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================

export abstract class AgentLoopError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: string;

  constructor(message: string, public readonly details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
  }
}

export class AgentLoopAbortedError extends AgentLoopError {
  public readonly code = 'AGENT_LOOP_ABORTED_ERROR';
  public readonly checkpoint?: number;

  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super(message, details);
    this.checkpoint = (details?.checkpointNumber as number) ?? (details?.checkpoint as number);
  }
}

export class AgentLoopValidationError extends AgentLoopError {
  public readonly code = 'AGENT_LOOP_VALIDATION_ERROR';
}

export class AgentLoopSecurityViolationError extends AgentLoopError {
  public readonly code = 'AGENT_LOOP_SECURITY_VIOLATION';
}

export class AgentLoopConcurrencyError extends AgentLoopError {
  public readonly code = 'AGENT_LOOP_CONCURRENCY_ERROR';
}

export class AgentLoopBudgetExceededError extends AgentLoopError {
  public readonly code = 'AGENT_LOOP_BUDGET_EXCEEDED';
}

export class AgentLoopAuthorizationError extends AgentLoopError {
  public readonly code = 'AGENT_LOOP_AUTHORIZATION_ERROR';
}

export class AgentLoopExecutionError extends AgentLoopError {
  public readonly code = 'AGENT_LOOP_EXECUTION_ERROR';
}
