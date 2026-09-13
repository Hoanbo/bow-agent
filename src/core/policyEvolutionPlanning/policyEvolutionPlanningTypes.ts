// src/core/policyEvolutionPlanning/policyEvolutionPlanningTypes.ts
// BOWCON V4.0 — MS-1.3.68: GOVERNED POLICY EVOLUTION PLANNING & CANDIDATE SYNTHESIS LAYER
//
// Canonical type definitions and DTO contracts for governed policy evolution planning,
// deterministic candidate synthesis, independent candidate validation, safety constraints,
// human review boundary requirements, append-only provenance, and audit correlation.
//
// Authority Invariants:
// - EVOLUTION_INTAKE != EVOLUTION_PLAN
// - EVOLUTION_PLAN != CANDIDATE_DRAFT
// - CANDIDATE_DRAFT != ACTIVE_POLICY
// - POLICY_EVOLUTION_PLANNING != POLICY_MUTATION
// - ZERO_AUTONOMOUS_POLICY_MUTATION: No autonomous mutation, activation, promotion, or rollback
// - USER_STOP > EVERYTHING

import type {
  PolicyEvolutionIntakeId,
  FeedbackReviewId,
  EvolutionIntakeActionType,
} from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type {
  FeedbackProposalId,
  ImpactClassification,
  RemediationEffectivenessStatus,
  PolicyRegressionType,
} from '../policyPostExecution/policyPostExecutionTypes.js';
import type { ExecutionId } from '../policyExecution/policyExecutionTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type EvolutionPlanId = string & { readonly __brand: unique symbol };
export type CandidateSynthesisId = string & { readonly __brand: unique symbol };
export type CandidateDraftId = string & { readonly __brand: unique symbol };
export type EvolutionConstraintId = string & { readonly __brand: unique symbol };
export type EvolutionPlanningProvenanceId = string & { readonly __brand: unique symbol };

export function createEvolutionPlanId(raw: string): EvolutionPlanId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_EVOLUTION_PLAN_ID: raw plan id must be a non-empty string');
  }
  return raw as EvolutionPlanId;
}

export function createCandidateSynthesisId(raw: string): CandidateSynthesisId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_CANDIDATE_SYNTHESIS_ID: raw synthesis id must be a non-empty string');
  }
  return raw as CandidateSynthesisId;
}

export function createCandidateDraftId(raw: string): CandidateDraftId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_CANDIDATE_DRAFT_ID: raw draft id must be a non-empty string');
  }
  return raw as CandidateDraftId;
}

export function createEvolutionConstraintId(raw: string): EvolutionConstraintId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_EVOLUTION_CONSTRAINT_ID: raw constraint id must be a non-empty string');
  }
  return raw as EvolutionConstraintId;
}

export function createEvolutionPlanningProvenanceId(raw: string): EvolutionPlanningProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PLANNING_PROVENANCE_ID: raw provenance id must be a non-empty string');
  }
  return raw as EvolutionPlanningProvenanceId;
}

// ============================================================================
// PLAN & CANDIDATE TYPES
// ============================================================================

export type EvolutionPlanType =
  | 'INVESTIGATION_PLAN'
  | 'CANDIDATE_REEVALUATION_PLAN'
  | 'CANDIDATE_SYNTHESIS_PLAN'
  | 'ROLLBACK_REVIEW_PLAN'
  | 'HUMAN_INVESTIGATION_PLAN';

export type CandidateValidationStatus =
  | 'VALID'
  | 'DEGRADED'
  | 'INVALID'
  | 'BLOCKED';

// ============================================================================
// DTO INTERFACES
// ============================================================================

/**
 * Governed Evolution Plan describing required policy evolution steps.
 * Read-only planning artifact; does not mutate policies or activate candidates.
 */
export interface EvolutionPlan {
  readonly planId: EvolutionPlanId;
  readonly intakeId: PolicyEvolutionIntakeId;
  readonly reviewId: FeedbackReviewId;
  readonly proposalId: FeedbackProposalId;
  readonly tenantPartition: string;
  readonly planType: EvolutionPlanType;
  readonly sourceExecutionId: ExecutionId;
  readonly candidateId?: PolicyCandidateId;
  readonly proposedModifications: readonly string[];
  readonly rationale: string;
  readonly expectedEffects: readonly string[];
  readonly targetPolicyDomain: string;
  readonly createdAt: string;
  readonly isPolicyMutation: false;     // Strictly false
  readonly isAutonomousMutation: false; // Strictly false
}

/**
 * Immutable Candidate Policy Draft.
 * Pure draft artifact; never an active policy or candidate promotion.
 */
export interface CandidateDraft {
  readonly candidateDraftId: CandidateDraftId;
  readonly evolutionPlanId: EvolutionPlanId;
  readonly intakeId: PolicyEvolutionIntakeId;
  readonly tenantPartition: string;
  readonly sourcePolicyVersion: string;
  readonly sourceCandidateId?: PolicyCandidateId;
  readonly proposedChanges: Record<string, any>;
  readonly rationale: string;
  readonly expectedEffects: readonly string[];
  readonly constraintsSummary: readonly string[];
  readonly requiredHumanReview: boolean;
  readonly provenanceHeadHash: string;
  readonly createdAt: string;
  readonly isActivePolicy: false;       // Strictly false
  readonly isPolicyMutation: false;     // Strictly false
  readonly isAutonomousMutation: false; // Strictly false
}

/**
 * Independent validation result for a candidate draft.
 */
export interface CandidateValidationResult {
  readonly valid: boolean;
  readonly candidateDraftId: CandidateDraftId;
  readonly status: CandidateValidationStatus;
  readonly tenantPartition: string;
  readonly issues: readonly string[];
  readonly validatedAt: string;
}

/**
 * Human evolution review requirement specifying mandatory governance checks.
 */
export interface HumanEvolutionReviewRequirement {
  readonly requirementId: string;
  readonly candidateDraftId: CandidateDraftId;
  readonly evolutionPlanId: EvolutionPlanId;
  readonly tenantPartition: string;
  readonly sourcePolicyVersion: string;
  readonly requiredRole: 'MASTER_HUMAN_OPERATOR' | 'SUPERVISOR' | 'OWNER';
  readonly requestedReviewAction: 'APPROVE_FOR_SIMULATION' | 'APPROVE_FOR_STAGING' | 'REJECT_DRAFT';
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly provenanceHeadHash: string;
}

/**
 * Cryptographic provenance record for evolution planning transitions.
 */
export interface EvolutionPlanningProvenanceRecord {
  readonly provenanceId: EvolutionPlanningProvenanceId;
  readonly tenantPartition: string;
  readonly intakeId: PolicyEvolutionIntakeId;
  readonly planId?: EvolutionPlanId;
  readonly candidateDraftId?: CandidateDraftId;
  readonly eventType: string;
  readonly previousHash: string;
  readonly currentHash: string;
  readonly timestamp: string;
  readonly detailsHash?: string;
}

/**
 * Master configuration options for evolution planning.
 */
export interface PolicyEvolutionPlanningOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}
