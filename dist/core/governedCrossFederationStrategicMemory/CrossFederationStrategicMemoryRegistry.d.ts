import { StrategicMemoryRecord } from './GovernedStrategicMemoryTypes';
export declare class CrossFederationStrategicMemoryRegistry {
    private readonly records;
    private readonly tenantRecordMap;
    admitRecord(record: StrategicMemoryRecord): StrategicMemoryRecord;
    getRecord(tenantId: string, recordId: string): StrategicMemoryRecord | undefined;
    listRecordsByTenant(tenantId: string): StrategicMemoryRecord[];
    removeRecord(tenantId: string, recordId: string): boolean;
    clear(): void;
    private validateRecordStructure;
    private enforceTenantBoundary;
    private assertValidTenant;
    sanitizeAgainstPrototypePollution(obj: unknown): void;
    deepSanitizeSecretsAndCoT(record: StrategicMemoryRecord): StrategicMemoryRecord;
}
