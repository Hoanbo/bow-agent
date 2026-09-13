// src/core/episodicMemory/episodicMemoryTypes.ts
// BOWCON V4.0 — MS-1.4.09: EPISODIC MEMORY & SYNTHESIS TYPES
//
// EN:
// Authoritative type definitions, contracts, and error taxonomy for Episodic Memory & Synthesis.
// Enforces the strict governance invariant:
// TOOL_OUTPUT != REALITY_PROOF != DURABLE_COMMIT != MEMORY.
// Only durably committed records (status === 'COMMITTED') produced by MS-1.4.08 can become
// authoritative episodic memory. Memory and synthesis never possess execution or policy authority.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền, hợp đồng và phân loại lỗi cho Bộ nhớ Episodic & Tổng hợp.
// Thực thi bất biến quản trị nghiêm ngặt:
// TOOL_OUTPUT != REALITY_PROOF != DURABLE_COMMIT != MEMORY.
// Chỉ các bản ghi đã commit bền vững (status === 'COMMITTED') bởi MS-1.4.08 mới trở thành bộ nhớ episodic có thẩm quyền.

import type { DurableCommitRecord } from '../durableCommit/durableCommitTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';

export const EPISODIC_MEMORY_VERSION = '4.0.0';
export const EPISODIC_MEMORY_AUDIT_DOMAIN = 'agent_episodic_memory';

export const MAX_MEMORY_PAYLOAD_BYTES = 65536; // 64 KB
export const MAX_MEMORY_DEPTH = 10;

/**
 * Authoritative statuses for an episodic memory lifecycle transition.
 */
export type EpisodicMemoryStatus =
  | 'RECORDED'
  | 'SYNTHESIZED'
  | 'REJECTED'
  | 'DUPLICATE_REJECTED'
  | 'SECURITY_REJECTED'
  | 'USER_STOP_ABORTED';

/**
 * Contextual metadata supplied with an episodic memory ingestion request.
 */
export interface EpisodicMemoryContext {
  readonly tenantId?: string;
  readonly correlationId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Request envelope presented to EpisodicMemoryRuntime.
 */
export interface EpisodicMemoryRequest {
  readonly commitRecord: DurableCommitRecord;
  readonly authoritativeTask: AgentTask;
  readonly expectedTaskVersion?: number;
  readonly context?: EpisodicMemoryContext;
  readonly synthesizeLessons?: boolean;
}

/**
 * Structured, immutable episodic memory record stored in the tenant partition.
 */
export interface EpisodicMemoryRecord {
  readonly memoryId: string;
  readonly commitId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly stepId: string;
  readonly executionId: string;
  readonly verificationId: string;
  readonly toolName: string;
  readonly stateDelta: Readonly<Record<string, unknown>>;
  readonly taskVersion: number;
  readonly status: EpisodicMemoryStatus;
  readonly commitProvenanceHash: string;
  readonly memoryProvenanceHash: string;
  readonly recordedAt: string;
}

/**
 * Deterministic derived lesson derived from verified evidence.
 */
export interface EpisodicLesson {
  readonly lessonId: string;
  readonly category: string;
  readonly insight: string;
  readonly confidence: number;
  readonly sourceCommitId: string;
  readonly verifiedFact: boolean;
}

/**
 * Pure deterministic synthesis produced from authoritative historical evidence.
 */
export interface EpisodicMemorySynthesis {
  readonly synthesisId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly summary: string;
  readonly causalLinks: readonly string[];
  readonly lessons: readonly EpisodicLesson[];
  readonly generatedAt: string;
  readonly synthesisHash: string;
}

/**
 * Structured, secret-scrubbed memory failure descriptor.
 */
export interface EpisodicMemoryFailure {
  readonly category: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Sealed, deeply immutable outcome of an episodic memory ingestion & synthesis attempt.
 */
export interface EpisodicMemoryResult {
  readonly memoryId: string;
  readonly commitId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly status: EpisodicMemoryStatus;
  readonly recordedAt: string;
  readonly record?: EpisodicMemoryRecord;
  readonly synthesis?: EpisodicMemorySynthesis;
  readonly failure?: EpisodicMemoryFailure;
  readonly failureReason?: string;
  readonly memoryProvenanceHash: string;
}

/**
 * Audit event types emitted by the Episodic Memory Subsystem.
 */
export type EpisodicMemoryAuditEventType =
  | 'EPISODIC_MEMORY_REQUESTED'
  | 'EPISODIC_MEMORY_RECORDED'
  | 'EPISODIC_MEMORY_SYNTHESIZED'
  | 'EPISODIC_MEMORY_REJECTED'
  | 'EPISODIC_MEMORY_DUPLICATE_REJECTED'
  | 'EPISODIC_MEMORY_SECURITY_REJECTED'
  | 'EPISODIC_MEMORY_USER_STOP_ABORTED'
  | 'EPISODIC_MEMORY_TENANT_VIOLATION'
  | 'EPISODIC_MEMORY_PERSISTENCE_FAILED';

export const EPISODIC_MEMORY_BOUNDS = {
  MAX_PAYLOAD_BYTES: MAX_MEMORY_PAYLOAD_BYTES,
  MAX_DEPTH: MAX_MEMORY_DEPTH,
} as const;

// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================

export abstract class EpisodicMemoryError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: string;

  constructor(message: string, public readonly details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
  }
}

export class DuplicateMemoryError extends EpisodicMemoryError {
  public readonly code = 'DUPLICATE_MEMORY_ERROR';
}

export class CrossTenantMemoryError extends EpisodicMemoryError {
  public readonly code = 'CROSS_TENANT_MEMORY_ERROR';
}

export class MemorySecurityViolationError extends EpisodicMemoryError {
  public readonly code = 'MEMORY_SECURITY_VIOLATION';
}

export class MemoryAbortedError extends EpisodicMemoryError {
  public readonly code = 'MEMORY_ABORTED_ERROR';
}

export class MemoryValidationError extends EpisodicMemoryError {
  public readonly code = 'MEMORY_VALIDATION_ERROR';
}

export class MemoryPersistenceError extends EpisodicMemoryError {
  public readonly code = 'MEMORY_PERSISTENCE_ERROR';
}
