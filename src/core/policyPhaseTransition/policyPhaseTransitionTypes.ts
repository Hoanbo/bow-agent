// src/core/policyPhaseTransition/policyPhaseTransitionTypes.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Canonical Contracts & DTOs (Component 870).
// Defines branded types, phase lifecycle state taxonomy, authorization contracts,
// candidate reviews, and atomic transition commit envelopes.
//
// Core Authority Invariants:
// - READINESS != AUTHORIZATION
// - RECOMMENDATION != DECLARATION
// - PHASE_EXIT_CANDIDATE != PHASE_EXIT_COMMIT
// - PHASE_EXIT_COMMIT != PHASE_1_4_ENTRY
// - PHASE_1_4_ENTRY_READY != PHASE_1_4_ENTRY_COMMIT
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - AUTONOMOUS_PHASE_EXIT = FORBIDDEN
// - AUTONOMOUS_PHASE_1_4_ENTRY = FORBIDDEN
// - PHASE_TRANSITION != POLICY_MUTATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import type { ReadinessAssessmentReport, ReadinessReportId, AssessmentId } from '../policyGovernanceReadiness/policyGovernanceReadinessTypes.js';
import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type PhaseExitCandidateId = string & { readonly __brand: unique symbol };
export type PhaseExitAuthorizationId = string & { readonly __brand: unique symbol };
export type PhaseExitCommitId = string & { readonly __brand: unique symbol };
export type Phase14EntryReadinessId = string & { readonly __brand: unique symbol };
export type Phase14EntryAuthorizationId = string & { readonly __brand: unique symbol };
export type Phase14EntryCommitId = string & { readonly __brand: unique symbol };
export type PhaseTransitionProvenanceId = string & { readonly __brand: unique symbol };

export function createPhaseExitCandidateId(raw: string): PhaseExitCandidateId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PHASE_EXIT_CANDIDATE_ID: raw id must be a non-empty string');
  }
  return raw.trim() as PhaseExitCandidateId;
}

export function createPhaseExitAuthorizationId(raw: string): PhaseExitAuthorizationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PHASE_EXIT_AUTHORIZATION_ID: raw id must be a non-empty string');
  }
  return raw.trim() as PhaseExitAuthorizationId;
}

export function createPhaseExitCommitId(raw: string): PhaseExitCommitId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PHASE_EXIT_COMMIT_ID: raw id must be a non-empty string');
  }
  return raw.trim() as PhaseExitCommitId;
}

export function createPhase14EntryReadinessId(raw: string): Phase14EntryReadinessId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PHASE_1_4_ENTRY_READINESS_ID: raw id must be a non-empty string');
  }
  return raw.trim() as Phase14EntryReadinessId;
}

export function createPhase14EntryAuthorizationId(raw: string): Phase14EntryAuthorizationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PHASE_1_4_ENTRY_AUTHORIZATION_ID: raw id must be a non-empty string');
  }
  return raw.trim() as Phase14EntryAuthorizationId;
}

export function createPhase14EntryCommitId(raw: string): Phase14EntryCommitId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PHASE_1_4_ENTRY_COMMIT_ID: raw id must be a non-empty string');
  }
  return raw.trim() as Phase14EntryCommitId;
}

export function createPhaseTransitionProvenanceId(raw: string): PhaseTransitionProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PHASE_TRANSITION_PROVENANCE_ID: raw id must be a non-empty string');
  }
  return raw.trim() as PhaseTransitionProvenanceId;
}

// ============================================================================
// PHASE LIFECYCLE STATE TAXONOMY
// ============================================================================

export type PhaseState =
  | 'PHASE_1_3_ACTIVE'
  | 'PHASE_1_3_EXIT_PENDING_REVIEW'
  | 'PHASE_1_3_EXIT_AUTHORIZED'
  | 'PHASE_1_3_EXIT_COMMITTED'
  | 'PHASE_1_4_ENTRY_READY'
  | 'PHASE_1_4_ENTRY_AUTHORIZED'
  | 'PHASE_1_4_ENTRY_COMMITTED';

export type PhaseTransitionType =
  | 'PHASE_1_3_EXIT'
  | 'PHASE_1_4_ENTRY';

export type AuthorizationDecisionStatus =
  | 'AUTHORIZED'
  | 'REJECTED'
  | 'CANCELLED';

// ============================================================================
// PHASE EXIT CONTRACTS
// ============================================================================

export interface PhaseExitCandidate {
  readonly candidateId: PhaseExitCandidateId;
  readonly tenantId: string;
  readonly readinessReportId: ReadinessReportId;
  readonly assessmentId: AssessmentId;
  readonly currentPhase: 'PHASE_1_3_ACTIVE';
  readonly targetPhase: 'PHASE_1_3_EXIT_COMMITTED';
  readonly proposedBy: string;
  readonly createdAt: string;
  readonly readinessProvenanceHash: string;
  readonly summary: {
    readonly passedCriteriaCount: number;
    readonly totalCriteriaCount: number;
    readonly unresolvedRisksCount: number;
  };
}

