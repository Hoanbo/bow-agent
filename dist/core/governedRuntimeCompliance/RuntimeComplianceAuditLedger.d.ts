import { RuntimeComplianceAuditEvent, RuntimeComplianceAuditEventType } from './GovernedRuntimeComplianceTypes.js';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export declare class RuntimeComplianceAuditLedger {
    private readonly baseStorageDir;
    private inMemoryLedger;
    constructor(baseStorageDir?: string);
    assertValidTenantId(tenantId: string): void;
    private getLedgerFilePath;
    appendEvent(tenantId: string, policyDomain: PolicyDomain, eventType: RuntimeComplianceAuditEventType, payload: Record<string, unknown>, metadata?: Record<string, unknown>): Promise<RuntimeComplianceAuditEvent>;
    verifyLedgerChain(tenantId: string): Promise<{
        valid: boolean;
        recordCount: number;
    }>;
    getInMemoryEvents(): readonly RuntimeComplianceAuditEvent[];
    clearInMemoryLedger(): void;
}
