import type { RealityVerificationResult } from '../realityVerification/realityVerificationTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
export declare const DURABLE_COMMIT_VERSION = "4.0.0";
export declare const DURABLE_COMMIT_AUDIT_DOMAIN = "agent_durable_commit";
export declare const MAX_COMMIT_PAYLOAD_BYTES = 65536;
export declare const MAX_COMMIT_DEPTH = 10;
/**
 * Authoritative statuses for a durable commit lifecycle transition.
 */
export type DurableCommitStatus = 'COMMITTED' | 'REJECTED' | 'DUPLICATE_REJECTED' | 'STALE_REJECTED' | 'SECURITY_REJECTED' | 'USER_STOP_ABORTED';
/**
 * Contextual metadata supplied with a commit request.
 */
export interface DurableCommitContext {
    readonly tenantId?: string;
    readonly correlationId?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * Request envelope presented to DurableCommitRuntime.
 */
export interface DurableCommitRequest {
    readonly verificationResult: RealityVerificationResult;
    readonly authoritativeTask: AgentTask;
    readonly expectedTaskVersion?: number;
    readonly commitContext?: DurableCommitContext;
    readonly committedStateOverride?: Readonly<Record<string, unknown>>;
}
/**
 * Authoritative, immutable record persisted in the tenant partition.
 */
export interface DurableCommitRecord {
    readonly commitId: string;
    readonly taskId: string;
    readonly tenantId: string;
    readonly stepId: string;
    readonly executionId: string;
    readonly verificationId: string;
    readonly toolName: string;
    readonly committedState: Readonly<Record<string, unknown>>;
    readonly taskVersion: number;
    readonly status: DurableCommitStatus;
    readonly verificationProvenanceHash: string;
    readonly commitProvenanceHash: string;
    readonly committedAt: string;
}
/**
 * Structured, secret-scrubbed commit failure descriptor.
 */
export interface DurableCommitFailure {
    readonly category: string;
    readonly message: string;
    readonly details?: Readonly<Record<string, unknown>>;
}
/**
 * Sealed, deeply immutable outcome of a durable commit attempt.
 */
export interface DurableCommitResult {
    readonly commitId: string;
    readonly taskId: string;
    readonly tenantId: string;
    readonly stepId: string;
    readonly executionId: string;
    readonly verificationId: string;
    readonly status: DurableCommitStatus;
    readonly committedAt: string;
    readonly record?: DurableCommitRecord;
    readonly failure?: DurableCommitFailure;
    readonly failureReason?: string;
    readonly verificationProvenanceHash: string;
    readonly commitProvenanceHash: string;
}
/**
 * Audit event types emitted by the Durable Commit Engine.
 */
export type DurableCommitAuditEventType = 'DURABLE_COMMIT_REQUESTED' | 'DURABLE_COMMIT_COMMITTED' | 'DURABLE_COMMIT_REJECTED' | 'DURABLE_COMMIT_DUPLICATE_REJECTED' | 'DURABLE_COMMIT_STALE_REJECTED' | 'DURABLE_COMMIT_SECURITY_REJECTED' | 'DURABLE_COMMIT_USER_STOP_ABORTED' | 'DURABLE_COMMIT_TENANT_VIOLATION' | 'DURABLE_COMMIT_PERSISTENCE_FAILED';
export declare const DURABLE_COMMIT_BOUNDS: {
    readonly MAX_PAYLOAD_BYTES: 65536;
    readonly MAX_DEPTH: 10;
};
export declare abstract class DurableCommitError extends Error {
    readonly details?: Readonly<Record<string, unknown>> | undefined;
    abstract readonly code: string;
    readonly timestamp: string;
    constructor(message: string, details?: Readonly<Record<string, unknown>> | undefined);
}
export declare class DuplicateCommitError extends DurableCommitError {
    readonly code = "DUPLICATE_COMMIT_ERROR";
}
export declare class StaleTaskCommitError extends DurableCommitError {
    readonly code = "STALE_TASK_COMMIT_ERROR";
}
export declare class CrossTenantCommitError extends DurableCommitError {
    readonly code = "CROSS_TENANT_COMMIT_ERROR";
}
export declare class CommitSecurityViolationError extends DurableCommitError {
    readonly code = "COMMIT_SECURITY_VIOLATION";
}
export declare class CommitAbortedError extends DurableCommitError {
    readonly code = "COMMIT_ABORTED_ERROR";
}
export declare class CommitValidationError extends DurableCommitError {
    readonly code = "COMMIT_VALIDATION_ERROR";
}
export declare class CommitPersistenceError extends DurableCommitError {
    readonly code = "COMMIT_PERSISTENCE_ERROR";
}
