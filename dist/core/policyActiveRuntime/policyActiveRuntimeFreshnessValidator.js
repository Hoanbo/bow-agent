// src/core/policyActiveRuntime/policyActiveRuntimeFreshnessValidator.ts
// BOWCON V4.0 — MS-1.3.71: GOVERNED ACTIVE POLICY RUNTIME SYNCHRONIZATION & ENFORCEMENT BRIDGE
//
// Governed Active Policy Freshness & Integrity Validator (Component 798).
// Independently verifies that a candidate ActivePolicyState retrieved from storage
// is fresh, uncorrupted, properly bound to the tenant, non-superseded, and adheres
// to the non-negotiable hard-forbidden safety floor.
//
// Authority Invariants:
// - VALIDATION_GRANTS_ZERO_AUTHORITY
// - HARD_FORBIDDEN_FLOOR > ANY_DYNAMIC_POLICY
// - CORRUPTED_OR_STALE_POLICY_FAILS_CLOSED
// - USER_STOP > EVERYTHING
import { CANONICAL_HARD_FORBIDDEN_ACTIONS } from '../policyEnforcement/policyEnforcementTypes.js';
export class PolicyActiveRuntimeFreshnessValidator {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Active policy freshness validation suspended by USER_STOP supremacy');
        }
    }
    /**
     * Evaluates the integrity and freshness of an ActivePolicyState record.
     * Compares against current known version if one exists to detect stale/superseded policies.
     */
    validateFreshness(activeState, tenantPartition, currentKnownVersion) {
        this.assertUserStopInactive();
        const issues = [];
        if (!activeState) {
            return {
                status: 'CORRUPTED',
                isValid: false,
                issues: ['ACTIVE_POLICY_NULL_OR_UNDEFINED: No active policy state record found in storage.'],
                validatedVersion: 'unknown',
            };
        }
        // 1. Validate tenant binding
        if (activeState.tenantPartition !== tenantPartition) {
            issues.push(`TENANT_PARTITION_MISMATCH: Expected tenant '${tenantPartition}', but active policy state belongs to '${activeState.tenantPartition}'.`);
        }
        // 2. Validate essential governance flags
        if (activeState.isActivePolicy !== true || activeState.isActivated !== true) {
            issues.push('GOVERNANCE_FLAG_INVALID: Active policy state must have isActivePolicy: true and isActivated: true.');
        }
        // 3. Validate branded IDs and linkages
        if (!activeState.activePolicyStateId || typeof activeState.activePolicyStateId !== 'string') {
            issues.push('MISSING_ACTIVE_POLICY_STATE_ID: activePolicyStateId is required.');
        }
        if (!activeState.activationCommitId || typeof activeState.activationCommitId !== 'string') {
            issues.push('MISSING_ACTIVATION_COMMIT_ID: activationCommitId is required.');
        }
        if (!activeState.stagedActivationId || typeof activeState.stagedActivationId !== 'string') {
            issues.push('MISSING_STAGED_ACTIVATION_ID: stagedActivationId is required.');
        }
        if (!activeState.candidateDraftId || typeof activeState.candidateDraftId !== 'string') {
            issues.push('MISSING_CANDIDATE_DRAFT_ID: candidateDraftId is required.');
        }
        if (!activeState.provenanceHeadHash || typeof activeState.provenanceHeadHash !== 'string') {
            issues.push('MISSING_PROVENANCE_HEAD_HASH: provenanceHeadHash is required.');
        }
        // 4. Validate version format
        const version = activeState.activePolicyVersion;
        if (!version || typeof version !== 'string' || version.trim().length === 0) {
            issues.push('INVALID_VERSION_IDENTIFIER: activePolicyVersion must be a non-empty string.');
        }
        // 5. Check if superseded or stale relative to current active version
        if (currentKnownVersion && version) {
            if (version === currentKnownVersion) {
                // Equal version is valid (idempotent reload)
            }
            else if (this.isVersionStale(version, currentKnownVersion)) {
                issues.push(`STALE_ACTIVE_POLICY: Version '${version}' is older than currently synchronized version '${currentKnownVersion}'.`);
            }
        }
        // 6. Hard-forbidden floor invariant
        // Dynamic modifications cannot reclassify canonical hard-forbidden actions to OBSERVE, RECOMMEND, or REVERSIBLE
        if (activeState.activeModifications) {
            const toolOverrides = activeState.activeModifications.toolClassifications || activeState.activeModifications.toolOverrides;
            if (toolOverrides && typeof toolOverrides === 'object') {
                for (const forbidden of CANONICAL_HARD_FORBIDDEN_ACTIONS) {
                    const override = toolOverrides[forbidden];
                    if (override && override !== 'FORBIDDEN') {
                        issues.push(`HARD_FORBIDDEN_FLOOR_VIOLATION: Attempted to downgrade hard-forbidden action '${forbidden}' to '${override}'.`);
                    }
                }
            }
        }
        if (issues.length > 0) {
            const isStale = issues.some(i => i.startsWith('STALE_ACTIVE_POLICY'));
            const isMismatch = issues.some(i => i.startsWith('TENANT_PARTITION_MISMATCH'));
            const status = isMismatch
                ? 'MISMATCH'
                : isStale
                    ? 'STALE'
                    : 'CORRUPTED';
            return {
                status,
                isValid: false,
                issues: Object.freeze(issues),
                validatedVersion: version || 'unknown',
            };
        }
        return {
            status: 'FRESH',
            isValid: true,
            issues: Object.freeze([]),
            validatedVersion: version,
        };
    }
    /**
     * Helper to check if incoming version is older than known version.
     */
    isVersionStale(incoming, known) {
        const incParts = incoming.replace(/^v/i, '').split('.').map(Number);
        const knownParts = known.replace(/^v/i, '').split('.').map(Number);
        if (incParts.every(n => !Number.isNaN(n)) && knownParts.every(n => !Number.isNaN(n))) {
            for (let i = 0; i < Math.max(incParts.length, knownParts.length); i++) {
                const a = incParts[i] ?? 0;
                const b = knownParts[i] ?? 0;
                if (a < b)
                    return true;
                if (a > b)
                    return false;
            }
            return false;
        }
        // Non-semantic fallback: string comparison
        return incoming < known;
    }
}
