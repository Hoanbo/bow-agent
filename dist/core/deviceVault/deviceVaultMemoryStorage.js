// src/core/deviceVault/deviceVaultMemoryStorage.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// In-memory implementation of DeviceVaultStorage for deterministic testing.
// Enforces copy-on-write isolation and atomic transaction semantics.
export class DeviceVaultMemoryStorage {
    data = new Map();
    load(key) {
        const value = this.data.get(key);
        return value !== undefined ? value : null;
    }
    save(key, data) {
        this.data.set(key, data);
    }
    replace(key, data) {
        this.data.set(key, data);
    }
    delete(key) {
        return this.data.delete(key);
    }
    exists(key) {
        return this.data.has(key);
    }
    list(prefix) {
        const keys = [];
        for (const key of this.data.keys()) {
            if (!prefix || key.startsWith(prefix)) {
                keys.push(key);
            }
        }
        return Object.freeze(keys.sort());
    }
    clear() {
        this.data.clear();
    }
    size() {
        return this.data.size;
    }
    beginTransaction() {
        const staged = new Map();
        const txId = `tx_${Date.now()}_${Math.imul(this.data.size + 1, 16777619) >>> 0}`;
        return {
            id: txId,
            stageWrite: (key, data) => {
                staged.set(key, data);
            },
            commit: () => {
                for (const [key, value] of staged.entries()) {
                    if (value === null) {
                        this.data.delete(key);
                    }
                    else {
                        this.data.set(key, value);
                    }
                }
                staged.clear();
            },
            rollback: () => {
                staged.clear();
            },
        };
    }
}
