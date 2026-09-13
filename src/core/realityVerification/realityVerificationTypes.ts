// src/core/realityVerification/realityVerificationTypes.ts
// BOWCON V4.0 — MS-1.4.07: EMPIRICAL REALITY VERIFICATION ENGINE TYPES
//
// EN:
// Authoritative type definitions, contracts, and error taxonomy for the Reality Verification Engine.
// Evaluates whether an authorized, executed tool operation genuinely produced observable real-world
// state transitions satisfying intended postcondition invariants.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền, hợp đồng và phân loại lỗi cho Động cơ Xác minh Thực tế.
// Đánh giá xem một thao tác công cụ đã được ủy quyền và thực thi có thực sự tạo ra các biến đổi trạng thái
// thế giới thực quan sát được thỏa mãn các bất biến điều kiện sau (postcondition) dự kiến hay không.
//
// Invariants:
// COGNITION != AUTHORIZATION
// PLAN != EXECUTION
// LLM_OUTPUT != AUTHORITY
// PROPOSAL != AUTHORIZATION
// AUTHORIZATION != EXECUTION
// PEP != TOOL
// TOOL_OUTPUT != REALITY_PROOF
// REALITY_VERIFICATION != EXECUTION
// USER_STOP > ALL_VERIFICATION
// HUMAN_AUTHORITY > AGENT
// FAIL_CLOSED > FAIL_OPEN

import type { ToolAdapterResult } from '../toolAdapter/toolAdapterTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { Postcondition, PostconditionResult } from '../verification/postconditionTypes.js';

export const REALITY_VERIFICATION_VERSION = '4.0.0';
export const REALITY_VERIFICATION_AUDIT_DOMAIN = 'agent_reality_verification';

export const MAX_EVIDENCE_PAYLOAD_BYTES = 65536; // 64 KB
export const MAX_EVIDENCE_DEPTH = 10;
export const DEFAULT_MAX_EVIDENCE_AGE_MS = 60000; // 1 minute

/**
 * Authoritative reality verification status states.
 */
export type RealityVerificationStatus =
  | 'VERIFIED'
  | 'NOT_VERIFIED'
  | 'PENDING_VERIFICATION'
  | 'UNKNOWN'
  | 'CONTRADICTORY'
  | 'STALE'
  | 'SECURITY_REJECTED';

export type VerificationStatus = RealityVerificationStatus;

/**
 * Actionable recommendation produced by the verification engine.
 * Advisory only; RETRY_RECOMMENDED must NEVER cause autonomous retry loops.
 */
export type VerificationRecommendation =
  | 'NONE'
  | 'RETRY_RECOMMENDED'
  | 'CLARIFICATION_REQUIRED'
  | 'MANUAL_INSPECTION'
  | 'ABORT';

/**
 * Source classification for reality evidence items.
 */
export type RealityEvidenceSource =
  | 'READ_AFTER_WRITE'
  | 'ADAPTER_OBSERVATION'
  | 'SYSTEM_PROBE'
  | 'CONTEXT_SNAPSHOT';

/**
 * Structured, immutable empirical evidence item.
 */
export interface RealityEvidence {
  readonly evidenceId: string;
  readonly source: RealityEvidenceSource;
  readonly path: string;
  readonly observedValue: unknown;
  readonly expectedValue?: unknown;
  readonly matched: boolean;
  readonly timestamp: string;
  readonly confidence: number; // Normalized 0.0 to 1.0
  readonly tenantId: string;
  readonly taskId: string;
  readonly executionId: string;
  readonly evidenceHash: string; // SHA-256
}

/**
 * Request submitted to RealityVerificationRuntime.
 */
export interface RealityVerificationRequest {
  readonly executionResult: ToolAdapterResult;
  readonly postconditions?: readonly Postcondition[];
  readonly expectedOutcome?: string;
  readonly expectedTaskVersion: number;
  readonly authoritativeTask?: AgentTask;
  readonly externalEvidence?: readonly RealityEvidence[];
  readonly correlationId?: string;
  readonly maxEvidenceAgeMs?: number;
  readonly allowPendingVerification?: boolean;
}

/**
 * Aggregate summary of postcondition invariant evaluations.
 */
