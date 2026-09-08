// src/core/deviceVault/deviceVaultRuntime.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Central DeviceVaultRuntime orchestrator managing storage, integrity, recovery,
// migration, rotation, revocation, and scope isolation.
// STRICT INVARIANTS:
// - Storage is infrastructure only. Brain is the sole cognitive authority.
// - Zero raw private key exposure (opaque privateKeyRef only).
// - Zero username/password requirements for device recognition.
// - PERSISTENCE != BRAIN_MEMORY != AUTHORIZATION != EXECUTION.
import { CURRENT_VAULT_SCHEMA_VERSION, } from './deviceVaultTypes.js';
import { assertValidVaultTransition } from './deviceVaultTransitions.js';
import { DeviceVaultMemoryStorage } from './deviceVaultMemoryStorage.js';
import { DeviceVaultRegistry } from './deviceVaultRegistry.js';
import { VaultLockController } from './deviceVaultLock.js';
import { DeviceVaultAuditLedger } from './deviceVaultAudit.js';
import { computeVaultDigest, deepFreezeVault } from './deviceVaultFingerprint.js';
import { generateVaultId } from './deviceVaultIdentity.js';
import { assertNoRawPrivateKey } from './deviceVaultKeyRef.js';
import { computeEnvelopeChecksum, verifyVaultEnvelopeIntegrity, validateDeviceCredentialRecordIntegrity, } from './deviceVaultIntegrity.js';
import { rotateVaultKey } from './deviceVaultRotation.js';
import { revokeDeviceCredentialRecord } from './deviceVaultRevocation.js';
import { migrateVaultSchema } from './deviceVaultMigration.js';
import { createSuccessVaultResult, createFailureVaultResult } from './deviceVaultResult.js';
import { areDeviceScopesEqual } from '../pairing/pairingScope.js';
export class DeviceVaultRuntime {
    vaultId;
    schemaVersion = CURRENT_VAULT_SCHEMA_VERSION;
    vaultState = 'UNINITIALIZED';
    storage;
    registry;
    lockController = new VaultLockController();
    auditLedger;
    lastIntegrityTimestamp;
    constructor(options) {
        this.vaultId = options?.vaultId ?? generateVaultId('canonical_vault_master');
        this.storage = options?.storage ?? new DeviceVaultMemoryStorage();
        this.registry = options?.registry ?? new DeviceVaultRegistry();
        this.auditLedger = options?.auditLedger ?? new DeviceVaultAuditLedger();
        if (options?.autoInitialize !== false) {
            this.initialize();
        }
    }
    get state() {
        return this.vaultState;
    }
    getStorage() {
        return this.storage;
    }
    getRegistry() {
        return this.registry;
    }
    getAuditLedger() {
        return this.auditLedger;
    }
    transitionState(to) {
        assertValidVaultTransition(this.vaultState, to);
        this.vaultState = to;
    }
    getStorageKey(deviceId) {
        return `devices/${deviceId}.vault.json`;
    }
    /**
     * Initializes vault: recovers interrupted writes, loads records, runs integrity check.
     */
    initialize() {
        if (this.vaultState === 'READY') {
            return createSuccessVaultResult(undefined, 'READY');
        }
        try {
            this.transitionState('INITIALIZING');
            // 1. Scan storage and load any existing envelopes
            const keys = this.storage.list('devices/');
            for (const key of keys) {
                const raw = this.storage.load(key);
                if (raw) {
                    const integrity = verifyVaultEnvelopeIntegrity(raw, {
                        expectedVaultId: this.vaultId,
                    });
                    if (integrity.valid) {
                        const envelope = JSON.parse(raw);
                        for (const record of envelope.records) {
                            this.registry.registerRecord(record);
                        }
                    }
                    else {
                        // Found corrupted file on initialization
                        this.auditLedger.record({
                            eventType: 'VAULT_INTEGRITY_FAILED',
                            vaultId: this.vaultId,
                            details: { key, failureCode: integrity.failureCode, reason: integrity.failureReason },
                        });
                        this.transitionState('CORRUPTED');
                        return createFailureVaultResult(integrity.failureCode ?? 'VAULT_CORRUPTED', `Corrupted vault file detected during initialization: ${integrity.failureReason}`, 'CORRUPTED');
                    }
                }
            }
            this.transitionState('READY');
            this.lastIntegrityTimestamp = Date.now();
            this.auditLedger.record({
                eventType: 'VAULT_INITIALIZED',
                vaultId: this.vaultId,
                details: { recordsLoaded: this.registry.size(), schemaVersion: this.schemaVersion },
            });
            return createSuccessVaultResult(undefined, 'READY');
        }
        catch (err) {
            this.transitionState('DEGRADED');
            return createFailureVaultResult('VAULT_DEGRADED', `Vault initialization failed: ${err.message}`, 'DEGRADED');
        }
    }
    /**
     * Stores and durably persists a DeviceCredentialRecord.
     */
    storeCredential(record) {
        if (this.vaultState !== 'READY') {
            return createFailureVaultResult('VAULT_UNINITIALIZED', `Cannot store credential in state ${this.vaultState}`, this.vaultState);
        }
        this.lockController.assertUnlocked('storeCredential');
        assertNoRawPrivateKey(record, 'storeCredential');
        // 1. Validate record integrity
        const validation = validateDeviceCredentialRecordIntegrity(record, {
            expectedVaultId: this.vaultId,
        });
        if (!validation.valid) {
            return createFailureVaultResult('VAULT_INTEGRITY_MISMATCH', `Credential record integrity check failed: ${validation.reason}`, this.vaultState);
        }
        try {
            // 2. Register in scope-isolated memory registry
            this.registry.registerRecord(record);
            // 3. Build canonical envelope
            const now = Date.now();
            const envelopeData = {
                schemaVersion: this.schemaVersion,
                vaultId: this.vaultId,
                deviceId: record.deviceId,
                scope: record.scope,
                scopeString: record.scopeString,
                records: [record],
                metadata: {
                    storedAt: now,
                    activeKeyVersion: record.activeKeyVersion,
                },
            };
            const checksum = computeEnvelopeChecksum(envelopeData);
            const envelope = deepFreezeVault({
                ...envelopeData,
                integrity: {
                    checksum,
                    algorithm: 'FNV1A32_HEX',
                    calculatedAt: now,
                },
            });
            // 4. Persist to storage backend
            const storageKey = this.getStorageKey(record.deviceId);
            this.storage.save(storageKey, JSON.stringify(envelope));
            this.auditLedger.record({
                eventType: 'VAULT_ENTRY_SAVED',
                vaultId: this.vaultId,
                deviceId: record.deviceId,
                scopeString: record.scopeString,
                details: { recordId: record.recordId, keyVersion: record.activeKeyVersion },
            });
            return createSuccessVaultResult(record, 'READY');
        }
        catch (err) {
            return createFailureVaultResult('VAULT_IO_ERROR', `Failed to persist credential: ${err.message}`, this.vaultState);
        }
    }
    /**
     * Loads a credential record by deviceId and scope.
     * Fails closed on scope mismatch, corrupted records, or revocation.
     */
    loadCredential(deviceId, scope) {
        if (this.vaultState !== 'READY') {
            return createFailureVaultResult('VAULT_UNINITIALIZED', `Cannot load credential in state ${this.vaultState}`, this.vaultState);
        }
        this.lockController.assertUnlocked('loadCredential');
        // 1. Check registry first
        let record = this.registry.getRecordByScope(deviceId, scope);
        // 2. If not in registry or rehydrating from restart, load from storage
        if (!record) {
            const storageKey = this.getStorageKey(deviceId);
            const raw = this.storage.load(storageKey);
            if (!raw) {
                return createFailureVaultResult('VAULT_ENTRY_NOT_FOUND', `Credential record for device ${deviceId} not found in vault`, this.vaultState);
            }
            const integrity = verifyVaultEnvelopeIntegrity(raw, {
                expectedVaultId: this.vaultId,
                expectedScope: scope,
                expectedSchemaVersion: this.schemaVersion,
            });
            if (!integrity.valid) {
                this.auditLedger.record({
                    eventType: 'VAULT_INTEGRITY_FAILED',
                    vaultId: this.vaultId,
                    deviceId,
                    details: { failureCode: integrity.failureCode, reason: integrity.failureReason },
                });
                return createFailureVaultResult(integrity.failureCode ?? 'VAULT_CORRUPTED', `Vault integrity check failed: ${integrity.failureReason}`, 'CORRUPTED');
            }
            const envelope = JSON.parse(raw);
            const found = envelope.records.find((r) => r.deviceId === deviceId);
            if (!found) {
                return createFailureVaultResult('VAULT_ENTRY_NOT_FOUND', `Device ${deviceId} not found in envelope`, this.vaultState);
            }
            record = found;
            this.registry.registerRecord(record);
        }
        // 3. Validate scope isolation
        if (!areDeviceScopesEqual(record.scope, scope)) {
            return createFailureVaultResult('VAULT_SCOPE_MISMATCH', `Device ${deviceId} credential belongs to a different scope`, this.vaultState);
        }
        // 4. Validate revocation
        if (record.revoked) {
            return createFailureVaultResult('VAULT_DEVICE_REVOKED', `Device ${deviceId} credential has been authoritatively revoked (${record.revocationReason ?? 'no reason given'})`, this.vaultState);
        }
        this.auditLedger.record({
            eventType: 'VAULT_ENTRY_LOADED',
            vaultId: this.vaultId,
            deviceId,
            scopeString: record.scopeString,
            details: { recordId: record.recordId, keyVersion: record.activeKeyVersion },
        });
        return createSuccessVaultResult(record, 'READY');
    }
    /**
     * Rotates key material for an enrolled device and persists updated record.
     */
    rotateKey(deviceId, scope, newKeyVersion, newPublicKey) {
        if (this.vaultState !== 'READY') {
            return createFailureVaultResult('VAULT_UNINITIALIZED', `Cannot rotate key in state ${this.vaultState}`, this.vaultState);
        }
        this.lockController.assertUnlocked('rotateKey');
        const loadRes = this.loadCredential(deviceId, scope);
        if (!loadRes.success || !loadRes.data) {
            return createFailureVaultResult(loadRes.failureCode ?? 'VAULT_ROTATION_FAILED', loadRes.failureReason ?? 'Device not found for rotation', this.vaultState);
        }
        const currentRecord = loadRes.data;
        const keyId = `key_${deviceId}_v${newKeyVersion}`;
        const rotationResult = rotateVaultKey({
            record: currentRecord,
            newKeyId: keyId,
            newPublicKey,
        });
        const storeRes = this.storeCredential(rotationResult.updatedRecord);
        if (!storeRes.success) {
            return storeRes;
        }
        this.auditLedger.record({
            eventType: 'VAULT_KEY_ROTATED',
            vaultId: this.vaultId,
            deviceId,
            scopeString: currentRecord.scopeString,
            details: {
                oldKeyVersion: rotationResult.oldKeyVersion,
                newKeyVersion: rotationResult.newKeyVersion,
            },
        });
        return createSuccessVaultResult(rotationResult.updatedRecord, 'READY');
    }
    /**
     * Revokes a device credential authoritatively and persists revocation across restarts.
     */
    revokeCredential(deviceId, scope, reason) {
        if (this.vaultState !== 'READY') {
            return createFailureVaultResult('VAULT_UNINITIALIZED', `Cannot revoke credential in state ${this.vaultState}`, this.vaultState);
        }
        this.lockController.assertUnlocked('revokeCredential');
        // Retrieve current record directly from registry or storage without failing on revocation check
        let record = this.registry.getRecordByScope(deviceId, scope);
        if (!record) {
            const storageKey = this.getStorageKey(deviceId);
            const raw = this.storage.load(storageKey);
            if (raw) {
                const envelope = JSON.parse(raw);
                record = envelope.records.find((r) => r.deviceId === deviceId);
            }
        }
        if (!record) {
            return createFailureVaultResult('VAULT_ENTRY_NOT_FOUND', `Device ${deviceId} not found for revocation`, this.vaultState);
        }
        const revokeResult = revokeDeviceCredentialRecord(record, reason);
        this.registry.registerRecord(revokeResult.updatedRecord);
        // Persist revoked record to disk immediately
        const storageKey = this.getStorageKey(deviceId);
        const envelopeData = {
            schemaVersion: this.schemaVersion,
            vaultId: this.vaultId,
            deviceId: record.deviceId,
            scope: record.scope,
            scopeString: record.scopeString,
            records: [revokeResult.updatedRecord],
            metadata: {
                revokedAt: revokeResult.revokedAt,
                reason,
            },
        };
        const checksum = computeEnvelopeChecksum(envelopeData);
        const envelope = deepFreezeVault({
            ...envelopeData,
            integrity: {
                checksum,
                algorithm: 'FNV1A32_HEX',
                calculatedAt: Date.now(),
            },
        });
        this.storage.save(storageKey, JSON.stringify(envelope));
        this.auditLedger.record({
            eventType: 'VAULT_DEVICE_REVOKED',
            vaultId: this.vaultId,
            deviceId,
            scopeString: record.scopeString,
            details: { reason, revokedAt: revokeResult.revokedAt },
        });
        return createSuccessVaultResult(revokeResult.updatedRecord, 'READY');
    }
    /**
     * Executes authoritative integrity check over all persisted records.
     */
    checkIntegrity() {
        const now = Date.now();
        const keys = this.storage.list('devices/');
        let corruptedCount = 0;
        for (const key of keys) {
            const raw = this.storage.load(key);
            if (!raw) {
                corruptedCount++;
                continue;
            }
            const check = verifyVaultEnvelopeIntegrity(raw, {
                expectedVaultId: this.vaultId,
                expectedSchemaVersion: this.schemaVersion,
            });
            if (!check.valid) {
                corruptedCount++;
                this.auditLedger.record({
                    eventType: 'VAULT_INTEGRITY_FAILED',
                    vaultId: this.vaultId,
                    details: { key, failureCode: check.failureCode, reason: check.failureReason },
                });
            }
        }
        this.lastIntegrityTimestamp = now;
        const isValid = corruptedCount === 0;
        this.auditLedger.record({
            eventType: 'VAULT_INTEGRITY_CHECKED',
            vaultId: this.vaultId,
            details: { totalFiles: keys.length, corruptedCount, valid: isValid },
        });
        if (!isValid && this.vaultState === 'READY') {
            this.transitionState('CORRUPTED');
        }
        return {
            checkedAt: now,
            valid: isValid,
            checksum: computeVaultDigest({ vaultId: this.vaultId, keys: keys.length, corruptedCount }),
            totalRecords: this.registry.size(),
            corruptedRecords: corruptedCount,
            failureCode: isValid ? undefined : 'VAULT_CORRUPTED',
            failureReason: isValid ? undefined : `${corruptedCount} storage records failed integrity verification`,
        };
    }
    /**
     * Migrates legacy payload into the current vault schema.
     */
    migrate(legacyPayload) {
        this.transitionState('MIGRATING');
        const result = migrateVaultSchema(legacyPayload);
        if (result.success && result.envelope) {
            for (const record of result.envelope.records) {
                this.storeCredential(record);
            }
            this.transitionState('READY');
            this.auditLedger.record({
                eventType: 'VAULT_MIGRATED',
                vaultId: this.vaultId,
                details: { fromVersion: result.record.fromVersion, count: result.record.migratedCount },
            });
        }
        else {
            this.transitionState('DEGRADED');
        }
        return result;
    }
    lock(reason = 'ADMIN_LOCK') {
        this.lockController.lock(reason);
        if (this.vaultState === 'READY') {
            this.transitionState('LOCKED');
        }
        this.auditLedger.record({
            eventType: 'VAULT_LOCKED',
            vaultId: this.vaultId,
            details: { reason },
        });
        return createSuccessVaultResult(undefined, this.vaultState);
    }
    unlock() {
        this.lockController.unlock();
        if (this.vaultState === 'LOCKED') {
            this.transitionState('READY');
        }
        this.auditLedger.record({
            eventType: 'VAULT_UNLOCKED',
            vaultId: this.vaultId,
        });
        return createSuccessVaultResult(undefined, this.vaultState);
    }
    getSnapshot() {
        return deepFreezeVault({
            vaultId: this.vaultId,
            state: this.vaultState,
            schemaVersion: this.schemaVersion,
            totalRecords: this.registry.size(),
            activeKeyVersion: 1,
            isLocked: this.lockController.isLocked(),
            lastIntegrityTimestamp: this.lastIntegrityTimestamp,
        });
    }
    destroy() {
        if (this.vaultState !== 'DESTROYED') {
            this.registry.clear();
            this.transitionState('DESTROYED');
        }
    }
}
