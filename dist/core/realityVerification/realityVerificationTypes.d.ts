import type { ToolAdapterResult } from '../toolAdapter/toolAdapterTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { Postcondition, PostconditionResult } from '../verification/postconditionTypes.js';
export declare const REALITY_VERIFICATION_VERSION = "4.0.0";
export declare const REALITY_VERIFICATION_AUDIT_DOMAIN = "agent_reality_verification";
export declare const MAX_EVIDENCE_PAYLOAD_BYTES = 65536;
export declare const MAX_EVIDENCE_DEPTH = 10;
export declare const DEFAULT_MAX_EVIDENCE_AGE_MS = 60000;
/**
 * Authoritative reality verification status states.
 */
export type RealityVerificationStatus = 'VERIFIED' | 'NOT_VERIFIED' | 'PENDING_VERIFICATION' | 'UNKNOWN' | 'CONTRADICTORY' | 'STALE' | 'SECURITY_REJECTED';
export type VerificationStatus = RealityVerificationStatus;
/**
 * Actionable recommendation produced by the verification engine.
 * Advisory only; RETRY_RECOMMENDED must NEVER cause autonomous retry loops.
 */
export type VerificationRecommendation = 'NONE' | 'RETRY_RECOMMENDED' | 'CLARIFICATION_REQUIRED' | 'MANUAL_INSPECTION' | 'ABORT';
/**
 * Source classification for reality evidence items.
 */
export type RealityEvidenceSource = 'READ_AFTER_WRITE' | 'ADAPTER_OBSERVATION' | 'SYSTEM_PROBE' | 'CONTEXT_SNAPSHOT';
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
    readonly confidence: number;
    readonly tenantId: string;
    readonly taskId: string;
    readonly executionId: string;
    readonly evidenceHash: string;
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
export type RealityVerificationAuditEventType = 'REALITY_VERIFICATION_REQUESTED' | 'REALITY_EVIDENCE_COLLECTED' | 'REALITY_VERIFICATION_PASSED' | 'REALITY_VERIFICATION_FAILED' | 'REALITY_VERIFICATION_UNKNOWN' | 'REALITY_VERIFICATION_CONTRADICTORY' | 'REALITY_VERIFICATION_STALE' | 'REALITY_USER_STOP_ABORTED' | 'REALITY_SECURITY_VIOLATION' | 'REALITY_TENANT_VIOLATION';
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
export declare const REALITY_VERIFICATION_BOUNDS: {
    readonly MAX_PAYLOAD_BYTES: 65536;
    readonly MAX_DEPTH: 10;
    readonly DEFAULT_MAX_AGE_MS: 60000;
};
export declare abstract class RealityVerificationError extends Error {
    readonly details?: Readonly<Record<string, unknown>> | undefined;
    abstract readonly code: string;
    readonly timestamp: string;
    constructor(message: string, details?: Readonly<Record<string, unknown>> | undefined);
}
export declare class VerificationAbortedError extends RealityVerificationError {
    readonly code = "VERIFICATION_ABORTED";
}
export declare class VerificationValidationError extends RealityVerificationError {
    readonly code = "VERIFICATION_VALIDATION_ERROR";
}
export declare class CrossTenantVerificationError extends RealityVerificationError {
    readonly code = "CROSS_TENANT_VERIFICATION_ERROR";
}
export declare class StaleTaskVerificationError extends RealityVerificationError {
    readonly code = "STALE_TASK_VERIFICATION_ERROR";
}
export declare class ContradictoryEvidenceError extends RealityVerificationError {
    readonly code = "CONTRADICTORY_EVIDENCE_ERROR";
}
export declare class VerificationSecurityViolationError extends RealityVerificationError {
    readonly code = "VERIFICATION_SECURITY_VIOLATION";
}
export type VerificationError = RealityVerificationError;
export type VerificationSecurityError = VerificationSecurityViolationError;
export type VerificationTenantMismatchError = CrossTenantVerificationError;
export type VerificationStaleError = StaleTaskVerificationError;
export type VerificationMalformedError = VerificationValidationError;
