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

import type { AuthorizedActionHandoff } from '../actionProposal/actionProposalTypes.js';

export const TOOL_ADAPTER_PLANE_VERSION = '4.0.0';
export const TOOL_ADAPTER_AUDIT_DOMAIN = 'agent_tool_execution';

// Bounded execution defaults & ceilings
export const DEFAULT_EXECUTION_TIMEOUT_MS = 10000;
export const MAX_EXECUTION_TIMEOUT_MS = 60000;
export const MAX_ARG_PAYLOAD_BYTES = 65536; // 64 KB
export const MAX_RESULT_PAYLOAD_BYTES = 131072; // 128 KB
export const MAX_ARG_DEPTH = 10;

/**
 * Domain categorization for production tool adapters.
 */
export type ToolAdapterDomain = 'shop' | 'desktop' | 'robot' | 'dynamic_code';

/**
 * Execution status for tool adapter operations.
 */
export type ToolExecutionStatus =
  | 'SUCCESS'
  | 'FAILURE'
  | 'TIMED_OUT'
  | 'ABORTED'
  | 'REJECTED';

/**
 * Execution context supplied to a registered tool adapter during invocation.
 * Contains only non-sensitive execution parameters and correlation identifiers.
 */
export interface ToolAdapterContext {
  readonly taskId: string;
  readonly tenantId: string;
  readonly proposalId: string;
  readonly stepId: string;
  readonly toolName: string;
  readonly correlationId?: string;
  readonly leaseId?: string;
  readonly executionToken?: string;
  readonly timeoutMs: number;
  readonly executedAt: string;
}

/**
 * Contract implemented by every production tool adapter.
 */
export interface ToolAdapter {
  readonly toolName: string;
  readonly domain: ToolAdapterDomain;
  readonly description: string;
  readonly parametersSchema?: Readonly<Record<string, unknown>>;
  readonly enabled?: boolean;
  readonly execute: (
    args: Readonly<Record<string, unknown>>,
    context: ToolAdapterContext
  ) => Promise<unknown>;
}

/**
 * Request envelope for the Production Tool Adapter Plane.
 */
export interface ToolAdapterRequest {
  readonly handoff: AuthorizedActionHandoff;
  readonly authoritativeTask?: import('../taskLifecycle/agentTaskTypes.js').AgentTask;
  readonly correlationId?: string;
  readonly timeoutMs?: number;
}

/**
 * Canonical result produced by the Production Tool Adapter Runtime.
 * Clearly separates metadata, raw external output, sanitized output, and cryptographic provenance.
 */
export interface ToolAdapterResult {
  readonly executionId: string;
  readonly proposalId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly stepId: string;
  readonly toolName: string;
  readonly domain: ToolAdapterDomain;
  readonly status: ToolExecutionStatus;
  readonly executionDurationMs: number;
  readonly executedAt: string;
  readonly sanitizedOutput: unknown;
  readonly externalUntrusted: boolean;
  readonly handoffProvenanceHash: string;
  readonly executionProvenanceHash: string;
  readonly error?: {
    readonly code: string;
    readonly message: string;
    readonly details?: Readonly<Record<string, unknown>>;
  };
}

export type ToolAdapterExecutionResult = ToolAdapterResult;


/**
 * Audit event types emitted by the Tool Adapter Plane.
 */
export type ToolAdapterAuditEventType =
  | 'TOOL_EXECUTION_REQUESTED'
  | 'TOOL_HANDOFF_VALIDATED'
  | 'TOOL_ADAPTER_RESOLVED'
  | 'TOOL_EXECUTION_STARTED'
  | 'TOOL_EXECUTION_COMPLETED'
  | 'TOOL_EXECUTION_FAILED'
  | 'TOOL_EXECUTION_TIMED_OUT'
  | 'TOOL_USER_STOP_ABORTED'
  | 'TOOL_TENANT_VIOLATION'
  | 'TOOL_STALE_REJECTED'
  | 'TOOL_INVALID_PROVENANCE'
  | 'TOOL_UNKNOWN_ADAPTER'
  | 'TOOL_DISABLED_ADAPTER'
  | 'TOOL_GUARDRAIL_REJECTED'
  | 'TOOL_REPLAY_REJECTED';

// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================

export abstract class ToolAdapterError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: string;

  constructor(message: string, public readonly details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
  }
}

export class ToolExecutionAbortedError extends ToolAdapterError {
  public readonly code = 'TOOL_EXECUTION_ABORTED';
}

export class ToolAdapterNotFoundError extends ToolAdapterError {
  public readonly code = 'TOOL_ADAPTER_NOT_FOUND';
}

export class ToolAdapterDisabledError extends ToolAdapterError {
  public readonly code = 'TOOL_ADAPTER_DISABLED';
}

export class ToolAdapterTimeoutError extends ToolAdapterError {
  public readonly code = 'TOOL_ADAPTER_TIMEOUT';
}

export class ToolExecutionFailureError extends ToolAdapterError {
  public readonly code = 'TOOL_EXECUTION_FAILURE';
}

export class ToolHandoffValidationError extends ToolAdapterError {
  public readonly code = 'TOOL_HANDOFF_VALIDATION_ERROR';
}

export class ToolSecurityViolationError extends ToolAdapterError {
  public readonly code = 'TOOL_SECURITY_VIOLATION';
}

export class CrossTenantToolExecutionError extends ToolAdapterError {
  public readonly code = 'CROSS_TENANT_TOOL_EXECUTION_ERROR';
}

export class StaleToolExecutionError extends ToolAdapterError {
  public readonly code = 'STALE_TOOL_EXECUTION_ERROR';
}

export class ToolReplayError extends ToolAdapterError {
  public readonly code = 'TOOL_REPLAY_ERROR';
}
