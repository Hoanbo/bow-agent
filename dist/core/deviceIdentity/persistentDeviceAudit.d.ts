import type { PersistentDeviceAuditRecord, PersistentDeviceAuditEventType, PersistentDeviceState } from './persistentDeviceTypes.js';
/**
 * Recursively scrubs sensitive secrets from an arbitrary object.
 * Replaces values of matching sensitive keys with '[REDACTED]'.
 */
export declare function scrubDeviceSecrets<T>(data: T): T;
export interface RecordDeviceAuditParams {
    readonly eventType: PersistentDeviceAuditEventType;
    readonly deviceId: string;
    readonly scopeString: string;
    readonly keyVersion?: number;
    readonly state?: PersistentDeviceState;
    readonly details?: Record<string, unknown>;
    readonly timestamp?: number;
}
export declare class PersistentDeviceAuditLedger {
    private readonly records;
    private sequence;
    /**
     * Records an authoritative, scrubbed audit event.
     */
    record(params: RecordDeviceAuditParams): PersistentDeviceAuditRecord;
    getRecords(): readonly PersistentDeviceAuditRecord[];
    getByDeviceId(deviceId: string): readonly PersistentDeviceAuditRecord[];
    getByEventType(eventType: PersistentDeviceAuditEventType): readonly PersistentDeviceAuditRecord[];
    count(): number;
    clear(): void;
}
