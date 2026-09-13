// src/core/policyActiveIncidentResolution/policyIncidentRecoveryHandoffEngine.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Incident Recovery Handoff Engine (Component 846).
// Strictly hands off authorized recovery requests to MS-1.3.72 (PolicyActiveRollbackRuntime).
// Does NOT implement recovery itself; does NOT mutate policies directly; does NOT execute tools.
//
// Core Authority Invariants:
// - RECOVERY_HANDOFF != RECOVERY_EXECUTION
// - RECOVERY_HANDOFF != POLICY_MUTATION
// - RECOVERY_HANDOFF != POLICY_AUTHORITY
// - ZERO AUTONOMOUS RECOVERY
// - ZERO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { createRecoveryHandoffId } from './policyActiveIncidentResolutionTypes.js';
export class PolicyIncidentRecoveryHandoffEngine {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Recovery handoff engine suspended by USER_STOP supremacy');
        }
    }
    /**
     * Delegates authorized recovery to MS-1.3.72 PolicyActiveRollbackRuntime.
     */
    executeHandoff(params) {
        this.assertUserStopInactive();
        const { authorization, rollbackRuntime, sourceState = 'DEACTIVATED' } = params;
        if (!authorization || !authorization.authorizationId) {
            throw new Error('RECOVERY_HANDOFF_FAILED: Invalid recovery authorization record');
        }
        if (!rollbackRuntime) {
            throw new Error('RECOVERY_HANDOFF_FAILED: MS-1.3.72 PolicyActiveRollbackRuntime must be provided');
        }
        const tenantPartition = authorization.tenantPartition;
        // 1. Request recovery in MS-1.3.72
        const recReq = rollbackRuntime.requestRecovery({
            tenantPartition,
            sourceState,
            recoveryTargetVersion: authorization.recoveryTargetVersion,
            requestedBy: params.requestedBy ?? 'system_incident_governor',
            requestedRole: 'INCIDENT_RESPONDER',
            reason: `Incident recovery handoff for incident '${authorization.incidentId}': ${authorization.governanceRationale}`,
        });
        // 2. Revalidate in MS-1.3.72
        const evalResult = rollbackRuntime.revalidateRecovery(recReq.recoveryRequestId, tenantPartition);
        if (!evalResult.valid) {
            throw new Error(`RECOVERY_HANDOFF_BLOCKED: Upstream rollback revalidation failed: ${evalResult.blockingReasons.join(', ')}`);
        }
        // 3. Authorize in MS-1.3.72
        const rollbackAuth = rollbackRuntime.authorizeRecovery({
            recoveryRequestId: recReq.recoveryRequestId,
            tenantPartition,
            evaluation: evalResult,
            operatorId: authorization.operatorId,
            operatorRole: authorization.operatorRole,
            governanceRationale: authorization.governanceRationale,
        });
        // 4. Stage recovery in MS-1.3.72
        rollbackRuntime.stageRecovery(recReq.recoveryRequestId, tenantPartition);
        // 5. Commit recovery in MS-1.3.72
        const commitResult = rollbackRuntime.commitRecovery({
            recoveryRequestId: recReq.recoveryRequestId,
            tenantPartition,
            authorization: rollbackAuth,
        });
        const handoffId = createRecoveryHandoffId(`rh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        const handoffRecord = Object.freeze({
            handoffId,
            tenantPartition,
            incidentId: authorization.incidentId,
            authorizationId: authorization.authorizationId,
            rollbackRecoveryRequestId: recReq.recoveryRequestId,
            targetPolicyVersion: authorization.recoveryTargetVersion,
            targetId: authorization.targetId,
            handoffStatus: 'HANDED_OFF',
            handedOffAt: new Date().toISOString(),
            commitId: commitResult.commitId,
        });
        return {
            handoffRecord,
            commitResult,
        };
    }
}
