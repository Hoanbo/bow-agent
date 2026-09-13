// src/core/policyPostExecution/policyPostExecutionTypes.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Canonical types, branded identifiers, lifecycle states, and DTO contracts
// for Governed Post-Execution Reconciliation, Impact Analysis, Regression Detection,
// Remediation Effectiveness, and Policy Feedback Proposals.
//
// Các kiểu canonical, định danh có thương hiệu, trạng thái vòng đời và hợp đồng DTO
// cho điều hòa sau thực thi có quản trị, phân tích tác động, phát hiện hồi quy,
// hiệu quả khắc phục và đề xuất phản hồi chính sách.
//
// STRICT INVARIANTS:
// - OBSERVATION != EVIDENCE != INVESTIGATION != DECISION != AUTHORIZATION != EXECUTION != VERIFICATION != FEEDBACK PROPOSAL != POLICY MUTATION
// - ZERO_AUTONOMOUS_POLICY_MUTATION: Proposes only; never mutates active or candidate policies directly
// - ABSOLUTE_USER_STOP_SUPREMACY: Immediate fail-closed suspension on USER_STOP
// - STRICT_TENANT_ISOLATION: Tenant-partitioned records; no cross-tenant inspection

import type {
  ExecutionId,
  ExecutionOutcomeStatus,
  ExecutionReceipt,
  ExecutionVerificationResult,
} from '../policyExecution/policyExecutionTypes.js';
import type {
  DecisionProposalId,
  RemediationRequestId,
  PolicyRemediationType,
} from '../policyDecision/policyDecisionTypes.js';
import type { PolicyCandidateId, PolicyRing } from '../policyCanary/policyCanaryTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type ReconciliationId = string & { readonly __brand: unique symbol };
export type PolicyReconciliationId = ReconciliationId;
export type ImpactAnalysisId = string & { readonly __brand: unique symbol };
export type EffectivenessAssessmentId = string & { readonly __brand: unique symbol };
export type RegressionDetectionId = string & { readonly __brand: unique symbol };
export type FeedbackProposalId = string & { readonly __brand: unique symbol };
export type PostExecutionProvenanceId = string & { readonly __brand: unique symbol };

export function createReconciliationId(val: string): ReconciliationId {
  if (!val || typeof val !== 'string' || val.trim().length === 0) {
    throw new Error('INVALID_RECONCILIATION_ID: ReconciliationId must be a non-empty string');
  }
  return val.trim() as ReconciliationId;
}
export const createPolicyReconciliationId = createReconciliationId;

export function createImpactAnalysisId(val: string): ImpactAnalysisId {
  if (!val || typeof val !== 'string' || val.trim().length === 0) {
    throw new Error('INVALID_IMPACT_ANALYSIS_ID: ImpactAnalysisId must be a non-empty string');
  }
  return val.trim() as ImpactAnalysisId;
}

export function createEffectivenessAssessmentId(val: string): EffectivenessAssessmentId {
  if (!val || typeof val !== 'string' || val.trim().length === 0) {
    throw new Error('INVALID_EFFECTIVENESS_ASSESSMENT_ID: EffectivenessAssessmentId must be a non-empty string');
  }
  return val.trim() as EffectivenessAssessmentId;
}

export function createRegressionDetectionId(val: string): RegressionDetectionId {
  if (!val || typeof val !== 'string' || val.trim().length === 0) {
    throw new Error('INVALID_REGRESSION_DETECTION_ID: RegressionDetectionId must be a non-empty string');
  }
  return val.trim() as RegressionDetectionId;
}

export function createFeedbackProposalId(val: string): FeedbackProposalId {
  if (!val || typeof val !== 'string' || val.trim().length === 0) {
    throw new Error('INVALID_FEEDBACK_PROPOSAL_ID: FeedbackProposalId must be a non-empty string');
  }
  return val.trim() as FeedbackProposalId;
}

export function createPostExecutionProvenanceId(val: string): PostExecutionProvenanceId {
  if (!val || typeof val !== 'string' || val.trim().length === 0) {
    throw new Error('INVALID_POST_EXECUTION_PROVENANCE_ID: PostExecutionProvenanceId must be a non-empty string');
  }
  return val.trim() as PostExecutionProvenanceId;
}

// ============================================================================
// CANONICAL STATUS & CLASSIFICATION UNIONS
// ============================================================================

/**
 * Reconciled execution outcome classification.
 * Phân loại kết quả thực thi đã điều hòa.
 */
export type ReconciledOutcomeStatus =
  | 'VERIFIED_SUCCESS'
  | 'VERIFIED_FAILURE'
  | 'VERIFIED_PARTIAL'
  | 'VERIFIED_BLOCKED'
  | 'VERIFIED_CANCELLED'
  | 'VERIFIED_UNKNOWN'
  | 'RECONCILIATION_DEGRADED'
  | 'RECONCILIATION_INVALID';

/**
 * Expected-vs-Actual impact classification.
 * Phân loại tác động dự kiến so với thực tế.
 */
export type ImpactClassification =
  | 'EXPECTED'
  | 'BETTER_THAN_EXPECTED'
  | 'WORSE_THAN_EXPECTED'
  | 'NO_EFFECT'
  | 'PARTIAL_EFFECT'
  | 'UNKNOWN_IMPACT'
  | 'SAFETY_REGRESSION';

/**
 * Remediation effectiveness classification.
 * Phân loại hiệu quả khắc phục.
 */
export type RemediationEffectivenessStatus =
  | 'EFFECTIVE'
  | 'PARTIALLY_EFFECTIVE'
  | 'INEFFECTIVE'
  | 'INCONCLUSIVE'
  | 'UNKNOWN';

