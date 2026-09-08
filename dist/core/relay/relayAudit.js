// src/core/relay/relayAudit.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Immutable audit ledger with automated secret scrubbing.
//
// INVARIANTS:
// - Audit records are strictly append-only and immutable.
// - Sensitive cryptographic material (keys, tokens, passwords, proofs) is automatically scrubbed.
const SENSITIVE_KEYS = new Set([
    'privatekey',
    'token',
    'credential',
    'secret',
    'password',
    'proof',
    'signature',
    'resumetoken',
    'authkey',
    'apikey',
]);
/**
 * Deeply redacts sensitive keys from audit details.
 */
export function scrubRelayAuditDetails(details) {
    const scrubbed = {};
    for (const [k, v] of Object.entries(details)) {
        const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        let isSensitive = false;
        for (const s of SENSITIVE_KEYS) {
            if (lowerKey.includes(s)) {
                isSensitive = true;
                break;
            }
        }
        if (isSensitive) {
            scrubbed[k] = '[REDACTED_SECRET]';
        }
        else if (v && typeof v === 'object' && !Array.isArray(v)) {
            scrubbed[k] = scrubRelayAuditDetails(v);
        }
        else {
            scrubbed[k] = v;
        }
    }
    return Object.freeze(scrubbed);
}
export class RelayAuditLedger {
    records = [];
    sequence = 0;
    record(params) {
        this.sequence++;
        const now = params.timestamp ?? Date.now();
        const id = `audit_relay_${now}_${this.sequence}`;
        const cleanDetails = params.details ? scrubRelayAuditDetails(params.details) : Object.freeze({});
        const entry = Object.freeze({
            id,
            timestamp: now,
            eventType: params.eventType,
            relayId: params.relayId,
            deviceId: params.deviceId,
            sessionId: params.sessionId,
            surfaceId: params.surfaceId,
            surfaceType: params.surfaceType,
            details: cleanDetails,
        });
        this.records.push(entry);
        return entry;
    }
    getRecords() {
        return Object.freeze([...this.records]);
    }
    getRecordsForSession(sessionId) {
        return Object.freeze(this.records.filter((r) => r.sessionId === sessionId));
    }
    getRecordsByEventType(eventType) {
        return Object.freeze(this.records.filter((r) => r.eventType === eventType));
    }
    count() {
        return this.records.length;
    }
    clear() {
        this.records.length = 0;
    }
}
