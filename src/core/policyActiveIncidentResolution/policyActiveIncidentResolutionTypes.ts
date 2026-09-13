// src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionTypes.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Canonical Contracts & DTOs (Component 841).
// Defines immutable branded types, explicit resolution states, containment assessments,
// recovery authorizations, handoffs, verifications, and closure contracts.
//
// Core Authority Invariants:
// - INCIDENT != INCIDENT_RESOLUTION
// - INCIDENT_RESOLUTION != CONTAINMENT_CLEARANCE
// - CONTAINMENT_CLEARANCE != RECOVERY_AUTHORIZATION
// - RECOVERY_AUTHORIZATION != RECOVERY_EXECUTION
// - RECOVERY_EXECUTION != RECOVERY_VERIFICATION
// - RECOVERY_VERIFICATION != INCIDENT_CLOSURE
// - INCIDENT_CLOSURE != INCIDENT_DELETION
// - CONTAINMENT != POLICY_MUTATION
// - INCIDENT_RESPONSE != POLICY_AUTHORITY
// - INCIDENT_RESOLUTION != POLICY_AUTHORITY
// - RECOVERY_AUTHORIZATION != AUTONOMOUS_AUTHORIZATION
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO AUTONOMOUS INCIDENT CLOSURE
// - ZERO AUTONOMOUS CONTAINMENT CLEARANCE
// - ZERO AUTONOMOUS SAFETY-BOUNDARY DEACTIVATION
// - ZERO DIRECT TOOL EXECUTION
// - ZERO DIRECT POLICY MUTATION
// - FAIL_CLOSED

import type { ActiveIncidentId, IncidentSeverity, SafetyBoundaryStatus } from '../policyActiveIncidentResponse/policyActiveIncidentResponseTypes.js';
import type { ActivePolicyStateId } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshotId } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
import type { RollbackTargetId, RecoveryRequestId, RecoveryCommitId } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type IncidentResolutionRequestId = string & { readonly __brand: unique symbol };
export type ContainmentAssessmentId = string & { readonly __brand: unique symbol };
export type ContainmentClearanceId = string & { readonly __brand: unique symbol };
export type RecoveryAuthorizationId = string & { readonly __brand: unique symbol };
export type RecoveryHandoffId = string & { readonly __brand: unique symbol };
export type RecoveryVerificationId = string & { readonly __brand: unique symbol };
export type ResolutionConfirmationId = string & { readonly __brand: unique symbol };
export type IncidentClosureId = string & { readonly __brand: unique symbol };
export type ResolutionProvenanceId = string & { readonly __brand: unique symbol };

export function createIncidentResolutionRequestId(raw: string): IncidentResolutionRequestId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_RESOLUTION_REQUEST_ID: raw id must be a non-empty string');
  }
  return raw.trim() as IncidentResolutionRequestId;
}

export function createContainmentAssessmentId(raw: string): ContainmentAssessmentId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_CONTAINMENT_ASSESSMENT_ID: raw id must be a non-empty string');
  }
  return raw.trim() as ContainmentAssessmentId;
}

export function createContainmentClearanceId(raw: string): ContainmentClearanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_CONTAINMENT_CLEARANCE_ID: raw id must be a non-empty string');
  }
  return raw.trim() as ContainmentClearanceId;
}

export function createRecoveryAuthorizationId(raw: string): RecoveryAuthorizationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_RECOVERY_AUTHORIZATION_ID: raw id must be a non-empty string');
  }
  return raw.trim() as RecoveryAuthorizationId;
}

export function createRecoveryHandoffId(raw: string): RecoveryHandoffId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_RECOVERY_HANDOFF_ID: raw id must be a non-empty string');
  }
  return raw.trim() as RecoveryHandoffId;
}

export function createRecoveryVerificationId(raw: string): RecoveryVerificationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_RECOVERY_VERIFICATION_ID: raw id must be a non-empty string');
  }
  return raw.trim() as RecoveryVerificationId;
}

export function createResolutionConfirmationId(raw: string): ResolutionConfirmationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_RESOLUTION_CONFIRMATION_ID: raw id must be a non-empty string');
  }
  return raw.trim() as ResolutionConfirmationId;
}

