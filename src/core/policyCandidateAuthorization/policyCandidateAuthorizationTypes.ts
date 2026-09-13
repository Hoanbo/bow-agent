// src/core/policyCandidateAuthorization/policyCandidateAuthorizationTypes.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Canonical type definitions, branded identifiers, and immutable DTO contracts for
// governed candidate authorization, independent revalidation, explicit human review gates,
// activation readiness evaluation, durable isolated decision persistence, and cryptographic provenance.
//
// Authority Invariants:
// - CANDIDATE_DRAFT != CANDIDATE_VALIDATION
// - CANDIDATE_VALIDATION != HUMAN_AUTHORIZATION
// - HUMAN_AUTHORIZATION != ACTIVATION_READINESS
// - ACTIVATION_READINESS != POLICY_MUTATION
// - AUTHORIZE != ACTIVE_POLICY
// - READY_FOR_ACTIVATION != ACTIVATED
// - NO AUTONOMOUS AUTHORIZATION (HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION)
// - NO AUTONOMOUS ACTIVATION
// - NO AUTONOMOUS PROMOTION
// - NO AUTONOMOUS ROLLBACK
// - NO DIRECT POLICY MUTATION
// - NO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING

import type { PolicyEvolutionIntakeId } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type {
  EvolutionPlanId,
  CandidateDraftId,
  CandidateDraft,
  CandidateValidationResult,
} from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type CandidateAuthorizationId = string & { readonly __brand: unique symbol };
export type AuthorizationDecisionId = string & { readonly __brand: unique symbol };
export type ActivationReadinessId = string & { readonly __brand: unique symbol };
export type AuthorizationProvenanceId = string & { readonly __brand: unique symbol };
export type AuthorizationRequestId = string & { readonly __brand: unique symbol };

export function createCandidateAuthorizationId(raw: string): CandidateAuthorizationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_CANDIDATE_AUTHORIZATION_ID: raw authorization id must be a non-empty string');
  }
  return raw as CandidateAuthorizationId;
}

export function createAuthorizationDecisionId(raw: string): AuthorizationDecisionId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_AUTHORIZATION_DECISION_ID: raw decision id must be a non-empty string');
  }
  return raw as AuthorizationDecisionId;
}

export function createActivationReadinessId(raw: string): ActivationReadinessId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ACTIVATION_READINESS_ID: raw readiness id must be a non-empty string');
  }
  return raw as ActivationReadinessId;
}

export function createAuthorizationProvenanceId(raw: string): AuthorizationProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_AUTHORIZATION_PROVENANCE_ID: raw provenance id must be a non-empty string');
  }
  return raw as AuthorizationProvenanceId;
}

export function createAuthorizationRequestId(raw: string): AuthorizationRequestId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_AUTHORIZATION_REQUEST_ID: raw request id must be a non-empty string');
  }
  return raw as AuthorizationRequestId;
}

// ============================================================================
// DECISION & READINESS STATES
// ============================================================================

export type CandidateAuthorizationDecisionType =
  | 'AUTHORIZE'
  | 'REJECT'
  | 'DEFER'
  | 'REQUEST_MORE_EVIDENCE'
  | 'CANCEL';

export type ActivationReadinessState =
  | 'READY_FOR_ACTIVATION'
  | 'NOT_READY'
  | 'BLOCKED'
  | 'EXPIRED'
  | 'REJECTED'
  | 'PENDING_HUMAN_AUTHORIZATION'
  | 'UNKNOWN';

export type HumanAuthorizationRole =
  | 'MASTER_HUMAN_OPERATOR'
  | 'HUMAN_SECURITY_ADMIN'
  | 'OWNER';

export type CandidateAuthorizationAction =
  | 'AUTHORIZE_FOR_ACTIVATION'
  | 'AUTHORIZE_FOR_SIMULATION'
  | 'AUTHORIZE_FOR_STAGING';

export type CandidateAuthorizationRevalidationStatus =
  | 'VALID'
  | 'INVALID'
  | 'BLOCKED'
  | 'EXPIRED'
  | 'SUPERSEDED'
  | 'CONTRADICTORY';

// ============================================================================
// DTO CONTRACTS
// ============================================================================

/**
 * Governed Authorization Request for a synthesized Candidate Policy Draft.
 * Submitted to the explicit Human Authorization Boundary.
 */
