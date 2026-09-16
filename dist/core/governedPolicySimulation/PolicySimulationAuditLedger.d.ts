import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { EmergencyStopProvider, SimulationSessionId, SimulationAuditEventType, SimulationAuditRecord } from './GovernedPolicySimulationTypes.js';
export declare class PolicySimulationAuditLedger {
    private readonly emergencyStopProvider?;
    private readonly baseStorageDir;
    private inMemoryLedger;
    constructor(emergencyStopProvider?: EmergencyStopProvider, baseStorageDir?: string);
    private assertEmergencyStopInactive;
    private sanitizeTenantId;
    private scrubSecrets;
    private getTenantAuditDir;
    private acquireLock;
    private releaseLock;
    /**
     * Appends an audit event to the tenant's append-only cryptographic ledger.
     */
    appendAuditEvent(tenantId: string, policyDomain: PolicyDomain, eventType: SimulationAuditEventType, details: Record<string, unknown>, sessionId?: SimulationSessionId): SimulationAuditRecord;
    private readLedgerUnderLock;
    verifyLedgerIntegrity(tenantId: string): boolean;
    getTenantAuditRecords(tenantId: string): readonly SimulationAuditRecord[];
}
