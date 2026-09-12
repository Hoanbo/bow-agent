// src/core/policyDecision/policyDecisionTypes.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Canonical strongly-typed contracts for the governed policy decision and controlled remediation layer:
// branded identifiers, proposal state machine, remediation state machine, authorization tokens,
// remediation plans, execution envelopes, and audit event types.
// Strictly governed. Zero autonomous authority.
//
// Hợp đồng kiểu TypeScript chuẩn tắc cho lớp quyết định chính sách và khắc phục có kiểm soát:
// định danh có thương hiệu, máy trạng thái đề xuất, máy trạng thái khắc phục, token ủy quyền,
// kế hoạch khắc phục, phong bì thực thi và các loại sự kiện kiểm toán.
// Hoàn toàn có quản trị. Không có thẩm quyền tự động.
//
// Authority Invariants:
// - OBSERVATION != RECOMMENDATION
// - RECOMMENDATION != DECISION
// - DECISION != AUTHORIZATION
// - AUTHORIZATION != EXECUTION
// - ZERO_AUTONOMOUS_PROMOTION
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_ROLLBACK
// - ZERO_AUTONOMOUS_CIRCUIT_BREAKER_RESET
// - USER_STOP > ALL_DECISION_AND_REMEDIATION_OPERATIONS
// - HARD_FORBIDDEN_ACTIONS_PERMANENTLY_IMMUTABLE

import type {
  PolicyCandidateId,
  PolicyRing,
  PolicyCanaryFailureReason,
} from '../policyCanary/policyCanaryTypes.js';
import type {
  PolicyEvidenceId,
} from '../policyObservability/policyObservabilityTypes.js';
import type {
  PolicyLifecycleTraceId,
  EvidenceIntegrityStatus,
} from '../policyEvidence/policyEvidenceQueryTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// CÁC ĐỊNH DANH ĐƯỢC GẮN NHÃN (BRANDED)
// ============================================================================

export type DecisionId = string & { readonly __brand: unique symbol };
export type DecisionProposalId = string & { readonly __brand: unique symbol };
export type RemediationRequestId = string & { readonly __brand: unique symbol };
export type DecisionProvenanceId = string & { readonly __brand: unique symbol };

/**
 * Creates and validates a branded DecisionId.
 * Tạo và xác thực DecisionId có thương hiệu.
 */
export function createDecisionId(raw: string): DecisionId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_DECISION_ID: Decision ID must be a non-empty string');
  }
  return raw.trim() as DecisionId;
}

/**
 * Creates and validates a branded DecisionProposalId.
 * Tạo và xác thực DecisionProposalId có thương hiệu.
 */
export function createDecisionProposalId(raw: string): DecisionProposalId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_DECISION_PROPOSAL_ID: Decision Proposal ID must be a non-empty string');
  }
  return raw.trim() as DecisionProposalId;
}

/**
 * Creates and validates a branded RemediationRequestId.
 * Tạo và xác thực RemediationRequestId có thương hiệu.
 */
export function createRemediationRequestId(raw: string): RemediationRequestId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_REMEDIATION_REQUEST_ID: Remediation Request ID must be a non-empty string');
  }
  return raw.trim() as RemediationRequestId;
}

/**
 * Creates and validates a branded DecisionProvenanceId.
 * Tạo và xác thực DecisionProvenanceId có thương hiệu.
 */
export function createDecisionProvenanceId(raw: string): DecisionProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_DECISION_PROVENANCE_ID: Decision Provenance ID must be a non-empty string');
  }
  return raw.trim() as DecisionProvenanceId;
}

// ============================================================================
// STATE MACHINES & ENUMS
// CÁC MÁY TRẠNG THÁI VÀ ENUM
// ============================================================================

/**
 * Proposal lifecycle state machine.
 * DRAFT -> PROPOSED -> PENDING_HUMAN_REVIEW -> APPROVED | REJECTED | EXPIRED | CANCELLED
 *
 * Máy trạng thái vòng đời đề xuất quyết định.
 */
export type ProposalLifecycleState =
  | 'DRAFT'
  | 'PROPOSED'
  | 'PENDING_HUMAN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