export function createIncidentClosureId(raw: string): IncidentClosureId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_INCIDENT_CLOSURE_ID: raw id must be a non-empty string');
  }
  return raw.trim() as IncidentClosureId;
}

export function createResolutionProvenanceId(raw: string): ResolutionProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_RESOLUTION_PROVENANCE_ID: raw id must be a non-empty string');
  }
  return raw.trim() as ResolutionProvenanceId;
}

// ============================================================================
// EXPLICIT LIFECYCLE STATES & ENUMS
// ============================================================================

export type IncidentResolutionLifecycleState =
  | 'INCIDENT_DETECTED'
  | 'INCIDENT_ACKNOWLEDGED'
  | 'INVESTIGATION_REQUIRED'
  | 'CONTAINMENT_ASSESSED'
  | 'CONTAINMENT_CLEARANCE_REQUIRED'
  | 'CONTAINMENT_CLEARED'
  | 'RECOVERY_AUTHORIZATION_REQUIRED'
  | 'RECOVERY_AUTHORIZED'
  | 'RECOVERY_HANDOFF'
  | 'RECOVERY_VERIFICATION_REQUIRED'
  | 'RECOVERY_VERIFIED'
  | 'RESOLUTION_CONFIRMED'
  | 'INCIDENT_CLOSED'
  // Fail-closed & Blocking States:
  | 'FAIL_CLOSED'
  | 'REQUIRES_HUMAN_INTERVENTION'
  | 'RECOVERY_BLOCKED'
  | 'CONTAINMENT_CLEARANCE_BLOCKED'
  | 'RESOLUTION_BLOCKED';

export type ContainmentAssessmentStatus =
  | 'CONTAINED'
  | 'UNCONTAINED'
  | 'EVALUATION_FAILED';

export type RecoveryVerificationStatus =
  | 'VERIFIED'
  | 'FAILED'
  | 'BLOCKED'
  | 'INCONSISTENT';

export type ResolutionConfirmationStatus =
  | 'CONFIRMED'
  | 'REJECTED'
  | 'BLOCKED';

// ============================================================================
// DTO CONTRACTS
// ============================================================================

/**
 * Read-only evaluation of whether containment conditions are met.
 */
export interface ContainmentAssessmentRecord {
  readonly assessmentId: ContainmentAssessmentId;
  readonly tenantPartition: string;
  readonly incidentId: ActiveIncidentId;
  readonly status: ContainmentAssessmentStatus;
  readonly safetyBoundaryStatus: SafetyBoundaryStatus;
  readonly hardForbiddenFloorPreserved: boolean;
  readonly activePolicyDriftBlocked: boolean;
  readonly evaluatedAt: string;
  readonly checksPassed: readonly string[];
  readonly blockingReasons: readonly string[];
  // Authority Invariants:
  readonly isPolicyMutation: false;
  readonly isAutonomousClearance: false;
  readonly isDirectToolExecution: false;
}

/**
 * Governed Human Containment Clearance Record.
 */
export interface ContainmentClearanceRecord {
  readonly clearanceId: ContainmentClearanceId;
  readonly tenantPartition: string;
  readonly incidentId: ActiveIncidentId;
  readonly assessmentId: ContainmentAssessmentId;
  readonly operatorId: string;
  readonly operatorRole: HumanAuthorizationRole;
  readonly governanceRationale: string;
  readonly clearedAt: string;
  readonly isAutonomous: false;
  readonly provenanceHash: string;
}

/**
 * Governed Human Recovery Authorization Record.
 */
export interface RecoveryAuthorizationRecord {
  readonly authorizationId: RecoveryAuthorizationId;
  readonly tenantPartition: string;
  readonly incidentId: ActiveIncidentId;
  readonly clearanceId: ContainmentClearanceId;
  readonly recoveryTargetVersion: string;
  readonly targetId: RollbackTargetId;
  readonly operatorId: string;
  readonly operatorRole: HumanAuthorizationRole;
  readonly governanceRationale: string;
  readonly authorizedAt: string;
  readonly isAutonomous: false;
  readonly provenanceHash: string;
  // Invariant Markers:
  readonly isRecoveryExecution: false; // Preparing auth is NOT executing recovery
  readonly isPolicyMutation: false;
}

