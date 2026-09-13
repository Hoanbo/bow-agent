import type { ActiveIncidentId, IncidentProvenanceRecord, IncidentSeverity, PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';
export declare class PolicyActiveIncidentProvenanceEngine {
    private readonly isUserStopActiveFn?;
    private readonly chains;
    constructor(options?: PolicyActiveIncidentResponseOptions);
    private assertUserStopInactive;
    /**
     * Appends an immutable incident response event to the cryptographic provenance chain.
     */
    appendIncidentEvent(tenantPartition: string, incidentId: ActiveIncidentId, severity: IncidentSeverity, eventType: string, payload: Record<string, any>): IncidentProvenanceRecord;
    /**
     * Verifies the cryptographic integrity of the incident provenance chain for a tenant.
     */
    verifyChainIntegrity(tenantPartition: string): boolean;
    /**
     * Retrieves the immutable provenance chain for a tenant.
     */
    getChain(tenantPartition: string): readonly IncidentProvenanceRecord[];
}
