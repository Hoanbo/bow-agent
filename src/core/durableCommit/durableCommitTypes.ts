// src/core/durableCommit/durableCommitTypes.ts
// BOWCON V4.0 — MS-1.4.08: DURABLE COMMIT ENGINE TYPES
//
// EN:
// Authoritative type definitions, contracts, and error taxonomy for the Durable Commit Engine.
// Enforces the strict governance boundary where only verified empirical reality produced by
// MS-1.4.07 can be committed to durable, crash-safe, immutable internal state.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền, hợp đồng và phân loại lỗi cho Động cơ Commit Bền vững.
// Thực thi ranh giới quản trị nghiêm ngặt, nơi chỉ thực tế kinh nghiệm đã xác minh bởi MS-1.4.07
// mới được commit vào trạng thái nội bộ bất biến, an toàn sau sự cố và bền vững.
//
// Invariants:
// COGNITION != AUTHORIZATION
// PLAN != EXECUTION
// LLM_OUTPUT != AUTHORITY
// PROPOSAL != AUTHORIZATION
// AUTHORIZATION != EXECUTION
// PEP != TOOL
// TOOL_OUTPUT != REALITY_PROOF
// REALITY_VERIFICATION != DURABLE_COMMIT
// TOOL_OUTPUT != REALITY_PROOF != DURABLE_COMMIT
// USER_STOP > ALL_COMMIT
// HUMAN_AUTHORITY > AGENT
// FAIL_CLOSED > FAIL_OPEN

import type { RealityVerificationResult } from '../realityVerification/realityVerificationTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';

export const DURABLE_COMMIT_VERSION = '4.0.0';
export const DURABLE_COMMIT_AUDIT_DOMAIN = 'agent_durable_commit';

export const MAX_COMMIT_PAYLOAD_BYTES = 65536; // 64 KB
export const MAX_COMMIT_DEPTH = 10;

/**
 * Authoritative statuses for a durable commit lifecycle transition.
 */
export type DurableCommitStatus =
  | 'COMMITTED'
  | 'REJECTED'
  | 'DUPLICATE_REJECTED'
  | 'STALE_REJECTED'
  | 'SECURITY_REJECTED'
  | 'USER_STOP_ABORTED';

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
export type DurableCommitAuditEventType =
  | 'DURABLE_COMMIT_REQUESTED'
  | 'DURABLE_COMMIT_COMMITTED'
  | 'DURABLE_COMMIT_REJECTED'
  | 'DURABLE_COMMIT_DUPLICATE_REJECTED'
  | 'DURABLE_COMMIT_STALE_REJECTED'
  | 'DURABLE_COMMIT_SECURITY_REJECTED'
  | 'DURABLE_COMMIT_USER_STOP_ABORTED'
  | 'DURABLE_COMMIT_TENANT_VIOLATION'
  | 'DURABLE_COMMIT_PERSISTENCE_FAILED';

export const DURABLE_COMMIT_BOUNDS = {
  MAX_PAYLOAD_BYTES: MAX_COMMIT_PAYLOAD_BYTES,
  MAX_DEPTH: MAX_COMMIT_DEPTH,
} as const;

// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================

export abstract class DurableCommitError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: string;

  constructor(message: string, public readonly details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
  }
}

export class DuplicateCommitError extends DurableCommitError {
  public readonly code = 'DUPLICATE_COMMIT_ERROR';
}

export class StaleTaskCommitError extends DurableCommitError {
  public readonly code = 'STALE_TASK_COMMIT_ERROR';
}

export class CrossTenantCommitError extends DurableCommitError {
  public readonly code = 'CROSS_TENANT_COMMIT_ERROR';
}

export class CommitSecurityViolationError extends DurableCommitError {
  public readonly code = 'COMMIT_SECURITY_VIOLATION';
}

export class CommitAbortedError extends DurableCommitError {
  public readonly code = 'COMMIT_ABORTED_ERROR';
}

export class CommitValidationError extends DurableCommitError {
  public readonly code = 'COMMIT_VALIDATION_ERROR';
}

export class CommitPersistenceError extends DurableCommitError {
  public readonly code = 'COMMIT_PERSISTENCE_ERROR';
}
