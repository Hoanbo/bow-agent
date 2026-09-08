import type { RelayAuditRecord, RelaySecurityEventType, RelayId, RelaySurfaceType as SurfaceType } from './relayTypes.js';
/**
 * Deeply redacts sensitive keys from audit details.
 */
export declare function scrubRelayAuditDetails(details: Record<string, unknown>): Record<string, unknown>;
export declare class RelayAuditLedger {
    private readonly records;
    private sequence;
    record(params: {
        eventType: RelaySecurityEventType;
        relayId?: RelayId;
        deviceId?: string;
        sessionId?: string;
        surfaceId?: string;
        surfaceType?: SurfaceType;
        details?: Record<string, unknown>;
        timestamp?: number;
    }): RelayAuditRecord;
    getRecords(): readonly RelayAuditRecord[];
    getRecordsForSession(sessionId: string): readonly RelayAuditRecord[];
    getRecordsByEventType(eventType: RelaySecurityEventType): readonly RelayAuditRecord[];
    count(): number;
    clear(): void;
}