export interface CandidateAuthorizationRequest {
  readonly requestId: AuthorizationRequestId;
  readonly candidateDraftId: CandidateDraftId;
  readonly evolutionPlanId: EvolutionPlanId;
  readonly intakeId: PolicyEvolutionIntakeId;
  readonly tenantPartition: string;
  readonly sourcePolicyVersion: string;
  readonly targetPolicyDomain: string;
  readonly requestedAction: CandidateAuthorizationAction;
  readonly requestedBy: string;
  readonly rationale: string;
  readonly requiredRole: HumanAuthorizationRole;
  readonly candidateDraft: CandidateDraft;
  readonly candidateValidation: CandidateValidationResult;
  readonly provenanceHeadHash: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly supersededBy?: string;
}

/**
 * Immutable Human Authorization Decision.
 * Pure authorization record; does NOT mutate or activate any policy.
 */
export interface HumanAuthorizationDecision {
  readonly decisionId: AuthorizationDecisionId;
  readonly requestId: AuthorizationRequestId;
  readonly candidateDraftId: CandidateDraftId;
  readonly evolutionPlanId: EvolutionPlanId;
  readonly intakeId: PolicyEvolutionIntakeId;
  readonly tenantPartition: string;
  readonly reviewerId: string;
  readonly reviewerRole: HumanAuthorizationRole;
  readonly decision: CandidateAuthorizationDecisionType;
  readonly reason: string;
  readonly decidedAt: string;
  readonly isActivePolicy: false;       // Strictly false: AUTHORIZE != ACTIVE_POLICY
  readonly isPolicyMutation: false;     // Strictly false
  readonly isAutonomousMutation: false; // Strictly false
  readonly provenanceHash: string;
}

/**
 * Immutable Activation Readiness Evaluation Decision.
 * Evaluates whether an authorized candidate satisfies all prerequisites for a future activation stage.
 * Does NOT activate the candidate or mutate policy.
 */
export interface ActivationReadinessDecision {
  readonly readinessId: ActivationReadinessId;
  readonly candidateDraftId: CandidateDraftId;
  readonly authorizationDecisionId?: AuthorizationDecisionId;
  readonly evolutionPlanId: EvolutionPlanId;
  readonly intakeId: PolicyEvolutionIntakeId;
  readonly tenantPartition: string;
  readonly state: ActivationReadinessState;
  readonly prerequisitesSatisfied: readonly string[];
  readonly blockingReasons: readonly string[];
  readonly evaluatedAt: string;
  readonly isActivePolicy: false; // Strictly false: READY_FOR_ACTIVATION != ACTIVE_POLICY
  readonly isActivated: false;    // Strictly false: ACTIVATION_READY != ACTIVATED
}

/**
 * Independent Revalidation Result for Candidate Authorization.
 */
export interface CandidateAuthorizationRevalidationResult {
  readonly valid: boolean;
  readonly candidateDraftId: CandidateDraftId;
  readonly status: CandidateAuthorizationRevalidationStatus;
  readonly tenantPartition: string;
  readonly issues: readonly string[];
  readonly revalidatedAt: string;
}

/**
 * Composite Authorization Result holding request, decision, readiness, and provenance.
 */
export interface CandidateAuthorizationResult {
  readonly request: CandidateAuthorizationRequest;
  readonly decision: HumanAuthorizationDecision;
  readonly readiness: ActivationReadinessDecision;
  readonly provenanceHash: string;
}

/**
 * Cryptographic Provenance Record for Candidate Authorization.
 */
export interface AuthorizationProvenanceRecord {
  readonly provenanceId: AuthorizationProvenanceId;
  readonly tenantPartition: string;
  readonly candidateDraftId: CandidateDraftId;
  readonly evolutionPlanId: EvolutionPlanId;
  readonly authorizationRequestId?: AuthorizationRequestId;
  readonly authorizationDecisionId?: AuthorizationDecisionId;
  readonly activationReadinessId?: ActivationReadinessId;
  readonly eventType: string;
  readonly timestamp: string;
  readonly previousHash: string;
  readonly recordHash: string;
  readonly payloadHash: string;
}

/**
 * Options for candidate authorization services.
 */
export interface PolicyCandidateAuthorizationOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}
