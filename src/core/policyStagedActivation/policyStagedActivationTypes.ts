// src/core/policyStagedActivation/policyStagedActivationTypes.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Canonical type definitions, branded identifiers, and immutable DTO contracts for
// governed staged policy activation, independent pre-activation revalidation,
// preflight verification, the explicit human activation boundary, atomic active state transition,
// durable isolated persistence, and cryptographic provenance chaining.
//
// Authority Invariants:
// - CANDIDATE_DRAFT != VALIDATED_CANDIDATE
// - VALIDATED_CANDIDATE != AUTHORIZED_CANDIDATE
// - AUTHORIZED_CANDIDATE != ACTIVATION_READY
// - ACTIVATION_READY != STAGED_POLICY
// - STAGED_POLICY != ACTIVE_POLICY
// - NO AUTONOMOUS ACTIVATION (HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION)
// - NO AUTONOMOUS PROMOTION
// - NO AUTONOMOUS ROLLBACK
// - NO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING

import type { PolicyEvolutionIntakeId } from '../policyFeedbackReview/policyFeedbackReviewTypes.js';
import type {
  EvolutionPlanId,
  CandidateDraftId,
  CandidateDraft,
  CandidateValidationResult,
} from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
import type {
  AuthorizationRequestId,
  AuthorizationDecisionId,
  ActivationReadinessId,
  HumanAuthorizationDecision,
  ActivationReadinessDecision,
  HumanAuthorizationRole,
} from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type StagedActivationId = string & { readonly __brand: unique symbol };
export type ActivationPreflightId = string & { readonly __brand: unique symbol };
export type ActivationCommitId = string & { readonly __brand: unique symbol };
export type ActivePolicyStateId = string & { readonly __brand: unique symbol };
export type StagedActivationProvenanceId = string & { readonly __brand: unique symbol };

export function createStagedActivationId(raw: string): StagedActivationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_STAGED_ACTIVATION_ID: raw staged activation id must be a non-empty string');
  }
  return raw as StagedActivationId;
}

export function createActivationPreflightId(raw: string): ActivationPreflightId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ACTIVATION_PREFLIGHT_ID: raw preflight id must be a non-empty string');
  }
  return raw as ActivationPreflightId;
}

export function createActivationCommitId(raw: string): ActivationCommitId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ACTIVATION_COMMIT_ID: raw commit id must be a non-empty string');
  }
  return raw as ActivationCommitId;
}

export function createActivePolicyStateId(raw: string): ActivePolicyStateId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ACTIVE_POLICY_STATE_ID: raw active policy state id must be a non-empty string');
  }
  return raw as ActivePolicyStateId;
}

export function createStagedActivationProvenanceId(raw: string): StagedActivationProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_STAGED_ACTIVATION_PROVENANCE_ID: raw provenance id must be a non-empty string');
  }
  return raw as StagedActivationProvenanceId;
}

// ============================================================================
// LIFECYCLE STATES & PREFLIGHT STATUS
// ============================================================================

export type StagedPolicyLifecycleState =
  | 'STAGING_REQUESTED'
  | 'STAGED'
  | 'PREFLIGHT_VALIDATED'
  | 'ACTIVATION_AUTHORIZED'
  | 'ACTIVATION_COMMITTED'
  | 'ACTIVE_POLICY'
  // Explicit failure states
  | 'STAGING_BLOCKED'
  | 'PREFLIGHT_BLOCKED'
  | 'ACTIVATION_BLOCKED'
  | 'ACTIVATION_REJECTED'
  | 'ACTIVATION_EXPIRED'
  | 'ACTIVATION_CANCELLED'
  | 'ACTIVATION_CONFLICT'
  | 'ACTIVATION_UNKNOWN'
  | 'ACTIVATION_CORRUPTED';

export type ActivationPreflightStatus =
  | 'READY'
  | 'BLOCKED'
  | 'INVALID'
  | 'EXPIRED'
  | 'CONFLICT'
  | 'UNKNOWN';

// ============================================================================
// DTO CONTRACTS
// ============================================================================

/**
 * Immutable Staged Policy Representation.
 * Pure staged artifact; NEVER an active policy.
 */
