import type { ActivePolicyStateId } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshotId } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
export type LifecycleReconciliationId = string & {
    readonly __brand: unique symbol;
};
export type LifecycleConsistencyCheckId = string & {
    readonly __brand: unique symbol;
};
export type LifecycleDriftId = string & {
    readonly __brand: unique symbol;
};
export type RuntimeConsistencyId = string & {
    readonly __brand: unique symbol;
};
export type LifecycleVerificationId = string & {
    readonly __brand: unique symbol;
};
export type ReconciliationProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createLifecycleReconciliationId(raw: string): LifecycleReconciliationId;
export declare function createLifecycleConsistencyCheckId(raw: string): LifecycleConsistencyCheckId;
export declare function createLifecycleDriftId(raw: string): LifecycleDriftId;
export declare function createRuntimeConsistencyId(raw: string): RuntimeConsistencyId;
export declare function createLifecycleVerificationId(raw: string): LifecycleVerificationId;
export declare function createReconciliationProvenanceId(raw: string): ReconciliationProvenanceId;
export type LifecycleReconciliationStatus = 'CONSISTENT' | 'INCONSISTENT' | 'DRIFT_DETECTED' | 'STALE_RUNTIME' | 'VERSION_CONFLICT' | 'TENANT_MISMATCH' | 'PROVENANCE_INVALID' | 'ROLLBACK_STATE_CONFLICT' | 'SUNSET_STATE_CONFLICT' | 'RECOVERY_STATE_CONFLICT' | 'USER_STOP_BLOCKED' | 'CORRUPTED';
export type DriftSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type LifecycleDriftCategory = 'ACTIVE_POLICY_MISSING' | 'ACTIVE_POLICY_WITHOUT_RUNTIME_SNAPSHOT' | 'RUNTIME_SNAPSHOT_WITHOUT_ACTIVE_POLICY' | 'STALE_RUNTIME_SNAPSHOT' | 'WRONG_POLICY_VERSION' | 'WRONG_TENANT_RUNTIME' | 'SUPERSEDED_RUNTIME_SNAPSHOT' | 'PROVENANCE_MISMATCH' | 'PDP_SNAPSHOT_MISMATCH' | 'PDP_FORBIDDEN_FLOOR_VIOLATION' | 'PEP_RUNTIME_MISMATCH' | 'ROLLBACK_COMMIT_WITHOUT_ACTIVE_STATE' | 'ACTIVE_STATE_WITHOUT_ROLLBACK_PROVENANCE' | 'ROLLBACK_TARGET_MISMATCH' | 'ROLLBACK_RUNTIME_DRIFT' | 'SUNSET_STATE_CONFLICT' | 'RECOVERY_STATE_CONFLICT' | 'TENANT_ISOLATION_BREACH' | 'PROVENANCE_TAMPER_DETECTED' | 'UNAUTHORIZED_MUTATION_EVIDENCE';
/**
 * Deterministic record of a detected drift or discrepancy.
 */
export interface LifecycleDriftRecord {
    readonly driftId: LifecycleDriftId;
    readonly category: LifecycleDriftCategory;
    readonly severity: DriftSeverity;
    readonly expected: string;
    readonly observed: string;
    readonly message: string;
    readonly governanceBoundaryViolated: string;
    readonly requiresHumanIntervention: boolean;
    readonly detectedAt: string;
}
/**
 * Result of checking a specific lifecycle boundary.
 */
export interface LifecycleBoundaryCheckResult {
    readonly checkId: LifecycleConsistencyCheckId;
    readonly boundaryName: string;
    readonly passed: boolean;
    readonly details: Record<string, any>;
    readonly blockingReasons: readonly string[];
    readonly checkedAt: string;
}
/**
 * Immutable Comprehensive Lifecycle Reconciliation Result.
 * Guarantees zero authority and zero policy mutation.
 */
export interface LifecycleReconciliationResult {
    readonly reconciliationId: LifecycleReconciliationId;
    readonly tenantPartition: string;
    readonly activePolicyStateId: ActivePolicyStateId | null;
    readonly runtimeSnapshotId: RuntimePolicySnapshotId | null;
    readonly expectedPolicyVersion: string | null;
    readonly observedPolicyVersion: string | null;
    readonly status: LifecycleReconciliationStatus;
    readonly isConsistent: boolean;
    readonly detectedDrifts: readonly LifecycleDriftRecord[];
    readonly blockingReasons: readonly string[];
    readonly verifiedBoundaries: readonly string[];
    readonly boundaryCheckResults: readonly LifecycleBoundaryCheckResult[];
    readonly provenanceStatus: 'VALID' | 'TAMPER_DETECTED' | 'MISSING' | 'INVALID';
    readonly rollbackStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE';
    readonly sunsetStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE';
    readonly recoveryStatus: 'CONSISTENT' | 'CONFLICT' | 'NOT_APPLICABLE';
    readonly checkedAt: string;
    readonly provenanceHash: string;
    readonly isActivePolicy: false;
    readonly isPolicyMutation: false;
    readonly isAutonomousMutation: false;
    readonly requiresHumanIntervention: boolean;
}
/**
 * Cryptographic provenance record for reconciliation audits.
 */
export interface ReconciliationProvenanceRecord {
    readonly provenanceId: ReconciliationProvenanceId;
    readonly tenantPartition: string;
    readonly reconciliationId: LifecycleReconciliationId;
    readonly status: LifecycleReconciliationStatus;
    readonly eventType: string;
    readonly timestamp: string;
    readonly previousHash: string;
    readonly recordHash: string;
    readonly payloadHash: string;
}
/**
 * Configuration options for policyActiveLifecycleReconciliation domain.
 */
export interface PolicyActiveLifecycleReconciliationOptions {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