/**
 * Remediation lifecycle state machine.
 * NONE -> PLANNED -> AUTHORIZATION_REQUIRED -> AUTHORIZED -> EXECUTION_PENDING -> EXECUTED | BLOCKED | CANCELLED | EXPIRED | FAILED
 *
 * Máy trạng thái vòng đời hành động khắc phục có kiểm soát.
 */
export type RemediationLifecycleState =
  | 'NONE'
  | 'PLANNED'
  | 'AUTHORIZATION_REQUIRED'
  | 'AUTHORIZED'
  | 'EXECUTION_PENDING'
  | 'EXECUTED'
  | 'BLOCKED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED';

export type PolicyRemediationLifecycleState = RemediationLifecycleState;

/**
 * Remediation recommendation type generated from verified evidence.
 * Loại khuyến nghị khắc phục được tạo từ bằng chứng đã xác minh.
 */
export type PolicyRemediationType =
  | 'HOLD_CANARY'
  | 'ROLLBACK_TO_BASELINE'
  | 'ISOLATE_TENANT_COHORT'
  | 'CALIBRATE_GUARDRAIL'
  | 'RESET_STALE_CANDIDATE'
  | 'QUARANTINE_BROKEN_PROVENANCE'
  | 'BLOCK_POLICY_CANDIDATE'
  | 'PROCEED_TO_NEXT_RING_REVIEW';

/**
 * Blast radius classification for a remediation plan.
 * Phân loại bán kính ảnh hưởng cho kế hoạch khắc phục.
 */
export type RemediationBlastRadius =
  | 'TENANT_LOCAL'
  | 'COHORT_CANARY'
  | 'RING_WIDE'
  | 'GLOBAL';

/**
 * Decision rejection reason codes.
 * Mã lý do từ chối quyết định.
 */
export type DecisionRejectionReason =
  | 'OPERATOR_REJECTED'
  | 'SAFETY_RISK_EXCESSIVE'
  | 'COUNTERFACTUAL_FAILURE'
  | 'BLAST_RADIUS_UNACCEPTABLE'
  | 'STALE_FINDINGS'
  | 'PROPOSAL_SUPERSEDED'
  | 'HARD_FORBIDDEN_RESTRICTION';

/**
 * Proposal expiration reason codes.
 * Mã lý do hết hạn của đề xuất.
 */
export type ProposalExpirationReason =
  | 'REVIEW_TIMEOUT'
  | 'EVIDENCE_STALENESS_EXCEEDED'
  | 'ACTIVE_BASELINE_SHIFTED'
  | 'USER_STOP_CANCELLED';

// ============================================================================
// DTO CONTRACTS
// CÁC HỢP ĐỒNG DTO
// ============================================================================

/**
 * Evidence linkage contract binding a decision proposal to verified investigation findings.
 * Hợp đồng liên kết bằng chứng ràng buộc một đề xuất quyết định với các phát hiện điều tra đã xác minh.
 */
export interface DecisionEvidenceLinkage {
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly candidatePolicyVersion: string;
  readonly traceId?: PolicyLifecycleTraceId;
  readonly evidenceIds: readonly PolicyEvidenceId[];
  readonly integrityStatus: EvidenceIntegrityStatus;
  readonly provenanceHeadHash?: string;
  readonly evidenceTimestamp: string;
  readonly verifiedAt: string;
}

/**
 * Governed policy decision proposal submitted for human review.
 * Đề xuất quyết định chính sách có quản trị được gửi để con người xem xét.
 */
export interface PolicyDecisionProposal {
  readonly proposalId: DecisionProposalId;
  readonly decisionId: DecisionId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly state: ProposalLifecycleState;
  readonly recommendation: PolicyRemediationType;
  readonly rationale: string;
  readonly evidenceLinkage: DecisionEvidenceLinkage;
  readonly requiresHumanAuthorization: boolean;
  readonly proposedAt: string;
  readonly expiresAt: string;
  readonly rejectionReason?: DecisionRejectionReason;
  readonly expirationReason?: ProposalExpirationReason;
  readonly reviewedBy?: string;
  readonly reviewedAt?: string;
}

