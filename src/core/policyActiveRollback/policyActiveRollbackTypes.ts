// src/core/policyActiveRollback/policyActiveRollbackTypes.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Canonical Contracts & DTOs (Component 807).
// Defines immutable branded types, explicit state machines, and frozen governance DTOs
// for governed active policy rollback, sunset, and recovery operations.
//
// Core Authority Invariants:
// - ACTIVE_POLICY != ROLLBACK_TARGET
// - ACTIVE_POLICY != SUNSET_REQUEST
// - ROLLBACK_REQUEST != ROLLBACK_COMMIT
// - SUNSET_REQUEST != POLICY_MUTATION
// - RECOVERY_REQUEST != AUTONOMOUS_RECOVERY
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - FAIL_CLOSED

import type { HumanAuthorizationRole } from '../policyCandidateAuthorization/policyCandidateAuthorizationTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type ActiveRollbackRequestId = string & { readonly __brand: unique symbol };
export type RollbackTargetId = string & { readonly __brand: unique symbol };
export type RollbackEvaluationId = string & { readonly __brand: unique symbol };
export type SunsetRequestId = string & { readonly __brand: unique symbol };
export type SunsetEvaluationId = string & { readonly __brand: unique symbol };
export type RecoveryRequestId = string & { readonly __brand: unique symbol };
export type RecoveryEvaluationId = string & { readonly __brand: unique symbol };
export type RollbackCommitId = string & { readonly __brand: unique symbol };
export type SunsetCommitId = string & { readonly __brand: unique symbol };
export type RecoveryCommitId = string & { readonly __brand: unique symbol };
export type RollbackProvenanceId = string & { readonly __brand: unique symbol };

export function createActiveRollbackRequestId(raw: string): ActiveRollbackRequestId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ACTIVE_ROLLBACK_REQUEST_ID: raw rollback request id must be a non-empty string');
  }
  return raw as ActiveRollbackRequestId;
}

export function createRollbackTargetId(raw: string): RollbackTargetId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ROLLBACK_TARGET_ID: raw rollback target id must be a non-empty string');
  }
  return raw as RollbackTargetId;
}

export function createRollbackEvaluationId(raw: string): RollbackEvaluationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ROLLBACK_EVALUATION_ID: raw rollback evaluation id must be a non-empty string');
  }
  return raw as RollbackEvaluationId;
}

export function createSunsetRequestId(raw: string): SunsetRequestId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_SUNSET_REQUEST_ID: raw sunset request id must be a non-empty string');
  }
  return raw as SunsetRequestId;
}

export function createSunsetEvaluationId(raw: string): SunsetEvaluationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_SUNSET_EVALUATION_ID: raw sunset evaluation id must be a non-empty string');
  }
  return raw as SunsetEvaluationId;
}

export function createRecoveryRequestId(raw: string): RecoveryRequestId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_RECOVERY_REQUEST_ID: raw recovery request id must be a non-empty string');
  }
  return raw as RecoveryRequestId;
}

export function createRecoveryEvaluationId(raw: string): RecoveryEvaluationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_RECOVERY_EVALUATION_ID: raw recovery evaluation id must be a non-empty string');
  }
  return raw as RecoveryEvaluationId;
}

export function createRollbackCommitId(raw: string): RollbackCommitId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ROLLBACK_COMMIT_ID: raw rollback commit id must be a non-empty string');
  }
  return raw as RollbackCommitId;
}

export function createSunsetCommitId(raw: string): SunsetCommitId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_SUNSET_COMMIT_ID: raw sunset commit id must be a non-empty string');
  }
  return raw as SunsetCommitId;
}

export function createRecoveryCommitId(raw: string): RecoveryCommitId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_RECOVERY_COMMIT_ID: raw recovery commit id must be a non-empty string');
  }
  return raw as RecoveryCommitId;
}

export function createRollbackProvenanceId(raw: string): RollbackProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ROLLBACK_PROVENANCE_ID: raw rollback provenance id must be a non-empty string');
  }
  return raw as RollbackProvenanceId;
}

// ============================================================================
// STATE MACHINE DEFINITIONS
// ============================================================================

export type RollbackRequestState =
  | 'REQUESTED'
  | 'REVALIDATING'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'AUTHORIZED'
  | 'REJECTED'
  | 'DEFERRED'
  | 'BLOCKED'
  | 'COMMITTED'
  | 'VERIFIED';

