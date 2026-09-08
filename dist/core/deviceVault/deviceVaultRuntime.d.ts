import type { DeviceCredentialVault, DeviceCredentialRecord, VaultState, DeviceVaultStorage, VaultOperationResult, VaultIntegrityRecord, DeviceVaultSnapshot, VaultLockReason } from './deviceVaultTypes.js';
import { DeviceVaultRegistry } from './deviceVaultRegistry.js';
import { DeviceVaultAuditLedger } from './deviceVaultAudit.js';
import { type MigrationResult } from './deviceVaultMigration.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
export interface DeviceVaultRuntimeOptions {
    readonly vaultId?: string;
    readonly storage?: DeviceVaultStorage;
    readonly registry?: DeviceVaultRegistry;
    readonly auditLedger?: DeviceVaultAuditLedger;
    readonly autoInitialize?: boolean;
}
export declare class DeviceVaultRuntime implements DeviceCredentialVault {
    readonly vaultId: string;
    readonly schemaVersion: number;
    private vaultState;
    private readonly storage;
    private readonly registry;
    private readonly lockController;
    private readonly auditLedger;
    private lastIntegrityTimestamp?;
    constructor(options?: DeviceVaultRuntimeOptions);
    get state(): VaultState;
    getStorage(): DeviceVaultStorage;
    getRegistry(): DeviceVaultRegistry;
    getAuditLedger(): DeviceVaultAuditLedger;
    private transitionState;
    private getStorageKey;
    /**
     * Initializes vault: recovers interrupted writes, loads records, runs integrity check.
     */
    initialize(): VaultOperationResult<void>;
    /**
     * Stores and durably persists a DeviceCredentialRecord.
     */
    storeCredential(record: DeviceCredentialRecord): VaultOperationResult<DeviceCredentialRecord>;
    /**
     * Loads a credential record by deviceId and scope.
     * Fails closed on scope mismatch, corrupted records, or revocation.
     */
    loadCredential(deviceId: string, scope: ScopedDeviceIdentity): VaultOperationResult<DeviceCredentialRecord>;
    /**
     * Rotates key material for an enrolled device and persists updated record.
     */
    rotateKey(deviceId: string, scope: ScopedDeviceIdentity, newKeyVersion: number, newPublicKey: string): VaultOperationResult<DeviceCredentialRecord>;
    /**
     * Revokes a device credential authoritatively and persists revocation across restarts.
     */
    revokeCredential(deviceId: string, scope: ScopedDeviceIdentity, reason: string): VaultOperationResult<DeviceCredentialRecord>;
    /**
     * Executes authoritative integrity check over all persisted records.
     */
    checkIntegrity(): VaultIntegrityRecord;
    /**
     * Migrates legacy payload into the current vault schema.
     */
    migrate(legacyPayload: unknown): MigrationResult;
    lock(reason?: VaultLockReason): VaultOperationResult<void>;
    unlock(): VaultOperationResult<void>;
    getSnapshot(): DeviceVaultSnapshot;
    destroy(): void;
}
