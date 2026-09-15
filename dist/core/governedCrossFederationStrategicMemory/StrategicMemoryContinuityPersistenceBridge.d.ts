import { StrategicMemoryAuditEvent, StrategicMemoryAuditEventType, InstitutionalMemoryContinuity } from './GovernedStrategicMemoryTypes';
import { StrategicMemorySecurityBoundary } from './StrategicMemorySecurityBoundary';
export declare class StrategicMemoryContinuityPersistenceBridge {
    private readonly securityBoundary;
    private readonly auditChains;
    private readonly continuitySnapshots;
    constructor(securityBoundary: StrategicMemorySecurityBoundary);
    emitAuditEvent(eventType: StrategicMemoryAuditEventType, tenantId: string, sessionId: string, metadata?: {
        humanOperatorId?: string;
        missionId?: string;
        objectiveId?: string;
        federationId?: string;
        generation?: number;
        details?: Record<string, unknown>;
    }): StrategicMemoryAuditEvent;
    getAuditChain(sessionId: string): StrategicMemoryAuditEvent[];
    verifyAuditChainIntegrity(sessionId: string): boolean;
    captureContinuitySnapshot(tenantId: string, sessionId: string, sessionEpoch: number, totalRecordsCount: number, activeDriftScore: number): InstitutionalMemoryContinuity;
    persistStateAtomically(tenantId: string, sessionId: string, statePayload: Record<string, unknown>, expectedVersion: number): {
        targetPath: string;
        checksum: string;
    };
    clear(): void;
}
