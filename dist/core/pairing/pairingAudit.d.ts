import type { PairingAuditRecord, PairingAuditEventType, PairingState, DeviceTrustLevel } from './pairingTypes.js';
export interface RecordAuditParams {
    readonly eventType: PairingAuditEventType;
    readonly deviceId: string;
    readonly scopeString: string;
    readonly pairingId?: string;
    readonly pairingState?: PairingState;
    readonly trustLevel?: DeviceTrustLevel;
    readonly details: Record<string, unknown>;
    readonly timestamp?: number;
}
export declare class PairingAuditLedger {
    private readonly records;
    private sequence;
    /**
     * Records an authoritative, scrubbed audit event.
     */
    record(params: RecordAuditParams): PairingAuditRecord;
    /**
     * Retrieves all audit records, optionally filtered by scope string prefix.
     */
    getRecords(scopeFilter?: string): readonly PairingAuditRecord[];
    /**
     * Retrieves audit records for a specific device.
     */
    getRecordsByDevice(deviceId: string): readonly PairingAuditRecord[];
    /**
     * Returns total audit entries count.
     */
    get count(): number;
    /**
     * Clears audit ledger (for testing teardown only).
     */
    clear(): void;
}
