import type { ActiveIncidentId, IncidentEscalationRecord, IncidentSeverity, PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';
export declare class PolicyIncidentEscalationEngine {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResponseOptions);
    private assertUserStopInactive;
    /**
     * Generates an immutable human escalation record for a verified incident.
     */
    escalateIncident(tenantPartition: string, incidentId: ActiveIncidentId, severity: IncidentSeverity, violatedInvariant: string, requiredHumanAction: string): IncidentEscalationRecord;
}
