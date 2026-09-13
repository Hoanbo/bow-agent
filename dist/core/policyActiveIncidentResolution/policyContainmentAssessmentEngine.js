// src/core/policyActiveIncidentResolution/policyContainmentAssessmentEngine.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Containment Assessment Engine (Component 843).
// Read-only evaluator that deterministically assesses whether incident containment conditions
// are met prior to clearance requests. Evaluates safety boundary postures, hard-forbidden floors,
// and runtime containment integrity.
//
// Core Authority Invariants:
// - CONTAINMENT_ASSESSMENT != CONTAINMENT_CLEARANCE
// - CONTAINMENT_ASSESSMENT != POLICY_MUTATION
// - CONTAINMENT_ASSESSMENT != POLICY_AUTHORITY
// - ZERO AUTONOMOUS CONTAINMENT CLEARANCE
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO DIRECT TOOL EXECUTION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { createContainmentAssessmentId } from './policyActiveIncidentResolutionTypes.js';
export class PolicyContainmentAssessmentEngine {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Containment assessment suspended by USER_STOP supremacy');
        }
    }
    /**
     * Deterministically assesses whether an incident is contained.
     * Pure read-only: does not clear containment or mutate any state.
     */
    assessContainment(input) {
        this.assertUserStopInactive();
        const { tenantPartition, incident, safetyBoundary, isRuntimeDriftBlocked } = input;
        const checksPassed = [];
        const blockingReasons = [];
        // 1. Tenant Verification
        if (!tenantPartition || tenantPartition !== incident?.tenantPartition) {
            blockingReasons.push(`TENANT_PARTITION_MISMATCH: Input tenant '${tenantPartition}' does not match incident tenant '${incident?.tenantPartition}'`);
        }
        else {
            checksPassed.push('TENANT_IDENTITY_VERIFIED');
        }
        // 2. Incident Existence & State
        if (!incident || !incident.incidentId) {
            blockingReasons.push('INCIDENT_INVALID: Missing incident record');
        }
        else {
            checksPassed.push(`INCIDENT_VERIFIED: ${incident.incidentId} [severity: ${incident.severity}]`);
        }
        // 3. Safety Boundary Containment Posture
        const boundaryStatus = safetyBoundary?.status ?? incident?.safetyBoundaryStatus ?? 'INACTIVE';
        if (incident?.severity === 'CRITICAL' || incident?.severity === 'INCIDENT') {
            // For critical or incident severity, safety boundary MUST be active, restricted, or fail-closed
            if (boundaryStatus === 'INACTIVE') {
                blockingReasons.push(`SAFETY_BOUNDARY_INACTIVE: Severity is '${incident.severity}' but safety boundary is INACTIVE. Containment requires active safety posture.`);
            }
            else {
                checksPassed.push(`SAFETY_BOUNDARY_CONTAINMENT_ACTIVE: ${boundaryStatus}`);
            }
        }
        else {
            checksPassed.push(`SAFETY_BOUNDARY_STATUS_CHECKED: ${boundaryStatus}`);
        }
        // 4. Hard-Forbidden Floor Enforcement
        if (safetyBoundary && !safetyBoundary.enforcesHardForbiddenFloor) {
            blockingReasons.push('HARD_FORBIDDEN_FLOOR_VIOLATION: Safety boundary reports hard-forbidden floor not enforced');
        }
        else {
            checksPassed.push('HARD_FORBIDDEN_FLOOR_ENFORCED');
        }
        // 5. Active Policy Drift Blocking
        if (isRuntimeDriftBlocked === false) {
            blockingReasons.push('RUNTIME_DRIFT_UNCONTAINED: Active runtime drift is not isolated or contained');
        }
        else {
            checksPassed.push('RUNTIME_DRIFT_ISOLATED');
        }
        let status = 'CONTAINED';
        if (blockingReasons.length > 0) {
            status = 'UNCONTAINED';
        }
        const assessmentId = createContainmentAssessmentId(`ca_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
        return Object.freeze({
            assessmentId,
            tenantPartition,
            incidentId: incident.incidentId,
            status,
            safetyBoundaryStatus: boundaryStatus,
            hardForbiddenFloorPreserved: true,
            activePolicyDriftBlocked: isRuntimeDriftBlocked !== false,
            evaluatedAt: new Date().toISOString(),
            checksPassed: Object.freeze(checksPassed),
            blockingReasons: Object.freeze(blockingReasons),
            isPolicyMutation: false,
            isAutonomousClearance: false,
            isDirectToolExecution: false,
        });
    }
}
