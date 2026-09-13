import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { ActivePolicyIncidentRecord, IncidentEscalationRecord, PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';
export declare class PolicyActiveIncidentStore {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly sanitizer;
    private readonly incidents;
    private readonly fingerprintLookup;
    private readonly escalations;
    constructor(options?: PolicyActiveIncidentResponseOptions, sanitizer?: DiagnosisSanitizer);
    private assertUserStopInactive;
    private getTenantStorageDir;
    private loadTenantStateIfEmpty;
    private persistIncidents;
    private persistEscalations;
    /**
     * Saves or updates an active policy incident.
     * Protects terminal records ('RESOLVED', 'CLOSED') from conflicting rewrites.
     */
    saveIncident(incident: ActivePolicyIncidentRecord): ActivePolicyIncidentRecord;
    /**
     * Finds an active incident by fingerprint.
     */
    getIncidentByFingerprint(tenantPartition: string, fingerprint: string): ActivePolicyIncidentRecord | null;
    /**
     * Retrieves an incident by ID.
     */
    getIncident(tenantPartition: string, incidentId: string): ActivePolicyIncidentRecord | null;
    /**
     * Lists all incidents for a tenant.
     */
    listIncidents(tenantPartition: string): readonly ActivePolicyIncidentRecord[];
    /**
     * Saves a human escalation record.
     */
    saveEscalation(escalation: IncidentEscalationRecord): IncidentEscalationRecord;
    /**
     * Retrieves an escalation by ID.
     */
    getEscalation(tenantPartition: string, escalationId: string): IncidentEscalationRecord | null;
    /**
     * Lists all escalations for a tenant.
     */
    listEscalations(tenantPartition: string): readonly IncidentEscalationRecord[];
}
