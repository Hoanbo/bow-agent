// src/core/admission/admissionAudit.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Append-only observational audit ledger with automated secret scrubbing.
// Invariant: NEVER logs raw private keys, passwords, tokens, or raw signatures.
import { computeDeviceDigest, deepFreezeDevice } from '../deviceIdentity/persistentDeviceFingerprint.js';
const REDACTED_MARKER = '[REDACTED_SECRET]';
export const ADMISSION_REDACTED_MARKER = REDACTED_MARKER;
const SENSITIVE_KEY_PATTERNS = [
    /private/i,
    /secret/i,
    /password/i,
    /token/i,
    /credential/i,
    /signature/i,
    /proofbytes/i,
    /authorization/i,
];
/**
 * Recursively redacts sensitive keys from audit details.
 */
export function scrubAdmissionSecrets(value) {
    if (value === null || value === undefined) {
        return value;
    }
    if (typeof value === 'string') {
        if (value.includes('BEGIN PRIVATE KEY') || value.includes('BEGIN EC PRIVATE KEY')) {
            return REDACTED_MARKER;
        }
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => scrubAdmissionSecrets(item));
    }
    if (typeof value === 'object') {
        const output = {};
        const obj = value;
        for (const key of Object.keys(obj)) {
            const isSensitive = SENSITIVE_KEY_PATTERNS.some((p) => p.test(key));
            if (isSensitive) {
                output[key] = REDACTED_MARKER;
            }
            else {
                output[key] = scrubAdmissionSecrets(obj[key]);
            }
        }
        return output;
    }
    return value;
}
export class AdmissionAuditLedger {
    records = [];
    record(input) {
        const now = input.timestamp ?? Date.now();
        const scrubbedDetails = scrubAdmissionSecrets(input.details ?? {});
        const auditId = `admaudit_${computeDeviceDigest({
            index: this.records.length,
            eventType: input.eventType,
            deviceId: input.deviceId,
            timestamp: now,
        })}`;
        const auditFingerprint = computeDeviceDigest({
            auditId,
            eventType: input.eventType,
            deviceId: input.deviceId,
            scopeString: input.scopeString,
            details: scrubbedDetails,
            timestamp: now,
        });
        const record = deepFreezeDevice({
            auditId,
            eventType: input.eventType,
            deviceId: input.deviceId,
            scopeString: input.scopeString,
            details: Object.freeze(scrubbedDetails),
            timestamp: now,
            auditFingerprint,
        });
        this.records.push(record);
        return record;
    }
    list() {
        return Object.freeze([...this.records]);
    }
    getByEventType(type) {
        return Object.freeze(this.records.filter((r) => r.eventType === type));
    }
    getByDeviceId(deviceId) {
        return Object.freeze(this.records.filter((r) => r.deviceId === deviceId));
    }
    size() {
        return this.records.length;
    }
    clear() {
        this.records.length = 0;
    }
}
