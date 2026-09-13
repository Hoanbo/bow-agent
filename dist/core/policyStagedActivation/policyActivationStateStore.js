// src/core/policyStagedActivation/policyActivationStateStore.ts
// BOWCON V4.0 — MS-1.3.70: GOVERNED STAGED POLICY ACTIVATION LAYER
//
// Governed Policy Activation State Store (Component 792).
// Provides durable, tenant-isolated, crash-safe persistence for StagedPolicy artifacts
// and ActivePolicyState records.
//
// Guarantees:
// 1. Strict tenant partition isolation via resolveUserPartition
// 2. Anti-duplicate idempotency and conflicting overwrite protection
// 3. Atomic durable file replacement (temp file write + rename)
// 4. Secret sanitization via DiagnosisSanitizer
// 5. Fail-closed storage corruption handling (ACTIVATION_STORE_CORRUPTION)
// 6. USER_STOP supremacy over all persistence operations
//
// Authority Invariants:
// - STORE_GRANTS_ZERO_AUTHORITY: Storage holds audit/governance records only
// - USER_STOP > ALL_PERSISTENCE_OPERATIONS
import fs from 'node:fs';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class PolicyActivationStateStore {
    baseDir;
    isUserStopActiveFn;
    sanitizer;
    // In-memory tenant caches:
    // tenantPartition -> stagedActivationId -> StagedPolicy
    stagedPolicies = new Map();
    // tenantPartition -> candidateDraftId -> stagedActivationId
    candidateStagedLookup = new Map();
    // tenantPartition -> ActivePolicyState (at most one active policy per tenant)
    activePolicies = new Map();
    constructor(options, sanitizer) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Activation state store suspended by USER_STOP supremacy');
        }
    }
    getTenantStorageDir(tenantPartition, subDir) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('STORE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        const resolved = resolveUserPartition(tenantPartition.trim(), this.baseDir);
        const targetDir = path.join(resolved.baseDir, resolved.partitionKey, subDir);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        return targetDir;
    }
    loadTenantStateIfEmpty(tenantPartition) {
        if (this.stagedPolicies.has(tenantPartition)) {
            return;
        }
        const stagedMap = new Map();
        const candLookup = new Map();
        this.stagedPolicies.set(tenantPartition, stagedMap);
        this.candidateStagedLookup.set(tenantPartition, candLookup);
        // 1. Load staged policies
        const stagedDir = this.getTenantStorageDir(tenantPartition, 'staged_policies');
        const stagedFile = path.join(stagedDir, 'staged_policies.json');
        if (fs.existsSync(stagedFile)) {
            try {
                const raw = fs.readFileSync(stagedFile, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    for (const sp of parsed) {
                        if (sp && sp.stagedActivationId && sp.tenantPartition === tenantPartition) {
                            stagedMap.set(sp.stagedActivationId, Object.freeze(sp));
                            candLookup.set(sp.candidateDraftId, sp.stagedActivationId);
                        }
                    }
                }
            }
            catch (err) {
                throw new Error(`ACTIVATION_STORE_CORRUPTION: Failed to parse staged policies for tenant '${tenantPartition}': ${err.message}`);
            }
        }
        // 2. Load active policy
        const activeDir = this.getTenantStorageDir(tenantPartition, 'active_policy');
        const activeFile = path.join(activeDir, 'active_policy.json');
        if (fs.existsSync(activeFile)) {
            try {
                const raw = fs.readFileSync(activeFile, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed && parsed.activePolicyStateId && parsed.tenantPartition === tenantPartition) {
                    this.activePolicies.set(tenantPartition, Object.freeze(parsed));
                }
            }
            catch (err) {
                throw new Error(`ACTIVATION_STORE_CORRUPTION: Failed to parse active policy for tenant '${tenantPartition}': ${err.message}`);
            }
        }
    }
    persistStagedPolicies(tenantPartition) {
        const stagedDir = this.getTenantStorageDir(tenantPartition, 'staged_policies');
        const stagedFile = path.join(stagedDir, 'staged_policies.json');
        const tempFile = path.join(stagedDir, `staged_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);
        const list = Array.from(this.stagedPolicies.get(tenantPartition)?.values() ?? []);
        const sanitized = this.sanitizer.sanitize(list);
        fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
        fs.renameSync(tempFile, stagedFile);
    }
    persistActivePolicy(tenantPartition) {
        const activeDir = this.getTenantStorageDir(tenantPartition, 'active_policy');
        const activeFile = path.join(activeDir, 'active_policy.json');
        const tempFile = path.join(activeDir, `active_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);
        const active = this.activePolicies.get(tenantPartition);
        const sanitized = active ? this.sanitizer.sanitize(active) : null;
        fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
        fs.renameSync(tempFile, activeFile);
    }
    /**
     * Saves a staged policy record with anti-duplicate idempotency.
     */
    saveStagedPolicy(staged) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(staged.tenantPartition);
        const stagedMap = this.stagedPolicies.get(staged.tenantPartition);
        const candLookup = this.candidateStagedLookup.get(staged.tenantPartition);
        const frozen = Object.freeze({ ...staged });
        stagedMap.set(frozen.stagedActivationId, frozen);
        candLookup.set(frozen.candidateDraftId, frozen.stagedActivationId);
        this.persistStagedPolicies(staged.tenantPartition);
        return frozen;
    }
    /**
     * Saves and updates the active policy record for a tenant.
     */
    saveActivePolicy(activeState) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(activeState.tenantPartition);
        const frozen = Object.freeze({ ...activeState });
        this.activePolicies.set(activeState.tenantPartition, frozen);
        this.persistActivePolicy(activeState.tenantPartition);
        return frozen;
    }
    /**
     * Retrieves a staged policy by candidateDraftId.
     */
    getStagedByCandidate(tenantPartition, candidateDraftId) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        const candLookup = this.candidateStagedLookup.get(tenantPartition);
        const stagedId = candLookup?.get(candidateDraftId);
        if (!stagedId)
            return null;
        return this.stagedPolicies.get(tenantPartition)?.get(stagedId) ?? null;
    }
    /**
     * Retrieves the current active policy state for a tenant.
     */
    getActivePolicy(tenantPartition) {
        this.assertUserStopInactive();
        this.loadTenantStateIfEmpty(tenantPartition);
        return this.activePolicies.get(tenantPartition) ?? null;
    }
}
