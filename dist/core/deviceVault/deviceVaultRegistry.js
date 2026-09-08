// src/core/deviceVault/deviceVaultRegistry.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// 9-tuple scope-isolated in-memory registry for device credential vaults.
// Prevents cross-user, cross-device, cross-session, cross-brain, and cross-surface credential leakage.
import { areDeviceScopesEqual, createDeviceScope } from '../pairing/pairingScope.js';
export class DeviceVaultRegistry {
    // Key: deviceId -> DeviceCredentialRecord
    recordsByDeviceId = new Map();
    // Key: `${scopeString}::${deviceId}` -> DeviceCredentialRecord
    recordsByScopeAndDeviceId = new Map();
    // Key: fingerprint -> DeviceCredentialRecord
    recordsByFingerprint = new Map();
    // Key: userId -> Set<deviceId>
    deviceIdsByUserId = new Map();
    // Key: entryId -> VaultEntry
    entriesById = new Map();
    makeScopeKey(scopeString, deviceId) {
        return `${scopeString}::${deviceId}`;
    }
    registerRecord(record) {
        const scopeKey = this.makeScopeKey(record.scopeString, record.deviceId);
        this.recordsByDeviceId.set(record.deviceId, record);
        this.recordsByScopeAndDeviceId.set(scopeKey, record);
        this.recordsByFingerprint.set(record.trustRecordFingerprint, record);
        let userDevices = this.deviceIdsByUserId.get(record.scope.userId);
        if (!userDevices) {
            userDevices = new Set();
            this.deviceIdsByUserId.set(record.scope.userId, userDevices);
        }
        userDevices.add(record.deviceId);
        for (const entry of record.entries) {
            this.entriesById.set(entry.entryId, entry);
        }
    }
    getRecordByDeviceId(deviceId) {
        return this.recordsByDeviceId.get(deviceId);
    }
    getRecordByScope(deviceId, scope) {
        const scopeString = createDeviceScope(scope);
        const scopeKey = this.makeScopeKey(scopeString, deviceId);
        const record = this.recordsByScopeAndDeviceId.get(scopeKey);
        if (record && areDeviceScopesEqual(record.scope, scope)) {
            return record;
        }
        return undefined;
    }
    getRecordByFingerprint(fingerprint) {
        return this.recordsByFingerprint.get(fingerprint);
    }
    getEntry(entryId) {
        return this.entriesById.get(entryId);
    }
    getDevicesByUser(userId) {
        const deviceIds = this.deviceIdsByUserId.get(userId);
        if (!deviceIds || deviceIds.size === 0) {
            return [];
        }
        const results = [];
        for (const id of deviceIds) {
            const rec = this.recordsByDeviceId.get(id);
            if (rec) {
                results.push(rec);
            }
        }
        return Object.freeze(results);
    }
    removeRecord(deviceId) {
        const record = this.recordsByDeviceId.get(deviceId);
        if (!record) {
            return false;
        }
        const scopeKey = this.makeScopeKey(record.scopeString, record.deviceId);
        this.recordsByDeviceId.delete(deviceId);
        this.recordsByScopeAndDeviceId.delete(scopeKey);
        this.recordsByFingerprint.delete(record.trustRecordFingerprint);
        const userDevices = this.deviceIdsByUserId.get(record.scope.userId);
        if (userDevices) {
            userDevices.delete(deviceId);
            if (userDevices.size === 0) {
                this.deviceIdsByUserId.delete(record.scope.userId);
            }
        }
        for (const entry of record.entries) {
            this.entriesById.delete(entry.entryId);
        }
        return true;
    }
    size() {
        return this.recordsByDeviceId.size;
    }
    clear() {
        this.recordsByDeviceId.clear();
        this.recordsByScopeAndDeviceId.clear();
        this.recordsByFingerprint.clear();
        this.deviceIdsByUserId.clear();
        this.entriesById.clear();
    }
}
