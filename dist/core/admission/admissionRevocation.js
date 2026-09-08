// src/core/admission/admissionRevocation.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Authoritative revocation check.
// STRICT INVARIANT: REVOCATION == FAIL_CLOSED.
// Revoked devices MUST be immediately rejected regardless of network or credentials.
export class AdmissionRevocationRegistry {
    revokedDevices = new Map();
    revokedKeys = new Map();
    revokeDevice(deviceId, reason = 'Administrative Revocation', now = Date.now()) {
        this.revokedDevices.set(deviceId, { reason, revokedAt: now });
    }
    revokeKey(keyId, reason = 'Key Compromise / Rotation', now = Date.now()) {
        this.revokedKeys.set(keyId, { reason, revokedAt: now });
    }
    isDeviceRevoked(deviceId) {
        return this.revokedDevices.has(deviceId);
    }
    getRevocationEntry(deviceId) {
        return this.revokedDevices.get(deviceId);
    }
    checkDeviceRevocation(deviceId) {
        const entry = this.revokedDevices.get(deviceId);
        if (entry) {
            return { revoked: true, reason: entry.reason, revokedAt: entry.revokedAt };
        }
        return { revoked: false };
    }
    isKeyRevoked(keyId) {
        return this.revokedKeys.has(keyId);
    }
    size() {
        return this.revokedDevices.size;
    }
    clear() {
        this.revokedDevices.clear();
        this.revokedKeys.clear();
    }
}
