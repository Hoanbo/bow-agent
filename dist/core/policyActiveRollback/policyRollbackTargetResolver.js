// src/core/policyActiveRollback/policyRollbackTargetResolver.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Governed Rollback Target Resolver (Component 809).
// Resolves and validates candidate rollback targets deterministically from historical policies.
// Rejects arbitrary file paths, cross-tenant references, corrupted targets, and any target
// that would downgrade the hard-forbidden safety floor.
//
// Invariants:
// - DETERMINISTIC_RESOLUTION: Target must be explicitly identifiable by immutable version/targetId
// - ZERO_ARBITRARY_SELECTION: Never selects an arbitrary "previous policy"
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - HARD_FORBIDDEN_PROTECTION: Floor cannot be downgraded
// - FAIL_CLOSED: Any ambiguity, missing record, or corruption causes immediate rejection
// - USER_STOP > EVERYTHING
import path from 'node:path';
import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from './policyActiveRollbackTypes.js';
import { PolicyActiveRollbackStore } from './policyActiveRollbackStore.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyRollbackTargetResolver {
    baseDir;
    isUserStopActiveFn;
    store;
    constructor(options, store) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.store = store ?? new PolicyActiveRollbackStore(options);
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Target resolution suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('TARGET_RESOLVER_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        // Strict isolation & traversal protection via resolveUserPartition
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Resolves a historical rollback target explicitly by version or targetId.
     */
    resolveTarget(params) {
        this.assertUserStopInactive();
        const now = new Date().toISOString();
        const { tenantPartition, targetPolicyVersion, targetId, currentActiveVersion } = params;
        // 1. Tenant validation
        try {
            this.validateTenant(tenantPartition);
        }
        catch (err) {
            return Object.freeze({
                success: false,
                target: null,
                tenantPartition: tenantPartition ?? 'UNKNOWN_TENANT',
                failureReason: `TENANT_ISOLATION_FAILURE: ${err.message}`,
                resolvedAt: now,
            });
        }
        // 2. Explicit identifier requirement
        if ((!targetPolicyVersion || targetPolicyVersion.trim().length === 0) &&
            (!targetId || targetId.trim().length === 0)) {
            return Object.freeze({
                success: false,
                target: null,
                tenantPartition,
                failureReason: 'MISSING_TARGET_IDENTIFIER: Rollback target must be explicitly specified by version or targetId. Autonomous or arbitrary target selection is strictly prohibited.',
                resolvedAt: now,
            });
        }
        // 2.5 Invariant check: ACTIVE_POLICY != ROLLBACK_TARGET
        if (currentActiveVersion && targetPolicyVersion && targetPolicyVersion.trim() === currentActiveVersion.trim()) {
            return Object.freeze({
                success: false,
                target: null,
                tenantPartition,
                failureReason: `TARGET_EQUALS_ACTIVE_POLICY: Requested rollback target '${targetPolicyVersion}' is already the currently active policy version`,
                resolvedAt: now,
            });
        }
        // 3. Retrieval from store
        let candidate = null;
        if (targetId && targetId.trim().length > 0) {
            candidate = this.store.getHistoricalPolicyById(tenantPartition, targetId.trim());
        }
        else if (targetPolicyVersion && targetPolicyVersion.trim().length > 0) {
            candidate = this.store.getHistoricalPolicyByVersion(tenantPartition, targetPolicyVersion.trim());
        }
        if (!candidate) {
            return Object.freeze({
                success: false,
                target: null,
                tenantPartition,
                failureReason: `UNKNOWN_ROLLBACK_TARGET: No verified historical policy found for tenant '${tenantPartition}' matching criteria`,
                resolvedAt: now,
            });
        }
        // 4. Same tenant boundary enforcement
        if (candidate.tenantPartition !== tenantPartition) {
            return Object.freeze({
                success: false,
                target: null,
                tenantPartition,
                failureReason: `CROSS_TENANT_VIOLATION: Target belongs to tenant '${candidate.tenantPartition}', not '${tenantPartition}'`,
                resolvedAt: now,
            });
        }
        // 5. Active policy vs Rollback target identity invariant:
        // ACTIVE_POLICY != ROLLBACK_TARGET
        if (currentActiveVersion && candidate.policyVersion === currentActiveVersion) {
            return Object.freeze({
                success: false,
                target: null,
                tenantPartition,
                failureReason: `TARGET_EQUALS_ACTIVE_POLICY: Requested rollback target '${candidate.policyVersion}' is already the currently active policy version`,
                resolvedAt: now,
            });
        }
        // 6. Integrity and verification check
        if (!candidate.verified) {
            return Object.freeze({
                success: false,
                target: null,
                tenantPartition,
                failureReason: `CORRUPTED_TARGET_REJECTED: Historical policy '${candidate.policyVersion}' was not verified or has corrupted verification state`,
                resolvedAt: now,
            });
        }
        if (!candidate.provenanceHeadHash || candidate.provenanceHeadHash.trim().length === 0) {
            return Object.freeze({
                success: false,
                target: null,
                tenantPartition,
                failureReason: `PROVENANCE_INVALID_TARGET: Target '${candidate.policyVersion}' lacks valid provenanceHeadHash`,
                resolvedAt: now,
            });
        }
        // 7. Structural compatibility check
        if (!candidate.policyModifications || typeof candidate.policyModifications !== 'object') {
            return Object.freeze({
                success: false,
                target: null,
                tenantPartition,
                failureReason: `STRUCTURAL_INCOMPATIBILITY: Target '${candidate.policyVersion}' has invalid or missing policyModifications`,
                resolvedAt: now,
            });
        }
        // 8. Hard-forbidden floor check
        const serialized = JSON.stringify(candidate.policyModifications).toLowerCase();
        for (const action of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
            // If the policy attempts to classify a hard-forbidden action as PERMIT or ALLOWED,
            // or weakens it below FORBIDDEN, fail closed.
            const actionClass = candidate.policyModifications[action] ??
                candidate.policyModifications.actionClassifications?.[action];
            if (actionClass && actionClass !== 'FORBIDDEN') {
                return Object.freeze({
                    success: false,
                    target: null,
                    tenantPartition,
                    failureReason: `HARD_FORBIDDEN_DOWNGRADE_BLOCKED: Target policy '${candidate.policyVersion}' attempts to alter hard-forbidden action '${action}' to '${actionClass}'`,
                    resolvedAt: now,
                });
            }
            // Check if modifications serialized contain forbidden permission grants
            if (serialized.includes(`"${action}":"permit"`) || serialized.includes(`"${action}":"allowed"`)) {
                return Object.freeze({
                    success: false,
                    target: null,
                    tenantPartition,
                    failureReason: `HARD_FORBIDDEN_DOWNGRADE_BLOCKED: Target policy '${candidate.policyVersion}' grants forbidden action '${action}'`,
                    resolvedAt: now,
                });
            }
        }
        return Object.freeze({
            success: true,
            target: candidate,
            tenantPartition,
            resolvedAt: now,
        });
    }
}
