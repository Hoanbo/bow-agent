import type { DurableCommitRecord } from '../durableCommit/durableCommitTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
export declare const EPISODIC_MEMORY_VERSION = "4.0.0";
export declare const EPISODIC_MEMORY_AUDIT_DOMAIN = "agent_episodic_memory";
export declare const MAX_MEMORY_PAYLOAD_BYTES = 65536;
export declare const MAX_MEMORY_DEPTH = 10;
/**
 * Authoritative statuses for an episodic memory lifecycle transition.
 */
export type EpisodicMemoryStatus = 'RECORDED' | 'SYNTHESIZED' | 'REJECTED' | 'DUPLICATE_REJECTED' | 'SECURITY_REJECTED' | 'USER_STOP_ABORTED';
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
export type EpisodicMemoryAuditEventType = 'EPISODIC_MEMORY_REQUESTED' | 'EPISODIC_MEMORY_RECORDED' | 'EPISODIC_MEMORY_SYNTHESIZED' | 'EPISODIC_MEMORY_REJECTED' | 'EPISODIC_MEMORY_DUPLICATE_REJECTED' | 'EPISODIC_MEMORY_SECURITY_REJECTED' | 'EPISODIC_MEMORY_USER_STOP_ABORTED' | 'EPISODIC_MEMORY_TENANT_VIOLATION' | 'EPISODIC_MEMORY_PERSISTENCE_FAILED';
export declare const EPISODIC_MEMORY_BOUNDS: {
    readonly MAX_PAYLOAD_BYTES: 65536;
    readonly MAX_DEPTH: 10;
};
export declare abstract class EpisodicMemoryError extends Error {
    readonly details?: Readonly<Record<string, unknown>> | undefined;
    abstract readonly code: string;
    readonly timestamp: string;
    constructor(message: string, details?: Readonly<Record<string, unknown>> | undefined);
}
export declare class DuplicateMemoryError extends EpisodicMemoryError {
    readonly code = "DUPLICATE_MEMORY_ERROR";
}
export declare class CrossTenantMemoryError extends EpisodicMemoryError {
    readonly code = "CROSS_TENANT_MEMORY_ERROR";
}
export declare class MemorySecurityViolationError extends EpisodicMemoryError {
    readonly code = "MEMORY_SECURITY_VIOLATION";
}
export declare class MemoryAbortedError extends EpisodicMemoryError {
    readonly code = "MEMORY_ABORTED_ERROR";
}
export declare class MemoryValidationError extends EpisodicMemoryError {
    readonly code = "MEMORY_VALIDATION_ERROR";
}
export declare class MemoryPersistenceError extends EpisodicMemoryError {
    readonly code = "MEMORY_PERSISTENCE_ERROR";
}
