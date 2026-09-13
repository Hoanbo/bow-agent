// src/core/policyFeedbackReview/policyFeedbackReviewTypes.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Canonical type definitions and DTO contracts for governed feedback review,
// independent proposal revalidation, durable human review queue, explicit human review gates,
// bounded policy evolution intake requests, cryptographic review provenance, and audit correlation.
//
// Authority Invariants:
// - FEEDBACK_PROPOSAL != FEEDBACK_REVIEW
// - FEEDBACK_REVIEW != POLICY_EVOLUTION_INTAKE
// - POLICY_EVOLUTION_INTAKE != POLICY_MUTATION
// - HUMAN_ACCEPT != POLICY_ACTIVATION
// - AI_RECOMMENDATION != HUMAN_APPROVAL
// - ZERO_AUTONOMOUS_POLICY_MUTATION: No autonomous mutation, candidate creation, promotion, or rollback
// - USER_STOP > EVERYTHING

import type {
  FeedbackProposalId,
  PolicyFeedbackProposal,
  PolicyFeedbackActionType,
  ImpactClassification,
  RemediationEffectivenessStatus,
  PolicyRegressionType,
} from '../policyPostExecution/policyPostExecutionTypes.js';
import type { ExecutionId } from '../policyExecution/policyExecutionTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type FeedbackReviewId = string & { readonly __brand: unique symbol };
export type FeedbackReviewRequestId = string & { readonly __brand: unique symbol };
export type HumanReviewId = string & { readonly __brand: unique symbol };
export type PolicyEvolutionIntakeId = string & { readonly __brand: unique symbol };
export type ReviewDecisionId = string & { readonly __brand: unique symbol };
export type ReviewProvenanceId = string & { readonly __brand: unique symbol };

export function createFeedbackReviewId(raw: string): FeedbackReviewId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_FEEDBACK_REVIEW_ID: raw feedback review id must be a non-empty string');
  }
  return raw as FeedbackReviewId;
}

export function createFeedbackReviewRequestId(raw: string): FeedbackReviewRequestId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_FEEDBACK_REVIEW_REQUEST_ID: raw request id must be a non-empty string');
  }
  return raw as FeedbackReviewRequestId;
}

export function createHumanReviewId(raw: string): HumanReviewId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_HUMAN_REVIEW_ID: raw human review id must be a non-empty string');
  }
  return raw as HumanReviewId;
}

export function createPolicyEvolutionIntakeId(raw: string): PolicyEvolutionIntakeId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_POLICY_EVOLUTION_INTAKE_ID: raw intake id must be a non-empty string');
  }
  return raw as PolicyEvolutionIntakeId;
}

export function createReviewDecisionId(raw: string): ReviewDecisionId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_REVIEW_DECISION_ID: raw decision id must be a non-empty string');
  }
  return raw as ReviewDecisionId;
}

export function createReviewProvenanceId(raw: string): ReviewProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_REVIEW_PROVENANCE_ID: raw provenance id must be a non-empty string');
  }
  return raw as ReviewProvenanceId;
}

// ============================================================================
// LIFECYCLE STATE MACHINES
// ============================================================================

/**
 * Feedback review lifecycle states.
 * Terminal states: ACCEPTED, REJECTED, CANCELLED, EXPIRED, SUPERSEDED, INVALID, BLOCKED.
 */
export type FeedbackReviewLifecycleState =
  | 'RECEIVED'
  | 'REVALIDATING'
  | 'READY_FOR_HUMAN_REVIEW'
  | 'PENDING_HUMAN_REVIEW'
  | 'REQUEST_MORE_EVIDENCE'
  | 'DEFERRED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUPERSEDED'
  | 'INVALID'
  | 'BLOCKED';

/**
 * Policy evolution intake states.
 * Bounded request states only; never represents active policy mutation.
 */
export type PolicyEvolutionIntakeState =
  | 'NOT_CREATED'
  | 'ELIGIBLE'
  | 'CREATED'
  | 'PENDING_POLICY_REVIEW'
  | 'ACCEPTED_FOR_EVOLUTION'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'INVALID';

/**
 * Explicit human review decisions.
 */
export type HumanReviewDecision =
  | 'ACCEPT'
  | 'REJECT'
  | 'DEFER'
  | 'REQUEST_MORE_EVIDENCE'
  | 'CANCEL';

/**
 * Deterministic evolution intake action types mapped from proposals.
 */