export interface PhaseExitReviewPackage {
  readonly candidate: PhaseExitCandidate;
  readonly readinessReport: ReadinessAssessmentReport;
  readonly criteriaVerified: boolean;
  readonly protectedWorkspaceUntouched: boolean;
  readonly regressionVerified: boolean;
  readonly buildVerified: boolean;
  readonly securityVerified: boolean;
  readonly humanReviewChecklist: readonly string[];
  readonly reviewedAt: string;
}

export interface PhaseExitAuthorizationRequest {
  readonly candidateId: PhaseExitCandidateId;
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly authorizedBy: string;
  readonly operatorRole: HumanAuthorizationRole;
  readonly rationale: string;
  readonly decision: 'AUTHORIZE' | 'REJECT';
  readonly timestamp?: string;
}

export interface PhaseExitAuthorizationRecord {
  readonly authorizationId: PhaseExitAuthorizationId;
  readonly candidateId: PhaseExitCandidateId;
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly authorizedBy: string;
  readonly operatorRole: HumanAuthorizationRole;
  readonly rationale: string;
  readonly decision: AuthorizationDecisionStatus;
  readonly authorizedAt: string;
  readonly fingerprint: string;
}

export interface PhaseExitCommitRecord {
  readonly commitId: PhaseExitCommitId;
  readonly tenantId: string;
  readonly candidateId: PhaseExitCandidateId;
  readonly authorizationId: PhaseExitAuthorizationId;
  readonly previousPhase: 'PHASE_1_3_ACTIVE' | 'PHASE_1_3_EXIT_PENDING_REVIEW' | 'PHASE_1_3_EXIT_AUTHORIZED';
  readonly committedPhase: 'PHASE_1_3_EXIT_COMMITTED';
  readonly committedAt: string;
  readonly committedBy: string;
  readonly provenanceHash: string;
}

// ============================================================================
// PHASE 1.4 ENTRY CONTRACTS
// ============================================================================

export interface Phase14EntryReadinessRecord {
  readonly readinessId: Phase14EntryReadinessId;
  readonly tenantId: string;
  readonly exitCommitId: PhaseExitCommitId;
  readonly status: 'PHASE_1_4_ENTRY_READY' | 'PHASE_1_4_ENTRY_NOT_READY';
  readonly evaluatedAt: string;
  readonly prerequisitesSatisfied: boolean;
  readonly reasons: readonly string[];
  readonly requiredPrerequisites: readonly string[];
}

export interface Phase14EntryAuthorizationRequest {
  readonly readinessId: Phase14EntryReadinessId;
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly authorizedBy: string;
  readonly operatorRole: HumanAuthorizationRole;
  readonly rationale: string;
  readonly decision: 'AUTHORIZE' | 'REJECT';
  readonly timestamp?: string;
}

export interface Phase14EntryAuthorizationRecord {
  readonly authorizationId: Phase14EntryAuthorizationId;
  readonly readinessId: Phase14EntryReadinessId;
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly authorizedBy: string;
  readonly operatorRole: HumanAuthorizationRole;
  readonly rationale: string;
  readonly decision: AuthorizationDecisionStatus;
  readonly authorizedAt: string;
  readonly fingerprint: string;
}

export interface Phase14EntryCommitRecord {
  readonly commitId: Phase14EntryCommitId;
  readonly tenantId: string;
  readonly exitCommitId: PhaseExitCommitId;
  readonly entryReadinessId: Phase14EntryReadinessId;
  readonly authorizationId: Phase14EntryAuthorizationId;
  readonly previousPhase: 'PHASE_1_3_EXIT_COMMITTED' | 'PHASE_1_4_ENTRY_READY' | 'PHASE_1_4_ENTRY_AUTHORIZED';
  readonly committedPhase: 'PHASE_1_4_ENTRY_COMMITTED';
  readonly committedAt: string;
  readonly committedBy: string;
  readonly provenanceHash: string;
}

// ============================================================================
// PROVENANCE & DTO ENVELOPES
// ============================================================================

export interface PhaseTransitionProvenanceRecord {
  readonly provenanceId: PhaseTransitionProvenanceId;
  readonly tenantId: string;
  readonly transitionType: PhaseTransitionType;
  readonly targetPhase: PhaseState;
  readonly entityId: string;
  readonly timestamp: string;
  readonly sha256: string;
  readonly previousHash?: string;
}

export interface PolicyPhaseTransitionOptions {
  readonly tenantId: string;
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}
