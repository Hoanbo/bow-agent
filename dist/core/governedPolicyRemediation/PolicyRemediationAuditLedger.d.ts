import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { RemediationAuditRecord, RemediationAuditEventType, EmergencyStopProvider } from './GovernedPolicyRemediationTypes.js';
export declare class PolicyRemediationAuditLedger {
    private readonly baseStorageDir;
    private readonly emergencyStopProvider?;
    private inMemoryLedger;
    constructor(emergencyStopProvider?: EmergencyStopProvider, baseStorageDir?: string);
    private assertEmergencyStopInactive;
    assertValidTenantId(tenantId: string): void;
    private getLedgerFilePath;
    private scrubSecrets;
    appendEvent(tenantId: string, policyDomain: PolicyDomain, eventType: RemediationAuditEventType, eventPayload: Readonly<Record<string, unknown>>): Promise<RemediationAuditRecord>;
    verifyLedgerChain(tenantId: string, policyDomain?: PolicyDomain): {
        verified: boolean;
        recordCount: number;
        tipHash: string;
    };
}
