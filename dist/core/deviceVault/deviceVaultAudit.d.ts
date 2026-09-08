export type DeviceVaultAuditEventType = 'VAULT_INITIALIZED' | 'VAULT_LOCKED' | 'VAULT_UNLOCKED' | 'VAULT_ENTRY_SAVED' | 'VAULT_ENTRY_LOADED' | 'VAULT_ENTRY_DELETED' | 'VAULT_INTEGRITY_CHECKED' | 'VAULT_INTEGRITY_FAILED' | 'VAULT_RECOVERED' | 'VAULT_MIGRATED' | 'VAULT_KEY_ROTATED' | 'VAULT_DEVICE_REVOKED' | 'VAULT_TRANSACTION_COMMITTED' | 'VAULT_TRANSACTION_ABORTED';
export declare const ALL_VAULT_AUDIT_EVENT_TYPES: readonly DeviceVaultAuditEventType[];
export interface DeviceVaultAuditRecord {
    readonly auditId: string;
    readonly eventType: DeviceVaultAuditEventType;
    readonly vaultId: string;
    readonly deviceId?: string;
    readonly scopeString?: string;
    readonly timestamp: number;
    readonly details: Readonly<Record<string, unknown>>;
    readonly auditFingerprint: string;
}
/**
 * Recursively redacts sensitive keys from audit details and error payloads.
 */
export declare function scrubVaultSecrets(value: unknown): unknown;
export interface RecordAuditEventInput {
    readonly eventType: DeviceVaultAuditEventType;
    readonly vaultId: string;
    readonly deviceId?: string;
    readonly scopeString?: string;
    readonly details?: Record<string, unknown>;
    readonly timestamp?: number;
}
export declare class DeviceVaultAuditLedger {
    private readonly records;
    record(input: RecordAuditEventInput): DeviceVaultAuditRecord;
    list(): readonly DeviceVaultAuditRecord[];
    getByVaultId(vaultId: string): readonly DeviceVaultAuditRecord[];
    getByDeviceId(deviceId: string): readonly DeviceVaultAuditRecord[];
    getByEventType(type: DeviceVaultAuditEventType): readonly DeviceVaultAuditRecord[];
    size(): number;
    clear(): void;
}