export type SunsetLifecycleState =
  | 'NOT_REQUESTED'
  | 'REQUESTED'
  | 'EVALUATED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'AUTHORIZED'
  | 'COMMITTED'
  | 'VERIFIED'
  | 'BLOCKED';

export type RecoveryLifecycleState =
  | 'NOT_REQUESTED'
  | 'REQUESTED'
  | 'REVALIDATING'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'AUTHORIZED'
  | 'STAGED'
  | 'COMMITTED'
  | 'VERIFIED'
  | 'BLOCKED';

export type RollbackRevalidationStatus =
  | 'VALID'
  | 'BLOCKED'
  | 'INVALID'
  | 'CONTRADICTORY'
  | 'SUPERSEDED'
  | 'UNKNOWN';

export type SunsetEvaluationStatus =
  | 'VALID'
  | 'BLOCKED'
  | 'INVALID'
  | 'UNKNOWN';

export type RecoveryEvaluationStatus =
  | 'VALID'
  | 'BLOCKED'
  | 'INVALID'
  | 'UNKNOWN';

// ============================================================================
// CANONICAL HARD-FORBIDDEN ACTIONS FLOOR
// ============================================================================

export const ROLLBACK_HARD_FORBIDDEN_ACTIONS = [
  'transfer_funds',
  'delete_database',
  'bypass_robot_interlocks',
  'execute_untrusted_host_script',
] as const;

export type RollbackHardForbiddenAction = typeof ROLLBACK_HARD_FORBIDDEN_ACTIONS[number];

// ============================================================================
// DTO CONTRACTS
// ============================================================================

/**
 * Historically verified active policy record preserved in immutable storage.
 */
export interface HistoricalPolicyVersion {
  readonly targetId: RollbackTargetId;
  readonly tenantPartition: string;
  readonly policyVersion: string;
  readonly activePolicyStateId: string;
  readonly activationCommitId: string;
  readonly targetPolicyDomain: string;
  readonly policyModifications: Record<string, any>;
  readonly activatedBy: string;
  readonly activatedRole: string;
  readonly activatedAt: string;
  readonly provenanceHeadHash: string;
  readonly verified: boolean;
  readonly isHardForbiddenProtected: boolean;
  readonly isActivePolicy: false; // Once in history, it is a target, NOT the active policy
}

/**
 * Governed Rollback Request.
 */
export interface RollbackRequest {
  readonly rollbackRequestId: ActiveRollbackRequestId;
  readonly tenantPartition: string;
  readonly currentActivePolicyStateId: string;
  readonly currentActivePolicyVersion: string;
  readonly targetPolicyVersion: string;
  readonly targetId: RollbackTargetId;
  readonly requestedBy: string;
  readonly requestedRole?: string;
  readonly reason: string;
  readonly state: RollbackRequestState;
  readonly requestedAt: string;
  readonly isAutonomous: false;
  readonly isActivePolicy: false;
  readonly isPolicyMutation: false;
}

/**
 * Independent Rollback Revalidation Result.
 */
export interface RollbackRevalidationResult {
  readonly revalidationId: RollbackEvaluationId;
  readonly rollbackRequestId: ActiveRollbackRequestId;
  readonly tenantPartition: string;
  readonly currentActiveVersion: string;
  readonly targetPolicyVersion: string;
  readonly targetId: RollbackTargetId;
  readonly valid: boolean;
  readonly status: RollbackRevalidationStatus;
  readonly checksPassed: readonly string[];
  readonly blockingReasons: readonly string[];
  readonly revalidatedAt: string;
}

/**
 * Governed Sunset Request.
 */
export interface SunsetRequest {
  readonly sunsetRequestId: SunsetRequestId;
  readonly tenantPartition: string;
  readonly currentActivePolicyStateId: string;
  readonly currentActivePolicyVersion: string;
  readonly requestedBy: string;
  readonly requestedRole?: string;
  readonly reason: string;
  readonly replacementPolicyVersion?: string;
  readonly state: SunsetLifecycleState;
  readonly requestedAt: string;
  readonly isAutonomous: false;
  readonly isActivePolicy: false;
}

/**
 * Independent Sunset Evaluation Result.
 */
export interface SunsetEvaluationResult {
  readonly evaluationId: SunsetEvaluationId;
  readonly sunsetRequestId: SunsetRequestId;
  readonly tenantPartition: string;
  readonly valid: boolean;
  readonly status: SunsetEvaluationStatus;
  readonly humanReviewRequired: boolean;
  readonly checksPassed: readonly string[];
  readonly blockingReasons: readonly string[];
  readonly evaluatedAt: string;
}