export interface StagedPolicy {
  readonly stagedActivationId: StagedActivationId;
  readonly candidateDraftId: CandidateDraftId;
  readonly evolutionPlanId: EvolutionPlanId;
  readonly intakeId: PolicyEvolutionIntakeId;
  readonly authorizationRequestId: AuthorizationRequestId;
  readonly authorizationDecisionId: AuthorizationDecisionId;
  readonly activationReadinessId: ActivationReadinessId;
  readonly tenantPartition: string;
  readonly sourcePolicyVersion: string;
  readonly proposedPolicyVersion: string;
  readonly targetPolicyDomain: string;
  readonly stagedModifications: Record<string, any>;
  readonly state: StagedPolicyLifecycleState;
  readonly preflightRequirements: readonly string[];
  readonly provenanceHeadHash: string;
  readonly stagedAt: string;
  readonly isActivePolicy: false;       // Strictly false: STAGED_POLICY != ACTIVE_POLICY
  readonly isActivated: false;          // Strictly false
  readonly isAutonomousMutation: false; // Strictly false
}

/**
 * Independent Preflight Verification Result.
 */
export interface ActivationPreflightResult {
  readonly preflightId: ActivationPreflightId;
  readonly stagedActivationId: StagedActivationId;
  readonly candidateDraftId: CandidateDraftId;
  readonly tenantPartition: string;
  readonly status: ActivationPreflightStatus;
  readonly checksPassed: readonly string[];
  readonly blockingReasons: readonly string[];
  readonly evaluatedAt: string;
}

/**
 * Explicit Human Governed Activation Authorization.
 * Formal human governance clearance permitting state transition to active policy.
 */
export interface GovernedActivationAuthorization {
  readonly authorizationId: string;
  readonly stagedActivationId: StagedActivationId;
  readonly candidateDraftId: CandidateDraftId;
  readonly tenantPartition: string;
  readonly authorizedBy: string;
  readonly authorizedRole: HumanAuthorizationRole;
  readonly governanceRationale: string;
  readonly preflightId: ActivationPreflightId;
  readonly authorizedAt: string;
  readonly provenanceHash: string;
}

/**
 * Active Policy State Artifact.
 * Result of the governed atomic commit transition.
 */
export interface ActivePolicyState {
  readonly activePolicyStateId: ActivePolicyStateId;
  readonly activationCommitId: ActivationCommitId;
  readonly stagedActivationId: StagedActivationId;
  readonly candidateDraftId: CandidateDraftId;
  readonly evolutionPlanId: EvolutionPlanId;
  readonly intakeId: PolicyEvolutionIntakeId;
  readonly authorizationDecisionId: AuthorizationDecisionId;
  readonly activationReadinessId: ActivationReadinessId;
  readonly preflightId: ActivationPreflightId;
  readonly tenantPartition: string;
  readonly previousPolicyVersion: string;
  readonly activePolicyVersion: string;
  readonly targetPolicyDomain: string;
  readonly activeModifications: Record<string, any>;
  readonly activatedBy: string;
  readonly activatedRole: HumanAuthorizationRole;
  readonly activatedAt: string;
  readonly provenanceHeadHash: string;
  readonly isActivePolicy: true;  // Governed active state
  readonly isActivated: true;     // Fully committed
}

/**
 * Cryptographic Provenance Record for Staged Activation.
 */
export interface StagedActivationProvenanceRecord {
  readonly provenanceId: StagedActivationProvenanceId;
  readonly tenantPartition: string;
  readonly candidateDraftId: CandidateDraftId;
  readonly stagedActivationId?: StagedActivationId;
  readonly authorizationDecisionId?: AuthorizationDecisionId;
  readonly activationReadinessId?: ActivationReadinessId;
  readonly activationPreflightId?: ActivationPreflightId;
  readonly activationCommitId?: ActivationCommitId;
  readonly eventType: string;
  readonly timestamp: string;
  readonly previousHash: string;
  readonly recordHash: string;
  readonly payloadHash: string;
}

/**
 * Options for staged policy activation components.
 */
export interface PolicyStagedActivationOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}
