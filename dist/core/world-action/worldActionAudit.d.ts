export type WorldActionAuditEventType = 'REQUESTED' | 'PLANNED' | 'AUTHORIZED' | 'DENIED' | 'EXECUTION_STARTED' | 'EXECUTION_COMPLETED' | 'VERIFICATION_STARTED' | 'VERIFICATION_PASSED' | 'VERIFICATION_FAILED' | 'COMMITTED' | 'ROLLED_BACK' | 'ROLLBACK_FAILED' | 'CANCELLED' | 'TIMEOUT' | 'SECURITY_BLOCK';
export interface WorldActionAuditEntry {
    readonly eventId: string;
    readonly eventType: WorldActionAuditEventType;
    readonly actionId: string;
    readonly traceId?: string;
    readonly tenantId?: string;
    readonly deviceId?: string;
    readonly userId?: string;
    readonly toolId?: string;
    readonly target?: string;
    readonly timestamp: string;
    readonly payload: Record<string, any>;
    readonly payloadHash: string;
    readonly previousHash: string;
}
export declare class WorldActionAuditLogger {
    private inMemoryEvents;
    private lastHash;
    record(eventType: WorldActionAuditEventType, actionId: string, payload?: Record<string, any>, metadata?: {
        traceId?: string;
        tenantId?: string;
        deviceId?: string;
        userId?: string;
        toolId?: string;
        target?: string;
    }): WorldActionAuditEntry;
    getEventsForAction(actionId: string): WorldActionAuditEntry[];
    getAllEvents(): readonly WorldActionAuditEntry[];
    scrubSensitiveData(obj: any): any;
    private scrubString;
    clear(): void;
}
export declare const globalWorldActionAudit: WorldActionAuditLogger;
