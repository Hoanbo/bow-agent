// src/core/admission/admissionTrust.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Bridge to persistent device trust runtime (MS-1.3.24 / MS-1.3.25).
// Invariant: AUTHENTICATED != TRUSTED != AUTHORIZED != EXECUTED.
/**
 * In-memory trust provider implementation for deterministic testing and runtime integration.
 */
export class InMemoryAdmissionTrustProvider {
    records = new Map();
    register(record) {
        this.records.set(record.deviceId, record);
    }
    getTrustRecord(deviceId, _scope) {
        return this.records.get(deviceId);
    }
    clear() {
        this.records.clear();
    }
}
export function evaluateAdmissionTrust(deviceId, recordOrScope, providerOrNow, now = Date.now()) {
    let record;
    let effectiveNow = now;
    if (typeof providerOrNow === 'number') {
        effectiveNow = providerOrNow;
    }
    if (providerOrNow && typeof providerOrNow.getTrustRecord === 'function') {
        record = providerOrNow.getTrustRecord(deviceId, recordOrScope);
    }
    else {
        record = recordOrScope;
    }
    if (!record) {
        return {
            trusted: false,
            failureCode: 'ADMISSION_DEVICE_NOT_FOUND',
            failureReason: `No persistent trust record found for device ${deviceId}.`,
        };
    }
    // 1. Check revocation
    if (record.revoked || record.lifecycleState === 'REVOKED') {
        return {
            trusted: false,
            failureCode: 'ADMISSION_DEVICE_REVOKED',
            failureReason: `Device ${deviceId} is permanently revoked.`,
            record,
        };
    }
    // 2. Check expiration
    if (record.expiresAt && now > record.expiresAt) {
        return {
            trusted: false,
            failureCode: 'ADMISSION_TRUST_EXPIRED',
            failureReason: `Trust record for device ${deviceId} expired at ${record.expiresAt}.`,
            record,
        };
    }
    // 3. Check trust level
    if (record.trustLevel !== 'TRUSTED' && record.trustLevel !== 'PAIRED') {
        return {
            trusted: false,
            failureCode: 'ADMISSION_TRUST_INSUFFICIENT',
            failureReason: `Device ${deviceId} has insufficient trust level: ${record.trustLevel}.`,
            record,
        };
    }
    return {
        trusted: true,
        record,
    };
}
export function assertAdmissionTrust(result) {
    if (!result.trusted) {
        throw new Error(`[${result.failureCode || 'ADMISSION_TRUST_FAILED'}] ${result.failureReason || 'Admission trust evaluation failed. Fail-closed.'}`);
    }
}
