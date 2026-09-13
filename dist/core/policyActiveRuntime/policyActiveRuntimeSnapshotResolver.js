// src/core/policyActiveRuntime/policyActiveRuntimeSnapshotResolver.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Governed Active Policy Snapshot Resolver (Component 800).
// Resolves the current authoritative RuntimePolicySnapshot for an actor / tenant partition.
// Enforces:
// 1. Strict tenant isolation via resolveUserPartition
// 2. Traversal, null byte, and Windows device name rejection
// 3. Anonymous / guest role fail-closed rejection
// 4. USER_STOP supremacy
// 5. Automatic just-in-time synchronization on cache miss
//
// Authority Invariants:
// - RESOLUTION_GRANTS_ZERO_AUTHORITY: Produces read-only snapshots
// - TENANT_A_SNAPSHOT != TENANT_B_SNAPSHOT
// - UNRESOLVED_OR_CORRUPTED_POLICY_FAILS_CLOSED
// - USER_STOP > EVERYTHING
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { PolicyActiveRuntimeSyncEngine } from './policyActiveRuntimeSyncEngine.js';
export class PolicyActiveRuntimeSnapshotResolver {
    syncEngine;
    baseDir;
    isUserStopActiveFn;
    constructor(options, syncEngine) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.syncEngine = syncEngine ?? new PolicyActiveRuntimeSyncEngine(options);
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active policy snapshot resolution suspended by USER_STOP supremacy');
        }
    }
    /**
     * Resolves the active runtime policy snapshot for a given tenant / actor.
     * Enforces resolveUserPartition guards against path traversal and reserved device names.
     */
    resolveActivePolicySnapshot(actorTenantId) {
        this.assertUserStopInactive();
        // 1. Reject anonymous, empty, or guest actors fail-closed
        if (!actorTenantId ||
            typeof actorTenantId !== 'string' ||
            actorTenantId.trim().length === 0 ||
            actorTenantId.trim().toLowerCase() === 'anonymous' ||
            actorTenantId.trim().toLowerCase() === 'guest') {
            return {
                success: false,
                snapshot: null,
                tenantPartition: 'quarantine_anonymous',
                freshnessStatus: 'CORRUPTED',
                reason: 'ANONYMOUS_OR_GUEST_ACCESS_DENIED: Tenant identification required for active policy resolution.',
            };
        }
        const cleanTenant = actorTenantId.trim();
        // 2. Resolve partition boundary to enforce traversal & security constraints
        let partitionKey;
        try {
            const resolved = resolveUserPartition(cleanTenant, this.baseDir);
            partitionKey = resolved.partitionKey;
        }
        catch (err) {
            // Re-throw traversal, separator, and reserved name errors to maintain strict security barrier
            throw err;
        }
        // 3. Check memory cache in sync engine
        let snapshot = this.syncEngine.getCachedSnapshot(partitionKey);
        // 4. On cache miss, attempt just-in-time synchronization from durable store
        if (!snapshot) {
            const syncResult = this.syncEngine.syncTenantActivePolicy(partitionKey);
            if (syncResult.state === 'SYNC_COMPLETED' && syncResult.snapshot) {
                snapshot = syncResult.snapshot;
            }
            else {
                return {
                    success: false,
                    snapshot: null,
                    tenantPartition: partitionKey,
                    freshnessStatus: syncResult.state.includes('STALE')
                        ? 'STALE'
                        : syncResult.state.includes('SUPERSEDED')
                            ? 'SUPERSEDED'
                            : 'CORRUPTED',
                    reason: syncResult.rejectionReason ?? 'ACTIVE_POLICY_RESOLUTION_FAILED: Synchronization could not produce snapshot.',
                };
            }
        }
        // 5. Verify snapshot belongs strictly to the requested tenant partition (anti-tenant-crossing)
        if (snapshot.tenantPartition !== partitionKey) {
            return {
                success: false,
                snapshot: null,
                tenantPartition: partitionKey,
                freshnessStatus: 'MISMATCH',
                reason: `CROSS_TENANT_LEAKAGE_DETECTED: Snapshot tenant '${snapshot.tenantPartition}' does not match requested partition '${partitionKey}'.`,
            };
        }
        return {
            success: true,
            snapshot,
            tenantPartition: partitionKey,
            freshnessStatus: 'FRESH',
        };
    }
}
