import type { ActionClassification } from '../policyDecisionPoint.js';
import type { ActivePolicyStateId, ActivationCommitId } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { CandidateDraftId } from '../policyEvolutionPlanning/policyEvolutionPlanningTypes.js';
export type ActiveRuntimeSyncId = string & {
    readonly __brand: unique symbol;
};
export type RuntimePolicySnapshotId = string & {
    readonly __brand: unique symbol;
};
export type RuntimePolicyEnforcementId = string & {
    readonly __brand: unique symbol;
};
export type ActiveRuntimeProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createActiveRuntimeSyncId(raw: string): ActiveRuntimeSyncId;
export declare function createRuntimePolicySnapshotId(raw: string): RuntimePolicySnapshotId;
export declare function createRuntimePolicyEnforcementId(raw: string): RuntimePolicyEnforcementId;
export declare function createActiveRuntimeProvenanceId(raw: string): ActiveRuntimeProvenanceId;
export type ActiveRuntimeSyncState = 'SYNC_IDLE' | 'SYNC_REQUESTED' | 'SYNC_IN_PROGRESS' | 'SYNC_COMPLETED' | 'SYNC_STALE_REJECTED' | 'SYNC_SUPERSEDED_REJECTED' | 'SYNC_CORRUPTED_REJECTED' | 'SYNC_BLOCKED' | 'SYNC_FAILED';
export type RuntimePolicyFreshnessStatus = 'FRESH' | 'STALE' | 'SUPERSEDED' | 'CORRUPTED' | 'UNKNOWN' | 'MISMATCH';
export type RuntimeEnforcementDisposition = 'PERMIT' | 'DENY' | 'REQUIRES_APPROVAL' | 'FORBIDDEN' | 'BLOCKED_BY_USER_STOP' | 'BLOCKED_CORRUPTED';
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
