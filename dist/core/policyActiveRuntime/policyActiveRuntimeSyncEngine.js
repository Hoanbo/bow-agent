// src/core/policyActiveRuntime/policyActiveRuntimeSyncEngine.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Governed Active Policy Runtime Synchronization Engine (Component 799).
// Ingests committed ActivePolicyState records from PolicyActivationStateStore,
// validates freshness, constructs deeply immutable RuntimePolicySnapshot artifacts,
// and manages race-safe atomic in-memory tenant cache updates.
//
// Authority Invariants:
// - SYNC_GRANTS_ZERO_AUTHORITY: Produces read-only runtime snapshots
// - NO_IN_PLACE_MUTATION_OF_ACTIVE_POLICY
// - ATOMIC_SNAPSHOT_REPLACEMENT_ELIMINATES_RACE_CONDITIONS
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import { PolicyActivationStateStore } from '../policyStagedActivation/policyActivationStateStore.js';
import { createActiveRuntimeSyncId, createRuntimePolicySnapshotId, } from './policyActiveRuntimeTypes.js';
import { PolicyActiveRuntimeFreshnessValidator } from './policyActiveRuntimeFreshnessValidator.js';
export class PolicyActiveRuntimeSyncEngine {
    stateStore;
    freshnessValidator;
    isUserStopActiveFn;
    // In-memory tenant active snapshot cache: tenantPartition -> RuntimePolicySnapshot
    // Atomic reference swap on sync ensures race-safe reads by PDP/PEP
    activeSnapshots = new Map();
    constructor(options, stateStore, freshnessValidator) {
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.stateStore = stateStore ?? new PolicyActivationStateStore(options);
        this.freshnessValidator = freshnessValidator ?? new PolicyActiveRuntimeFreshnessValidator(options);
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active policy runtime synchronization suspended by USER_STOP supremacy');
        }
    }
    /**
     * Synchronizes the active policy for a tenant partition from storage.
     * Idempotent: repeated synchronization of unchanged active policy returns the existing snapshot.
     */
    syncTenantActivePolicy(tenantPartition) {
        this.assertUserStopInactive();
        const startTime = Date.now();
        const syncId = createActiveRuntimeSyncId(`arsync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('SYNC_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        const cleanTenant = tenantPartition.trim();
        // 1. Fetch committed active policy from durable store
        let activeState = null;
        try {
            activeState = this.stateStore.getActivePolicy(cleanTenant);
        }
        catch (err) {
            return {
                syncId,
                tenantPartition: cleanTenant,
                state: 'SYNC_CORRUPTED_REJECTED',
                snapshot: null,
                syncedAt: new Date().toISOString(),
                syncDurationMs: Date.now() - startTime,
                rejectionReason: `STORE_READ_ERROR: ${err.message}`,
            };
        }
        if (!activeState) {
            return {
                syncId,
                tenantPartition: cleanTenant,
                state: 'SYNC_FAILED',
                snapshot: null,
                syncedAt: new Date().toISOString(),
                syncDurationMs: Date.now() - startTime,
                rejectionReason: `NO_ACTIVE_POLICY: Tenant '${cleanTenant}' does not have a committed active policy state.`,
            };
        }
        // 2. Validate freshness and integrity
        const currentSnapshot = this.activeSnapshots.get(cleanTenant);
        const freshness = this.freshnessValidator.validateFreshness(activeState, cleanTenant, currentSnapshot?.policyVersion);
        if (!freshness.isValid) {
            const state = freshness.status === 'STALE'
                ? 'SYNC_STALE_REJECTED'
                : freshness.status === 'SUPERSEDED'
                    ? 'SYNC_SUPERSEDED_REJECTED'
                    : 'SYNC_CORRUPTED_REJECTED';
            return {
                syncId,
                tenantPartition: cleanTenant,
                state,
                snapshot: null,
                syncedAt: new Date().toISOString(),
                syncDurationMs: Date.now() - startTime,
                rejectionReason: freshness.issues.join('; '),
            };
        }
        // 3. Idempotency check: if snapshot already cached with same version and state ID, return existing
        if (currentSnapshot &&
            currentSnapshot.activePolicyStateId === activeState.activePolicyStateId &&
            currentSnapshot.policyVersion === activeState.activePolicyVersion &&
            currentSnapshot.provenanceHeadHash === activeState.provenanceHeadHash) {
            return {
                syncId,
                tenantPartition: cleanTenant,
                state: 'SYNC_COMPLETED',
                snapshot: currentSnapshot,
                syncedAt: new Date().toISOString(),
                syncDurationMs: Date.now() - startTime,
            };
        }
        // 4. Construct immutable RuntimePolicySnapshot
        const snapshot = this.createRuntimeSnapshot(activeState);
        // 5. Atomic reference swap in cache
        this.activeSnapshots.set(cleanTenant, snapshot);
        return {
            syncId,
            tenantPartition: cleanTenant,
            state: 'SYNC_COMPLETED',
            snapshot,
            syncedAt: new Date().toISOString(),
            syncDurationMs: Date.now() - startTime,
        };
    }
    /**
     * Retrieves the currently synchronized snapshot for a tenant without re-syncing.
     */
    getCachedSnapshot(tenantPartition) {
        this.assertUserStopInactive();
        return this.activeSnapshots.get(tenantPartition.trim()) ?? null;
    }
    /**
     * Internal builder for immutable RuntimePolicySnapshot.
     */
    createRuntimeSnapshot(state) {
        const snapshotId = createRuntimePolicySnapshotId(`rpsnap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
        const modifications = state.activeModifications ?? {};
        const toolClassifications = {
            ...(modifications.toolClassifications || modifications.toolOverrides || {}),
        };
        const guardrailParameters = {
            ...(modifications.guardrails || modifications.guardrailParameters || {}),
        };
        const payloadForHash = {
            snapshotId,
            activePolicyStateId: state.activePolicyStateId,
            activationCommitId: state.activationCommitId,
            tenantPartition: state.tenantPartition,
            policyVersion: state.activePolicyVersion,
            modifications,
            toolClassifications,
            guardrailParameters,
            activatedBy: state.activatedBy,
            activatedRole: state.activatedRole,
            provenanceHeadHash: state.provenanceHeadHash,
        };
        const snapshotHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(payloadForHash))
            .digest('hex');
        const snapshot = {
            snapshotId,
            activePolicyStateId: state.activePolicyStateId,
            activationCommitId: state.activationCommitId,
            tenantPartition: state.tenantPartition,
            policyVersion: state.activePolicyVersion,
            previousPolicyVersion: state.previousPolicyVersion,
            targetPolicyDomain: state.targetPolicyDomain,
            effectiveModifications: Object.freeze({ ...modifications }),
            toolClassifications: Object.freeze(toolClassifications),
            guardrailParameters: Object.freeze(guardrailParameters),
            governedByCandidateId: state.candidateDraftId,
            humanActivationAuthority: Object.freeze({
                activatedBy: state.activatedBy,
                activatedRole: state.activatedRole,
                activatedAt: state.activatedAt,
            }),
            provenanceHeadHash: state.provenanceHeadHash,
            snapshotHash,
            resolvedAt: new Date().toISOString(),
            isGovernedActiveSnapshot: true,
            isAutonomousMutation: false,
        };
        return Object.freeze(snapshot);
    }
}
