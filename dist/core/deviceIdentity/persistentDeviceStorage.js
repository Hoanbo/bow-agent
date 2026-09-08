// src/core/deviceIdentity/persistentDeviceStorage.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative storage abstraction and in-memory deterministic implementation
// for persistent device trust records.
//
// STRICT INVARIANTS:
// - PERSISTENCE != BRAIN_MEMORY
// - Storage implementation for MS-1.3.24 is strictly in-memory deterministic persistence.
// - Zero SQLite, PostgreSQL, MongoDB, Redis, or cloud dependencies.
// - Zero raw private key material persisted.
// - Copy-on-write / deep-freeze semantics ensure data isolation.
import { deepFreezeDevice } from './persistentDeviceFingerprint.js';
export class InMemoryPersistentDeviceStore {
    // Key: deviceId -> serialized JSON string (simulates true storage isolation & copy-on-write)
    storage = new Map();
    save(record) {
        const serialized = JSON.stringify(record);
        this.storage.set(record.deviceId, serialized);
    }
    updateTrustState(record) {
        this.save(record);
    }
    get(deviceId) {
        const serialized = this.storage.get(deviceId);
        if (!serialized) {
            return undefined;
        }
        const parsed = JSON.parse(serialized);
        return deepFreezeDevice(parsed);
    }
    getByScope(deviceId, scopeString) {
        const record = this.get(deviceId);
        if (!record || record.scopeString !== scopeString) {
            return undefined;
        }
        return record;
    }
    findByDeviceId(deviceId, scopeString) {
        if (scopeString) {
            return this.getByScope(deviceId, scopeString);
        }
        return this.get(deviceId);
    }
    delete(deviceId) {
        return this.storage.delete(deviceId);
    }
    list() {
        const results = [];
        for (const serialized of this.storage.values()) {
            results.push(deepFreezeDevice(JSON.parse(serialized)));
        }
        return Object.freeze(results);
    }
    listByScope(scopeString) {
        const results = [];
        for (const serialized of this.storage.values()) {
            const record = JSON.parse(serialized);
            if (record.scopeString === scopeString) {
                results.push(deepFreezeDevice(record));
            }
        }
        return Object.freeze(results);
    }
    listByUser(userId) {
        const results = [];
        for (const serialized of this.storage.values()) {
            const record = JSON.parse(serialized);
            if (record.userId === userId) {
                results.push(deepFreezeDevice(record));
            }
        }
        return Object.freeze(results);
    }
    count() {
        return this.storage.size;
    }
    clear() {
        this.storage.clear();
    }
}
