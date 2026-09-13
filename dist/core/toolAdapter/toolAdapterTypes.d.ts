import type { AuthorizedActionHandoff } from '../actionProposal/actionProposalTypes.js';
export declare const TOOL_ADAPTER_PLANE_VERSION = "4.0.0";
export declare const TOOL_ADAPTER_AUDIT_DOMAIN = "agent_tool_execution";
export declare const DEFAULT_EXECUTION_TIMEOUT_MS = 10000;
export declare const MAX_EXECUTION_TIMEOUT_MS = 60000;
export declare const MAX_ARG_PAYLOAD_BYTES = 65536;
export declare const MAX_RESULT_PAYLOAD_BYTES = 131072;
export declare const MAX_ARG_DEPTH = 10;
/**
 * Domain categorization for production tool adapters.
 */
export type ToolAdapterDomain = 'shop' | 'desktop' | 'robot' | 'dynamic_code';
/**
 * Execution status for tool adapter operations.
 */
export type ToolExecutionStatus = 'SUCCESS' | 'FAILURE' | 'TIMED_OUT' | 'ABORTED' | 'REJECTED';
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
    readonly execute: (args: Readonly<Record<string, unknown>>, context: ToolAdapterContext) => Promise<unknown>;
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
export type ToolAdapterAuditEventType = 'TOOL_EXECUTION_REQUESTED' | 'TOOL_HANDOFF_VALIDATED' | 'TOOL_ADAPTER_RESOLVED' | 'TOOL_EXECUTION_STARTED' | 'TOOL_EXECUTION_COMPLETED' | 'TOOL_EXECUTION_FAILED' | 'TOOL_EXECUTION_TIMED_OUT' | 'TOOL_USER_STOP_ABORTED' | 'TOOL_TENANT_VIOLATION' | 'TOOL_STALE_REJECTED' | 'TOOL_INVALID_PROVENANCE' | 'TOOL_UNKNOWN_ADAPTER' | 'TOOL_DISABLED_ADAPTER' | 'TOOL_GUARDRAIL_REJECTED' | 'TOOL_REPLAY_REJECTED';
export declare abstract class ToolAdapterError extends Error {
    readonly details?: Readonly<Record<string, unknown>> | undefined;
    abstract readonly code: string;
    readonly timestamp: string;
    constructor(message: string, details?: Readonly<Record<string, unknown>> | undefined);
}
export declare class ToolExecutionAbortedError extends ToolAdapterError {
    readonly code = "TOOL_EXECUTION_ABORTED";
}
export declare class ToolAdapterNotFoundError extends ToolAdapterError {
    readonly code = "TOOL_ADAPTER_NOT_FOUND";
}
export declare class ToolAdapterDisabledError extends ToolAdapterError {
    readonly code = "TOOL_ADAPTER_DISABLED";
}
export declare class ToolAdapterTimeoutError extends ToolAdapterError {
    readonly code = "TOOL_ADAPTER_TIMEOUT";
}
export declare class ToolExecutionFailureError extends ToolAdapterError {
    readonly code = "TOOL_EXECUTION_FAILURE";
}
export declare class ToolHandoffValidationError extends ToolAdapterError {
    readonly code = "TOOL_HANDOFF_VALIDATION_ERROR";
}
export declare class ToolSecurityViolationError extends ToolAdapterError {
    readonly code = "TOOL_SECURITY_VIOLATION";
}
export declare class CrossTenantToolExecutionError extends ToolAdapterError {
    readonly code = "CROSS_TENANT_TOOL_EXECUTION_ERROR";
}
export declare class StaleToolExecutionError extends ToolAdapterError {
    readonly code = "STALE_TOOL_EXECUTION_ERROR";
}
export declare class ToolReplayError extends ToolAdapterError {
    readonly code = "TOOL_REPLAY_ERROR";
}
