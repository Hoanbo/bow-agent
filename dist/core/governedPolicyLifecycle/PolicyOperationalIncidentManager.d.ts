import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { type PolicyIncidentRecord, type PolicyIncidentType, type PolicyIncidentSeverity } from './GovernedPolicyLifecycleTypes.js';
import type { PolicyLifecycleStateManager } from './PolicyLifecycleStateManager.js';
import type { PolicyLifecycleAuditLedger } from './PolicyLifecycleAuditLedger.js';
export declare class PolicyOperationalIncidentManager {
    private readonly stateManager?;
    private readonly auditLedger?;
    private readonly incidents;
    private readonly activeIncidentIndex;
    constructor(stateManager?: PolicyLifecycleStateManager | undefined, auditLedger?: PolicyLifecycleAuditLedger | undefined);
    /**
     * Open an operational incident and optionally trigger automated safety halt.
     */
    openIncident(params: {
        tenantId: string;
        policyDomain: PolicyDomain;
        policyId: string;
        policyVersion: number;
        incidentType: PolicyIncidentType;
        severity: PolicyIncidentSeverity;
        description: string;
        autoTripSafetyState?: 'DEGRADED' | 'SUSPENDED';
    }): PolicyIncidentRecord;
    /**
     * Resolve an open incident with mandatory root-cause justification.
     */
    resolveIncident(params: {
        incidentId: string;
        resolvedBy: string;
        resolutionJustification: string;
    }): PolicyIncidentRecord;
    getIncident(incidentId: string): PolicyIncidentRecord | undefined;
    getActiveIncidents(tenantId: string, policyDomain: PolicyDomain): readonly PolicyIncidentRecord[];
}