export interface RealityVerificationSummary {
  readonly totalInvariants: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly unknownCount: number;
  readonly conflictingCount: number;
  readonly allRequiredPassed: boolean;
}

/**
 * Structured, secret-scrubbed verification failure descriptor.
 */
export interface RealityVerificationFailure {
  readonly category: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Sealed, deeply immutable reality verification outcome.
 * Only results with status === 'VERIFIED' may be consumed by MS-1.4.08 for durable commit.
 */
export interface RealityVerificationResult {
  readonly verificationId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly stepId: string;
  readonly executionId: string;
  readonly toolName: string;
  readonly status: RealityVerificationStatus;
  readonly confidence: number;
  readonly postconditionResults: readonly PostconditionResult[];
  readonly evidence: readonly RealityEvidence[];
  readonly summary: RealityVerificationSummary;
  readonly failure?: RealityVerificationFailure;
  readonly recommendation: VerificationRecommendation;
  readonly executionProvenanceHash: string;
  readonly verificationProvenanceHash: string;
  readonly verifiedAt: string;
}

/**
 * Audit event types emitted by the Reality Verification Engine.
 */
export type RealityVerificationAuditEventType =
  | 'REALITY_VERIFICATION_REQUESTED'
  | 'REALITY_EVIDENCE_COLLECTED'
  | 'REALITY_VERIFICATION_PASSED'
  | 'REALITY_VERIFICATION_FAILED'
  | 'REALITY_VERIFICATION_UNKNOWN'
  | 'REALITY_VERIFICATION_CONTRADICTORY'
  | 'REALITY_VERIFICATION_STALE'
  | 'REALITY_USER_STOP_ABORTED'
  | 'REALITY_SECURITY_VIOLATION'
  | 'REALITY_TENANT_VIOLATION';

// ============================================================================
// COMPATIBILITY ALIASES & EXPORTS
// ============================================================================

export type EvidenceSource = RealityEvidenceSource;
export type VerificationRequest = RealityVerificationRequest;
export type VerificationFailure = RealityVerificationFailure;
export type RealityVerificationRecommendation = VerificationRecommendation;

export interface EvidenceIntegrity {
  readonly evidenceHash: string;
  readonly matched: boolean;
  readonly confidence: number;
}

export interface VerificationContext {
  readonly taskId: string;
  readonly tenantId: string;
  readonly stepId: string;
  readonly executionId: string;
}

export const REALITY_VERIFICATION_BOUNDS = {
  MAX_PAYLOAD_BYTES: MAX_EVIDENCE_PAYLOAD_BYTES,
  MAX_DEPTH: MAX_EVIDENCE_DEPTH,
  DEFAULT_MAX_AGE_MS: DEFAULT_MAX_EVIDENCE_AGE_MS,
} as const;

// ============================================================================
// TYPED ERROR HIERARCHY
// ============================================================================

export abstract class RealityVerificationError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: string;

  constructor(message: string, public readonly details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
  }
}

export class VerificationAbortedError extends RealityVerificationError {
  public readonly code = 'VERIFICATION_ABORTED';
}

export class VerificationValidationError extends RealityVerificationError {
  public readonly code = 'VERIFICATION_VALIDATION_ERROR';
}

export class CrossTenantVerificationError extends RealityVerificationError {
  public readonly code = 'CROSS_TENANT_VERIFICATION_ERROR';
}

export class StaleTaskVerificationError extends RealityVerificationError {
  public readonly code = 'STALE_TASK_VERIFICATION_ERROR';
}

export class ContradictoryEvidenceError extends RealityVerificationError {
  public readonly code = 'CONTRADICTORY_EVIDENCE_ERROR';
}

export class VerificationSecurityViolationError extends RealityVerificationError {
  public readonly code = 'VERIFICATION_SECURITY_VIOLATION';
}

// Aliases matching prompt specifications
export type VerificationError = RealityVerificationError;
export type VerificationSecurityError = VerificationSecurityViolationError;
export type VerificationTenantMismatchError = CrossTenantVerificationError;
export type VerificationStaleError = StaleTaskVerificationError;
export type VerificationMalformedError = VerificationValidationError;
