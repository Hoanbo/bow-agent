// src/core/admission/admissionRegistry.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// In-memory observational admission registry.
// Preserves scope isolation and tracks active admitted states without granting execution authority.
export class AdmissionRegistry {
    records = new Map();
    deviceIdsByUserId = new Map();
    recordAdmitted(deviceId, scope, network, sessionId, decision, now = Date.now()) {
        const record = Object.freeze({
            deviceId,
            scope,
            currentNetwork: network,
            sessionId,
            admittedAt: now,
            lastActiveAt: now,
            decision,
        });
        this.records.set(deviceId, record);
        let userSet = this.deviceIdsByUserId.get(scope.userId);
        if (!userSet) {
            userSet = new Set();
            this.deviceIdsByUserId.set(scope.userId, userSet);
        }
        userSet.add(deviceId);
        return record;
    }
    getAdmitted(deviceId) {
        return this.records.get(deviceId);
    }
    isAdmitted(deviceId) {
        return this.records.has(deviceId);
    }
    updateNetwork(deviceId, newNetwork, now = Date.now()) {
        const existing = this.records.get(deviceId);
        if (!existing) {
            return false;
        }
        const updated = Object.freeze({
            ...existing,
            currentNetwork: newNetwork,
            lastActiveAt: now,
        });
        this.records.set(deviceId, updated);
        return true;
    }
    remove(deviceId) {
        const existing = this.records.get(deviceId);
        if (!existing) {
            return false;
        }
        this.records.delete(deviceId);
        const userSet = this.deviceIdsByUserId.get(existing.scope.userId);
        if (userSet) {
            userSet.delete(deviceId);
            if (userSet.size === 0) {
                this.deviceIdsByUserId.delete(existing.scope.userId);
            }
        }
        return true;
    }
    getDevicesForUser(userId) {
        const deviceIds = this.deviceIdsByUserId.get(userId);
        if (!deviceIds || deviceIds.size === 0) {
            return [];
        }
        const list = [];
        for (const id of deviceIds) {
            const rec = this.records.get(id);
            if (rec) {
                list.push(rec);
            }
        }
        return Object.freeze(list);
    }
    size() {
        return this.records.size;
    }
    clear() {
        this.records.clear();
        this.deviceIdsByUserId.clear();
    }
}