export type EvolutionIntakeActionType =
  | 'INVESTIGATION_INTAKE'
  | 'CANDIDATE_REEVALUATION_INTAKE'
  | 'CANDIDATE_GENERATION_INTAKE'
  | 'ROLLBACK_REVIEW_INTAKE'
  | 'HUMAN_INVESTIGATION_INTAKE';

// ============================================================================
// DTO INTERFACES
// ============================================================================

/**
 * Independent revalidation assessment for an ingested feedback proposal.
 */
export interface FeedbackRevalidationResult {
  readonly valid: boolean;
  readonly proposalId: FeedbackProposalId;
  readonly tenantPartition: string;
  readonly executionId: ExecutionId;
  readonly candidateId?: PolicyCandidateId;
  readonly isFresh: boolean;
  readonly isSuperseded: boolean;
  readonly integrityVerified: boolean;
  readonly reasons: readonly string[];
  readonly revalidatedAt: string;
}

/**
 * Durable human review queue entry.
 */
export interface FeedbackReviewQueueEntry {
  readonly reviewId: FeedbackReviewId;
  readonly proposalId: FeedbackProposalId;
  readonly tenantPartition: string;
  readonly executionId: ExecutionId;
  readonly candidateId?: PolicyCandidateId;
  readonly state: FeedbackReviewLifecycleState;
  readonly proposedAction: PolicyFeedbackActionType;
  readonly severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly impactClassification: ImpactClassification;
  readonly effectivenessStatus: RemediationEffectivenessStatus;
  readonly regressionTypes: readonly PolicyRegressionType[];
  readonly rationale: string;
  readonly evidenceSummary: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
}

/**
 * Explicit human review submission input.
 */
export interface HumanReviewSubmission {
  readonly reviewId: FeedbackReviewId;
  readonly decision: HumanReviewDecision;
  readonly reviewerId: string;
  readonly reviewerRole: 'MASTER_HUMAN_OPERATOR' | 'SUPERVISOR' | 'OWNER';
  readonly reviewNotes: string;
  readonly additionalEvidenceRequired?: string;
  readonly submissionTimestamp?: string;
}

/**
 * Recorded human review decision.
 */
export interface HumanReviewDecisionRecord {
  readonly decisionId: ReviewDecisionId;
  readonly reviewId: FeedbackReviewId;
  readonly proposalId: FeedbackProposalId;
  readonly tenantPartition: string;
  readonly decision: HumanReviewDecision;
  readonly reviewerId: string;
  readonly reviewerRole: string;
  readonly reviewNotes: string;
  readonly decidedAt: string;
  readonly isAutonomousDecision: false; // Must strictly be false
}

/**
 * Bounded Policy Evolution Intake Request passed to MS-1.3.58.
 * Read-only DTO; does not mutate policies autonomously.
 */
export interface PolicyEvolutionIntakeRequest {
  readonly intakeId: PolicyEvolutionIntakeId;
  readonly reviewId: FeedbackReviewId;
  readonly proposalId: FeedbackProposalId;
  readonly tenantPartition: string;
  readonly candidateId?: PolicyCandidateId;
  readonly sourceExecutionId: ExecutionId;
  readonly intakeAction: EvolutionIntakeActionType;
  readonly state: PolicyEvolutionIntakeState;
  readonly impactClassification: ImpactClassification;
  readonly effectivenessStatus: RemediationEffectivenessStatus;
  readonly regressionTypes: readonly PolicyRegressionType[];
  readonly humanReviewerId: string;
  readonly humanDecisionTimestamp: string;
  readonly provenanceHeadHash: string;
  readonly isAutonomousMutation: false; // Strictly false
  readonly isPolicyMutation: false;     // Strictly false
  readonly createdAt: string;
}

/**
 * Cryptographic provenance record for review lifecycle transitions.
 */
export interface FeedbackReviewProvenanceRecord {
  readonly provenanceId: ReviewProvenanceId;
  readonly reviewId: FeedbackReviewId;
  readonly tenantPartition: string;
  readonly eventType: string;
  readonly previousHash: string;
  readonly currentHash: string;
  readonly timestamp: string;
  readonly detailsHash?: string;
}

/**
 * Master review runtime configuration options.
 */
export interface PolicyFeedbackReviewOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
  readonly proposalTtlMs?: number; // default 24h (86400000 ms)
}
