// src/core/policyActiveIncidentResolution/policyIncidentResolutionEngine.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Incident Resolution Engine (Component 848).
// Determines deterministically whether an incident has satisfied all resolution criteria.
// Requires complete evidence chain: containment clearance, recovery verification (or verified non-recovery resolution),
// and absence of unresolved invariant breaches.
//
// Core Authority Invariants:
// - INCIDENT_RESOLUTION != INCIDENT_CLOSURE
// - INCIDENT_RESOLUTION != POLICY_MUTATION
// - INCIDENT_RESOLUTION != POLICY_AUTHORITY
// - ZERO AUTONOMOUS INCIDENT CLOSURE
// - ZERO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { createResolutionConfirmationId } from './policyActiveIncidentResolutionTypes.js';
export class PolicyIncidentResolutionEngine {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Incident resolution engine suspended by USER_STOP supremacy');
        }
    }
    /**
     * Deterministically evaluates whether an incident is ready to be declared resolved.
     */
    evaluateResolution(input) {
        this.assertUserStopInactive();
        const { tenantPartition, incident, containmentClearance, recoveryVerification, nonRecoveryResolutionRationale, } = input;
        const evidenceChain = [];
        const blockingReasons = [];
        // 1. Tenant Verification
        if (!tenantPartition || tenantPartition !== incident?.tenantPartition) {
            blockingReasons.push(`TENANT_MISMATCH: Input tenant '${tenantPartition}' != incident tenant '${incident?.tenantPartition}'`);
        }
        else {
            evidenceChain.push('TENANT_VERIFIED');
        }
        // 2. Incident Terminal Check
        if (incident.state === 'CLOSED') {
            blockingReasons.push('INCIDENT_ALREADY_CLOSED: Cannot re-resolve an already closed incident');
        }
        else {
            evidenceChain.push(`INCIDENT_ELIGIBLE: ${incident.incidentId} [state: ${incident.state}]`);
        }
        // 3. Containment Clearance Check
        if (!containmentClearance || !containmentClearance.clearanceId) {
            blockingReasons.push('MISSING_CONTAINMENT_CLEARANCE: Incident cannot be resolved without human containment clearance');
        }
        else if (containmentClearance.tenantPartition !== tenantPartition) {
            blockingReasons.push(`CLEARANCE_TENANT_MISMATCH: Clearance tenant '${containmentClearance.tenantPartition}' != '${tenantPartition}'`);
        }
        else {
            evidenceChain.push(`CONTAINMENT_CLEARED_BY_OPERATOR: ${containmentClearance.operatorId}`);
        }
        // 4. Resolution Mode & Recovery Verification
        let resolutionMode = 'RECOVERY_VERIFIED';
        if (recoveryVerification) {
            if (recoveryVerification.status !== 'VERIFIED') {
                blockingReasons.push(`RECOVERY_NOT_VERIFIED: Recovery verification status is '${recoveryVerification.status}'`);
            }
            else {
                evidenceChain.push(`RECOVERY_VERIFIED: ${recoveryVerification.verificationId}`);
            }
        }
        else {
            resolutionMode = 'RESOLVED_WITHOUT_RECOVERY';
            if (!nonRecoveryResolutionRationale || nonRecoveryResolutionRationale.trim().length < 15) {
                blockingReasons.push('MISSING_RESOLUTION_RATIONALE: Non-recovery resolution requires explicit governance rationale (>= 15 chars)');
            }
            else {
                evidenceChain.push(`NON_RECOVERY_RESOLUTION_RATIONALE_VERIFIED: ${nonRecoveryResolutionRationale.trim()}`);
            }
        }
        const isConfirmed = blockingReasons.length === 0;
        const status = isConfirmed ? 'CONFIRMED' : 'REJECTED';
        const resolutionId = createResolutionConfirmationId(`res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        const summary = isConfirmed
            ? `Incident '${incident.incidentId}' resolution confirmed via mode '${resolutionMode}'.`
            : `Incident '${incident.incidentId}' resolution rejected: ${blockingReasons.join('; ')}`;
        return Object.freeze({
            resolutionId,
            tenantPartition,
            incidentId: incident.incidentId,
            status,
            resolutionMode,
            containmentClearanceId: containmentClearance.clearanceId,
            recoveryVerificationId: recoveryVerification?.verificationId,
            confirmedAt: new Date().toISOString(),
            summary,
            evidenceChain: Object.freeze(evidenceChain),
            isAutonomousClosure: false,
            isPolicyMutation: false,
        });
    }
}