export type ActiveRollbackRequest = RollbackRequest;
export type ActiveSunsetRequest = SunsetRequest;
export type ActiveRecoveryRequest = RecoveryRequest;

export interface RecoveryRequest {
  readonly recoveryRequestId: RecoveryRequestId;
  readonly tenantPartition: string;
  readonly sourceState: 'ROLLED_BACK' | 'SUNSET' | 'DEACTIVATED';
  readonly recoveryTargetVersion: string;
  readonly targetId: RollbackTargetId;
  readonly requestedBy: string;
  readonly requestedRole?: string;
  readonly reason: string;
  readonly state: RecoveryLifecycleState;
  readonly requestedAt: string;
  readonly isAutonomous: false;
  readonly isActivePolicy: false;
}

/**
 * Independent Recovery Evaluation Result.
 */
export interface RecoveryEvaluationResult {
  readonly evaluationId: RecoveryEvaluationId;
  readonly recoveryRequestId: RecoveryRequestId;
  readonly tenantPartition: string;
  readonly recoveryTargetVersion: string;
  readonly targetId: RollbackTargetId;
  readonly valid: boolean;
  readonly status: RecoveryEvaluationStatus;
  readonly checksPassed: readonly string[];
  readonly blockingReasons: readonly string[];
  readonly evaluatedAt: string;
}

/**
 * Governed Rollback / Sunset / Recovery Authorization.
 * Must originate from an authorized human operator with anti-self-approval.
 */
export interface GovernedRollbackAuthorization {
  readonly authorizationId: string;
  readonly operationType: 'ROLLBACK' | 'SUNSET' | 'RECOVERY';
  readonly targetRequestId: string;
  readonly tenantPartition: string;
  readonly authorizedBy: string;
  readonly authorizedRole: HumanAuthorizationRole;
  readonly governanceRationale: string;
  readonly evaluationId: string;
  readonly authorizedAt: string;
  readonly provenanceHash: string;
}

/**
 * Atomic Rollback Commit Result.
 */
export interface RollbackCommitResult {
  readonly commitId: RollbackCommitId;
  readonly rollbackRequestId: ActiveRollbackRequestId;
  readonly tenantPartition: string;
  readonly previousActivePolicyVersion: string;
  readonly newActivePolicyStateId: string;
  readonly newActivePolicyVersion: string;
  readonly committedBy: string;
  readonly committedRole: HumanAuthorizationRole;
  readonly committedAt: string;
  readonly resynchronized: boolean;
  readonly provenanceHeadHash: string;
}

/**
 * Atomic Sunset Commit Result.
 */
export interface SunsetCommitResult {
  readonly commitId: SunsetCommitId;
  readonly sunsetRequestId: SunsetRequestId;
  readonly tenantPartition: string;
  readonly retiredPolicyVersion: string;
  readonly replacementPolicyVersion?: string;
  readonly committedBy: string;
  readonly committedRole: HumanAuthorizationRole;
  readonly committedAt: string;
  readonly resynchronized: boolean;
  readonly provenanceHeadHash: string;
}

/**
 * Atomic Recovery Commit Result.
 */
export interface RecoveryCommitResult {
  readonly commitId: RecoveryCommitId;
  readonly recoveryRequestId: RecoveryRequestId;
  readonly tenantPartition: string;
  readonly recoveredActivePolicyStateId: string;
  readonly recoveredPolicyVersion: string;
  readonly committedBy: string;
  readonly committedRole: HumanAuthorizationRole;
  readonly committedAt: string;
  readonly resynchronized: boolean;
  readonly provenanceHeadHash: string;
}

/**
 * Cryptographic Provenance Record for Rollback, Sunset, and Recovery.
 */
export interface RollbackProvenanceRecord {
  readonly provenanceId: RollbackProvenanceId;
  readonly tenantPartition: string;
  readonly activePolicyStateId?: string;
  readonly targetPolicyVersion?: string;
  readonly rollbackRequestId?: ActiveRollbackRequestId;
  readonly sunsetRequestId?: SunsetRequestId;
  readonly recoveryRequestId?: RecoveryRequestId;
  readonly authorizationDecisionId?: string;
  readonly commitId?: string;
  readonly eventType: string;
  readonly timestamp: string;
  readonly previousHash: string;
  readonly recordHash: string;
  readonly payloadHash: string;
}

/**
 * Configuration options for policyActiveRollback domain.
 */
export interface PolicyActiveRollbackOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}