/**
 * Record of handoff to MS-1.3.72 Rollback/Recovery subsystem.
 */
export interface IncidentRecoveryHandoffRecord {
  readonly handoffId: RecoveryHandoffId;
  readonly tenantPartition: string;
  readonly incidentId: ActiveIncidentId;
  readonly authorizationId: RecoveryAuthorizationId;
  readonly rollbackRecoveryRequestId: RecoveryRequestId;
  readonly targetPolicyVersion: string;
  readonly targetId: RollbackTargetId;
  readonly handoffStatus: 'HANDED_OFF' | 'HANDOFF_FAILED';
  readonly handedOffAt: string;
  readonly commitId?: RecoveryCommitId;
}

/**
 * Multi-layer recovery verification record across MS-1.3.70 - 74.
 */
export interface IncidentRecoveryVerificationRecord {
  readonly verificationId: RecoveryVerificationId;
  readonly tenantPartition: string;
  readonly incidentId: ActiveIncidentId;
  readonly handoffId: RecoveryHandoffId;
  readonly status: RecoveryVerificationStatus;
  readonly recoveredPolicyVersion: string;
  readonly activePolicyVerified: boolean;
  readonly runtimeSnapshotSynchronized: boolean;
  readonly pdpSafetyFloorVerified: boolean;
  readonly pepEnforcementConsistent: boolean;
  readonly lifecycleReconciliationClean: boolean;
  readonly safetyBoundaryNormalized: boolean;
  readonly verifiedAt: string;
  readonly checksPassed: readonly string[];
  readonly discrepancyDetails: readonly string[];
  // Authority Invariants:
  readonly isAutoRepairAttempted: false;
  readonly isAutoResyncAttempted: false;
}

/**
 * Deterministic Incident Resolution Confirmation Record.
 */
export interface IncidentResolutionRecord {
  readonly resolutionId: ResolutionConfirmationId;
  readonly tenantPartition: string;
  readonly incidentId: ActiveIncidentId;
  readonly status: ResolutionConfirmationStatus;
  readonly resolutionMode: 'RECOVERY_VERIFIED' | 'RESOLVED_WITHOUT_RECOVERY';
  readonly containmentClearanceId: ContainmentClearanceId;
  readonly recoveryVerificationId?: RecoveryVerificationId;
  readonly confirmedAt: string;
  readonly summary: string;
  readonly evidenceChain: readonly string[];
  // Authority Invariants:
  readonly isAutonomousClosure: false;
  readonly isPolicyMutation: false;
}

/**
 * Immutable Human Incident Closure Record.
 */
export interface IncidentClosureRecord {
  readonly closureId: IncidentClosureId;
  readonly tenantPartition: string;
  readonly incidentId: ActiveIncidentId;
  readonly resolutionId: ResolutionConfirmationId;
  readonly operatorId: string;
  readonly operatorRole: HumanAuthorizationRole;
  readonly closureRationale: string;
  readonly closedAt: string;
  readonly isAutonomous: false;
  readonly provenanceHash: string;
  // Absolute Invariants:
  readonly isIncidentDeleted: false;
  readonly isHistoryRewritten: false;
}

/**
 * Cryptographic Provenance Record for Incident Resolution Lifecycle.
 */
export interface ResolutionProvenanceRecord {
  readonly provenanceId: ResolutionProvenanceId;
  readonly tenantPartition: string;
  readonly incidentId: ActiveIncidentId;
  readonly activePolicyStateId?: ActivePolicyStateId | null;
  readonly containmentAssessmentId?: ContainmentAssessmentId | null;
  readonly containmentClearanceId?: ContainmentClearanceId | null;
  readonly recoveryAuthorizationId?: RecoveryAuthorizationId | null;
  readonly recoveryHandoffId?: RecoveryHandoffId | null;
  readonly recoveryVerificationId?: RecoveryVerificationId | null;
  readonly resolutionId?: ResolutionConfirmationId | null;
  readonly closureId?: IncidentClosureId | null;
  readonly eventType: string;
  readonly timestamp: string;
  readonly previousHash: string;
  readonly recordHash: string;
  readonly payloadHash: string;
}

/**
 * Configuration options for policyActiveIncidentResolution domain.
 */
export interface PolicyActiveIncidentResolutionOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}
