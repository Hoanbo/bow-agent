// src/core/policyActiveIncidentResolution/policyRecoveryAuthorizationEngine.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Recovery Authorization Engine (Component 845).
// Prepares and validates human recovery authorizations for incidents requiring policy rollback/recovery.
// Verifies containment status, target version validity, tenant binding, hard-forbidden safety floors,
// and anti-self-approval invariants.
//
// Core Authority Invariants:
// - RECOVERY_AUTHORIZATION != RECOVERY_EXECUTION
// - RECOVERY_AUTHORIZATION != POLICY_MUTATION
// - RECOVERY_AUTHORIZATION != AUTONOMOUS_AUTHORIZATION
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - ZERO AUTONOMOUS RECOVERY
// - ZERO DIRECT TOOL EXECUTION
// - FAIL_CLOSED
import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import { createRecoveryAuthorizationId } from './policyActiveIncidentResolutionTypes.js';
export class PolicyRecoveryAuthorizationEngine {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Recovery authorization engine suspended by USER_STOP supremacy');
        }
    }
    /**
     * Evaluates preconditions and produces an immutable RecoveryAuthorizationRecord.
     * Zero execution: delegates execution to MS-1.3.72 rollback runtime.
     */
    authorizeRecovery(params) {
        this.assertUserStopInactive();
        const { tenantPartition, clearance, recoveryTarget, operatorId, operatorRole, governanceRationale, reconciliationResult, previousProvenanceHash, originalRequesterId, } = params;
        // 1. Operator validation & anti-autonomous enforcement
        if (!operatorId || typeof operatorId !== 'string' || operatorId.trim().length === 0) {
            throw new Error('RECOVERY_AUTHORIZATION_REJECTED: Operator identifier must be a non-empty string');
        }
        const opLower = operatorId.toLowerCase().trim();
        if (opLower.startsWith('auto_') ||
            opLower.startsWith('bot_') ||
            opLower.includes('ai_agent') ||
            opLower.includes('daemon') ||
            opLower === 'anonymous' ||
            opLower === 'guest') {
            throw new Error(`RECOVERY_AUTHORIZATION_REJECTED: Autonomous persona '${operatorId}' cannot authorize policy recovery.`);
        }
        // 2. Anti-self-approval enforcement
        if (originalRequesterId && originalRequesterId.trim() === operatorId.trim()) {
            throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Operator '${operatorId}' cannot authorize recovery for a request they initiated.`);
        }
        // 3. Rationale verification
        if (!governanceRationale || governanceRationale.trim().length < 10) {
            throw new Error('RECOVERY_AUTHORIZATION_REJECTED: Explicit human governance rationale (>= 10 characters) required.');
        }
        // 4. Containment Clearance verification
        if (!clearance || !clearance.clearanceId) {
            throw new Error('RECOVERY_AUTHORIZATION_REJECTED: Missing required containment clearance.');
        }
        if (clearance.tenantPartition !== tenantPartition) {
            throw new Error(`RECOVERY_AUTHORIZATION_REJECTED: Clearance tenant '${clearance.tenantPartition}' does not match '${tenantPartition}'.`);
        }
        // 5. Recovery Target validation & Tenant isolation
        if (!recoveryTarget || !recoveryTarget.targetId) {
            throw new Error('RECOVERY_AUTHORIZATION_REJECTED: Invalid or missing recovery target.');
        }
        if (recoveryTarget.tenantPartition !== tenantPartition) {
            throw new Error(`CROSS_TENANT_RECOVERY_BLOCKED: Recovery target tenant '${recoveryTarget.tenantPartition}' does not match requested tenant '${tenantPartition}'.`);
        }
        if (!recoveryTarget.verified) {
            throw new Error(`RECOVERY_TARGET_UNVERIFIED: Target version '${recoveryTarget.policyVersion}' has not been historically verified.`);
        }
        // 6. Hard-Forbidden Floor Protection
        if (recoveryTarget.policyModifications) {
            for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
                if (recoveryTarget.policyModifications[forbidden] !== undefined) {
                    throw new Error(`HARD_FORBIDDEN_FLOOR_BREACH: Target version attempts to modify hard-forbidden action '${forbidden}'.`);
                }
            }
        }
        // 7. Reconciliation consistency
        if (reconciliationResult) {
            if (reconciliationResult.status === 'PROVENANCE_INVALID' || reconciliationResult.status === 'CORRUPTED') {
                throw new Error(`RECONCILIATION_BLOCKING: Upstream reconciliation reports '${reconciliationResult.status}'. Recovery blocked.`);
            }
        }
        // 8. Provenance Hash
        if (!previousProvenanceHash || typeof previousProvenanceHash !== 'string' || previousProvenanceHash.trim().length === 0) {
            throw new Error('RECOVERY_AUTHORIZATION_REJECTED: Missing cryptographic provenance hash.');
        }
        const authorizationId = createRecoveryAuthorizationId(`ra_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        return Object.freeze({
            authorizationId,
            tenantPartition,
            incidentId: clearance.incidentId,
            clearanceId: clearance.clearanceId,
            recoveryTargetVersion: recoveryTarget.policyVersion,
            targetId: recoveryTarget.targetId,
            operatorId: operatorId.trim(),
            operatorRole,
            governanceRationale: governanceRationale.trim(),
            authorizedAt: new Date().toISOString(),
            isAutonomous: false,
            provenanceHash: previousProvenanceHash,
            isRecoveryExecution: false,
            isPolicyMutation: false,
        });
    }
}