/**
 * Types of regression or degradation detected post-execution.
 * Các loại hồi quy hoặc suy giảm được phát hiện sau thực thi.
 */
export type PolicyRegressionType =
  | 'POLICY_REGRESSION'
  | 'CANDIDATE_DEGRADATION'
  | 'REPEATED_REMEDIATION_FAILURE'
  | 'ROLLBACK_RECURRENCE'
  | 'UNEXPECTED_RING_DEGRADATION'
  | 'INTEGRITY_DETERIORATION'
  | 'TENANT_ANOMALY'
  | 'REPEATED_UNKNOWN_OUTCOMES'
  | 'SAFETY_FLOOR_VIOLATION'
  | 'NO_REGRESSION';

/**
 * Governed feedback proposal action types for future policy evolution.
 * Các loại hành động đề xuất phản hồi có quản trị cho sự tiến hóa chính sách tương lai.
 */
export type PolicyFeedbackActionType =
  | 'RETAIN_CURRENT_POLICY'
  | 'INVESTIGATE_POLICY_DRIFT'
  | 'RE_EVALUATE_CANDIDATE'
  | 'REQUEST_NEW_CANDIDATE'
  | 'REQUEST_ROLLBACK_REVIEW'
  | 'REQUEST_HUMAN_INVESTIGATION';

/**
 * Feedback proposal lifecycle state.
 * Trạng thái vòng đời đề xuất phản hồi.
 */
export type FeedbackProposalState =
  | 'PROPOSED'
  | 'ACCEPTED_FOR_REVIEW'
  | 'REJECTED'
  | 'EXPIRED';

// ============================================================================
// DTO INTERFACES
// ============================================================================

/**
 * Post-execution reconciliation result reconciling receipt and verification.
 * Kết quả điều hòa sau thực thi điều hòa biên nhận và xác minh.
 */
export interface PostExecutionReconciliationResult {
  readonly reconciliationId: ReconciliationId;
  readonly executionId: ExecutionId;
  readonly tenantPartition: string;
  readonly proposalId: DecisionProposalId;
  readonly requestId: RemediationRequestId;
  readonly candidateId?: PolicyCandidateId;
  readonly status: ReconciledOutcomeStatus;
  readonly rawOutcomeStatus: ExecutionOutcomeStatus;
  readonly discrepancies: string[];
  readonly reconciledAt: string;
  readonly provenanceHash: string;
}

/**
 * Expected vs Actual impact analysis record.
 * Bản ghi phân tích tác động dự kiến so với thực tế.
 */
export interface PostExecutionImpactAnalysis {
  readonly impactId: ImpactAnalysisId;
  readonly executionId: ExecutionId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly classification: ImpactClassification;
  readonly expectedEffect: string;
  readonly actualEffect: string;
  readonly targetRing?: PolicyRing;
  readonly observedRing?: PolicyRing;
  readonly metricsDelta: Record<string, number>;
  readonly analyzedAt: string;
}

/**
 * Policy regression or degradation detection record.
 * Bản ghi phát hiện hồi quy hoặc suy giảm chính sách.
 */
export interface PostExecutionRegressionFinding {
  readonly detectionId: RegressionDetectionId;
  readonly executionId: ExecutionId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly regressionDetected: boolean;
  readonly regressionTypes: readonly PolicyRegressionType[];
  readonly severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly details: readonly string[];
  readonly detectedAt: string;
}

/**
 * Remediation effectiveness assessment record.
 * Bản ghi đánh giá hiệu quả khắc phục.
 */
export interface PostExecutionEffectivenessResult {
  readonly assessmentId: EffectivenessAssessmentId;
  readonly executionId: ExecutionId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly status: RemediationEffectivenessStatus;
  readonly executionSuccess: boolean;
  readonly issueResolved: boolean;
  readonly rationale: string;
  readonly empiricalEvidenceCount: number;
  readonly assessedAt: string;
}

/**
 * Governed feedback proposal submitted to policy evolution pipeline.
 * Strict proposal only; does not mutate policies autonomously.
 *
 * Đề xuất phản hồi có quản trị được đệ trình cho đường ống tiến hóa chính sách.
 * Nghiêm ngặt chỉ là đề xuất; không tự ý thay đổi chính sách một cách tự động.
 */
export interface PolicyFeedbackProposal {
  readonly proposalId: FeedbackProposalId;
  readonly executionId: ExecutionId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly proposedAction: PolicyFeedbackActionType;
  readonly state: FeedbackProposalState;
  readonly rationale: string;
  readonly impactClassification: ImpactClassification;
  readonly effectivenessStatus: RemediationEffectivenessStatus;
  readonly regressionTypes: readonly PolicyRegressionType[];
  readonly isAutonomousMutation: false; // Must be strictly false / Phải nghiêm ngặt là false
  readonly proposedAt: string;
}

/**
 * Cryptographic provenance record for post-execution governance transitions.
 * Bản ghi nguồn gốc mật mã cho các chuyển đổi quản trị sau thực thi.
 */
export interface PostExecutionProvenanceRecord {
  readonly provenanceId: PostExecutionProvenanceId;
  readonly executionId: ExecutionId;
  readonly tenantPartition: string;
  readonly eventType: string;
  readonly previousHash: string;
  readonly currentHash: string;
  readonly timestamp: string;
  readonly detailsHash?: string;
}

/**
 * Master post-execution governance pipeline options.
 */
export interface PolicyPostExecutionOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}
