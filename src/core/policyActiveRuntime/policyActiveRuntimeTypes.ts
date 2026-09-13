// src/core/policyActiveRuntime/policyActiveRuntimeTypes.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Canonical type definitions and DTO contracts for governed active policy runtime synchronization,
// snapshot resolution, freshness validation, PDP evaluation bridge, PEP enforcement bridge,
// cryptographic provenance, and audit logging.
//
// Core Authority Invariants:
// - ACTIVE_POLICY != RUNTIME_POLICY_SNAPSHOT
// - RUNTIME_POLICY_SNAPSHOT != POLICY_MUTATION
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK
// - ZERO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING

import type { ActionClassification } from '../policyDecisionPoint.js';
import type {
  ActivePolicyState,
  ActivePolicyStateId,
  ActivationCommitId,
} from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { CandidateDraftId } from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type ActiveRuntimeSyncId = string & { readonly __brand: unique symbol };
export type RuntimePolicySnapshotId = string & { readonly __brand: unique symbol };
export type RuntimePolicyEnforcementId = string & { readonly __brand: unique symbol };
export type ActiveRuntimeProvenanceId = string & { readonly __brand: unique symbol };

export function createActiveRuntimeSyncId(raw: string): ActiveRuntimeSyncId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_SYNC_ID: ActiveRuntimeSyncId must be a non-empty string');
  }
  return raw.trim() as ActiveRuntimeSyncId;
}

export function createRuntimePolicySnapshotId(raw: string): RuntimePolicySnapshotId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_SNAPSHOT_ID: RuntimePolicySnapshotId must be a non-empty string');
  }
  return raw.trim() as RuntimePolicySnapshotId;
}

export function createRuntimePolicyEnforcementId(raw: string): RuntimePolicyEnforcementId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_ENFORCEMENT_ID: RuntimePolicyEnforcementId must be a non-empty string');
  }
  return raw.trim() as RuntimePolicyEnforcementId;
}

export function createActiveRuntimeProvenanceId(raw: string): ActiveRuntimeProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_PROVENANCE_ID: ActiveRuntimeProvenanceId must be a non-empty string');
  }
  return raw.trim() as ActiveRuntimeProvenanceId;
}

// ============================================================================
// STATE ENUMS
// ============================================================================

export type ActiveRuntimeSyncState =
  | 'SYNC_IDLE'
  | 'SYNC_REQUESTED'
  | 'SYNC_IN_PROGRESS'
  | 'SYNC_COMPLETED'
  | 'SYNC_STALE_REJECTED'
  | 'SYNC_SUPERSEDED_REJECTED'
  | 'SYNC_CORRUPTED_REJECTED'
  | 'SYNC_BLOCKED'
  | 'SYNC_FAILED';

export type RuntimePolicyFreshnessStatus =
  | 'FRESH'
  | 'STALE'
  | 'SUPERSEDED'
  | 'CORRUPTED'
  | 'UNKNOWN'
  | 'MISMATCH';

export type RuntimeEnforcementDisposition =
  | 'PERMIT'
  | 'DENY'
  | 'REQUIRES_APPROVAL'
  | 'FORBIDDEN'
  | 'BLOCKED_BY_USER_STOP'
  | 'BLOCKED_CORRUPTED';

// ============================================================================
// DTO CONTRACTS
// ============================================================================

/**
 * Immutable Runtime Policy Snapshot representation.
 * Consumed by PDP/PEP without exposing mutable references.
 */
export interface RuntimePolicySnapshot {
  readonly snapshotId: RuntimePolicySnapshotId;
  readonly activePolicyStateId: ActivePolicyStateId;
  readonly activationCommitId: ActivationCommitId;
  readonly tenantPartition: string;
  readonly policyVersion: string;
  readonly previousPolicyVersion: string;
  readonly targetPolicyDomain: string;
  readonly effectiveModifications: Record<string, any>;
  readonly toolClassifications: Record<string, ActionClassification>;
  readonly guardrailParameters: Record<string, any>;
  readonly governedByCandidateId: CandidateDraftId;
  readonly humanActivationAuthority: {
    readonly activatedBy: string;
    readonly activatedRole: string;
    readonly activatedAt: string;
  };
  readonly provenanceHeadHash: string;
  readonly snapshotHash: string;
  readonly resolvedAt: string;
  readonly isGovernedActiveSnapshot: true;
  readonly isAutonomousMutation: false;
}

/**
 * Result of runtime synchronization.
 */
export interface ActiveRuntimeSyncResult {
  readonly syncId: ActiveRuntimeSyncId;
  readonly tenantPartition: string;
  readonly state: ActiveRuntimeSyncState;
  readonly snapshot: RuntimePolicySnapshot | null;
  readonly syncedAt: string;
  readonly syncDurationMs: number;
  readonly rejectionReason?: string;
}

/**
 * Result of resolving an active policy snapshot for a tenant.
 */
export interface RuntimePolicyResolutionResult {
  readonly success: boolean;
  readonly snapshot: RuntimePolicySnapshot | null;
  readonly tenantPartition: string;
  readonly freshnessStatus: RuntimePolicyFreshnessStatus;
  readonly reason?: string;
}

/**
 * Governed PDP evaluation decision against the active runtime policy snapshot.
 */
export interface RuntimePDPDecision {
  readonly action: string;
  readonly allowed: boolean;
  readonly classification: ActionClassification;
  readonly requiresApproval: boolean;
  readonly reason: string;
  readonly snapshotId: RuntimePolicySnapshotId;
  readonly tenantPartition: string;
  readonly evaluatedAt: string;
}

/**
 * Governed PEP enforcement result prior to execution.
 */
export interface RuntimePEPEnforcementResult {
  readonly enforcementId: RuntimePolicyEnforcementId;
  readonly action: string;
  readonly disposition: RuntimeEnforcementDisposition;
  readonly decision: RuntimePDPDecision;
  readonly tenantPartition: string;
  readonly approvalId?: string;
  readonly enforcedAt: string;
}

/**
 * Cryptographic provenance record for active runtime synchronization.
 */
export interface ActiveRuntimeProvenanceRecord {
  readonly provenanceId: ActiveRuntimeProvenanceId;
  readonly tenantPartition: string;
  readonly activePolicyStateId: ActivePolicyStateId;
  readonly snapshotId?: RuntimePolicySnapshotId;
  readonly enforcementId?: RuntimePolicyEnforcementId;
  readonly eventType: string;
  readonly timestamp: string;
  readonly previousHash: string;
  readonly recordHash: string;
  readonly payloadHash: string;
}

/**
 * Options for policy active runtime components.
 */
export interface PolicyActiveRuntimeOptions {
  readonly baseDir?: string;
  readonly isUserStopActive?: () => boolean;
}