/**
 * Governed remediation plan derived deterministically from a decision proposal.
 * Kế hoạch khắc phục có quản trị được rút ra có tính xác định từ đề xuất quyết định.
 */
export interface PolicyRemediationPlan {
  readonly planId: string;
  readonly proposalId: DecisionProposalId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly remediationType: PolicyRemediationType;
  readonly blastRadius: RemediationBlastRadius;
  readonly targetRing?: PolicyRing;
  readonly targetPolicyVersion?: string;
  readonly requiredOperatorRole: 'MASTER_HUMAN_OPERATOR' | 'GOVERNED_OPERATOR';
  readonly proposedActions: readonly string[];
  readonly safetyPreconditions: readonly string[];
  readonly plannedAt: string;
  readonly explainableSummary: string;
}

/**
 * Scoped cryptographic human authorization token for controlled remediation.
 * Mã ủy quyền mật mã của con người có phạm vi cho hành động khắc phục có kiểm soát.
 */
export interface PolicyDecisionAuthorizationToken {
  readonly tokenId: string;
  readonly proposalId: DecisionProposalId;
  readonly remediationRequestId?: RemediationRequestId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly operatorUserId: string;
  readonly isHuman: boolean; // Must be strictly true / Phải nghiêm ngặt là true
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly signature: string;
}

/**
 * Controlled remediation request envelope tracking the lifecycle from authorization to boundary dispatch.
 * Phong bì yêu cầu khắc phục có kiểm soát theo dõi vòng đời từ ủy quyền đến điều phối ranh giới.
 */
export interface RemediationRequest {
  readonly requestId: RemediationRequestId;
  readonly proposalId: DecisionProposalId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly state: RemediationLifecycleState;
  readonly plan: PolicyRemediationPlan;
  readonly authorizationToken?: PolicyDecisionAuthorizationToken;
  readonly authorizedAt?: string;
  readonly dispatchedAt?: string;
  readonly blockedReason?: string;
  readonly failureReason?: string;
}

/**
 * Governed execution envelope produced by the controlled remediation boundary.
 * Never directly executes tools; passed to existing governed engines.
 *
 * Phong bì thực thi có quản trị do ranh giới khắc phục có kiểm soát tạo ra.
 * Không bao giờ trực tiếp thực thi công cụ; được chuyển tới các động cơ có quản trị hiện có.
 */
export interface RemediationExecutionEnvelope {
  readonly envelopeId: string;
  readonly requestId: RemediationRequestId;
  readonly proposalId: DecisionProposalId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly targetRing?: PolicyRing;
  readonly actionType: PolicyRemediationType;
  readonly authorizedOperatorId: string;
  readonly safetyFloorVerified: boolean;
  readonly circuitBreakerClear: boolean;
  readonly userStopClear: boolean;
  readonly preparedAt: string;
  readonly dispatchPayload: Record<string, any>;
}

/**
 * Structured outcome of a controlled remediation operation at the boundary.
 * Kết quả có cấu trúc của một hoạt động khắc phục có kiểm soát tại ranh giới.
 */
export interface ControlledRemediationResult {
  readonly requestId: RemediationRequestId;
  readonly proposalId: DecisionProposalId;
  readonly tenantPartition: string;
  readonly success: boolean;
  readonly state: RemediationLifecycleState;
  readonly envelope?: RemediationExecutionEnvelope;
  readonly error?: string;
  readonly completedAt: string;
}

/**
 * Cryptographic provenance record for decision and remediation state transitions.
 * Bản ghi nguồn gốc mật mã cho các chuyển đổi trạng thái quyết định và khắc phục.
 */
export interface DecisionProvenanceRecord {
  readonly provenanceId: DecisionProvenanceId;
  readonly decisionId: DecisionId;
  readonly proposalId: DecisionProposalId;
  readonly tenantPartition: string;
  readonly eventType: string;
  readonly previousHash: string;
  readonly currentHash: string;
  readonly timestamp: string;
  readonly operatorUserId?: string;
  readonly metadata: Record<string, any>;
}
