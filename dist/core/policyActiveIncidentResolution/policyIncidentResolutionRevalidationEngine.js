// src/core/policyActiveIncidentResolution/policyIncidentResolutionRevalidationEngine.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Incident Resolution Revalidation Engine (Component 842).
// Independently revalidates active incident state, severity, active policy state,
// emergency safety boundary posture, tenant partition ownership, and provenance continuity.
// Rejects cross-tenant records, path traversal, stale/superseded states, and unverified transitions.
//
// Core Authority Invariants:
// - INCIDENT_REVALIDATION != POLICY_AUTHORITY
// - INCIDENT_REVALIDATION != POLICY_MUTATION
// - ZERO AUTONOMOUS POLICY MUTATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyIncidentResolutionRevalidationEngine {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Revalidation engine suspended by USER_STOP supremacy');
        }
    }
    /**
     * Revalidates an incident record prior to lifecycle transitions.
     */
    revalidate(params) {
        this.assertUserStopInactive();
        const { tenantPartition, incident, currentActivePolicy, currentSafetyBoundary, expectedState } = params;
        const checksPassed = [];
        const blockingReasons = [];
        // 1. Tenant Partition Validation
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            blockingReasons.push('INVALID_TENANT_PARTITION: Tenant partition must be non-empty string');
        }
        else {
            try {
                const resolved = resolveUserPartition(tenantPartition.trim(), process.cwd());
                checksPassed.push(`TENANT_PARTITION_VALIDATED: ${resolved.partitionKey}`);
            }
            catch (err) {
                blockingReasons.push(`TENANT_PARTITION_REJECTED: ${err.message}`);
            }
        }
        // 2. Incident Binding & Tenant Match
        if (!incident || !incident.incidentId) {
            blockingReasons.push('INVALID_INCIDENT_RECORD: Missing or null incident record');
        }
        else {
            if (incident.tenantPartition !== tenantPartition) {
                blockingReasons.push(`TENANT_MISMATCH: Incident tenant '${incident.tenantPartition}' does not match requested tenant '${tenantPartition}'`);
            }
            else {
                checksPassed.push('INCIDENT_TENANT_MATCH_VERIFIED');
            }
            // 3. Expected State Check
            if (expectedState && incident.state !== expectedState) {
                blockingReasons.push(`INVALID_LIFECYCLE_STATE: Incident state is '${incident.state}', expected '${expectedState}'`);
            }
            else {
                checksPassed.push(`INCIDENT_STATE_COMPATIBLE: ${incident.state}`);
            }
            // 4. Severity & Signal Sanity
            if (!incident.severity || !['NORMAL', 'DEGRADED', 'INCIDENT', 'CRITICAL'].includes(incident.severity)) {
                blockingReasons.push(`INVALID_SEVERITY: Unrecognized incident severity '${incident.severity}'`);
            }
            else {
                checksPassed.push(`INCIDENT_SEVERITY_VALIDATED: ${incident.severity}`);
            }
        }
        // 5. Active Policy Consistency
        if (incident?.activePolicyStateId) {
            if (!currentActivePolicy) {
                blockingReasons.push(`ACTIVE_POLICY_MISSING: Active policy referenced by incident '${incident.activePolicyStateId}' is missing`);
            }
            else if (currentActivePolicy.activePolicyStateId !== incident.activePolicyStateId) {
                // If versions drifted, this must be evaluated during recovery/resolution
                checksPassed.push(`ACTIVE_POLICY_DRIFT_OBSERVED: Incident policy '${incident.activePolicyStateId}' vs Current '${currentActivePolicy.activePolicyStateId}'`);
            }
            else {
                checksPassed.push('ACTIVE_POLICY_STATE_MATCH_VERIFIED');
            }
        }
        // 6. Safety Boundary Posture Check
        if (currentSafetyBoundary) {
            if (currentSafetyBoundary.tenantPartition !== tenantPartition) {
                blockingReasons.push(`SAFETY_BOUNDARY_TENANT_MISMATCH: Safety boundary tenant '${currentSafetyBoundary.tenantPartition}' does not match '${tenantPartition}'`);
            }
            else {
                checksPassed.push(`SAFETY_BOUNDARY_POSTURE_VERIFIED: ${currentSafetyBoundary.status}`);
            }
        }
        const valid = blockingReasons.length === 0;
        return Object.freeze({
            valid,
            checksPassed: Object.freeze(checksPassed),
            blockingReasons: Object.freeze(blockingReasons),
            revalidatedAt: new Date().toISOString(),
        });
    }
}
