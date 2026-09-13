import type { ActiveIncidentId, SafetyBoundaryState, SafetyBoundaryStatus, PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';
export interface SafetyBoundaryEnforcementCheck {
    readonly allowed: boolean;
    readonly disposition: 'PERMIT' | 'DENY' | 'FORBIDDEN' | 'BLOCKED_BY_SAFETY_BOUNDARY';
    readonly reason: string;
    readonly boundaryStatus: SafetyBoundaryStatus;
}
export declare class PolicyEmergencySafetyBoundary {
    private readonly boundaryStates;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResponseOptions);
    private assertUserStopInactive;
    /**
     * Activates or updates the safety boundary posture for a tenant during an incident.
     */
    activateSafetyBoundary(tenantPartition: string, incidentId: ActiveIncidentId, status: SafetyBoundaryStatus, reason: string): SafetyBoundaryState;
    /**
     * Retrieves the current safety boundary posture for a tenant.
     */
    getBoundaryState(tenantPartition: string): SafetyBoundaryState | null;
    /**
     * Deactivates the safety boundary for a tenant.
     * Requires human review clearance; rejects autonomous actors.
     */
    deactivateSafetyBoundary(tenantPartition: string, operatorId: string, rationale: string): boolean;
    /**
     * Enforces emergency safety boundary restrictions prior to action evaluation.
     */
    enforceSafetyBoundary(tenantPartition: string, action: string, actionClassification?: string): SafetyBoundaryEnforcementCheck;
}
