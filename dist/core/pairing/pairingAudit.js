// src/core/pairing/pairingAudit.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Immutable audit logging with automatic credential scrubbing.
// Invariant: Audits are permanent evidence; secrets are NEVER written to audit records.
import { deepFreeze, computePairingDigest } from './pairingFingerprint.js';
import { generateAuditId } from './pairingIdentity.js';
import { scrubSecrets } from './pairingScope.js';
export class PairingAuditLedger {
    records = [];
    sequence = 0;
    /**
     * Records an authoritative, scrubbed audit event.
     */
    record(params) {
        this.sequence += 1;
        const now = params.timestamp ?? Date.now();
        const auditId = generateAuditId(params.eventType, params.deviceId, now, this.sequence);
        const cleanDetails = scrubSecrets(params.details);
        const auditFingerprint = computePairingDigest({
            auditId,
            eventType: params.eventType,
            deviceId: params.deviceId,
            scopeString: params.scopeString,
            pairingId: params.pairingId ?? '',
            pairingState: params.pairingState ?? '',
            trustLevel: params.trustLevel ?? '',
            details: cleanDetails,
            timestamp: now,
            sequence: this.sequence,
        });
        const entry = {
            auditId,
            eventType: params.eventType,
            deviceId: params.deviceId,
            pairingId: params.pairingId,
            scopeString: params.scopeString,
            pairingState: params.pairingState,
            trustLevel: params.trustLevel,
            details: Object.freeze(cleanDetails),
            auditFingerprint,
            timestamp: now,
        };
        const frozen = deepFreeze(entry);
        this.records.push(frozen);
        return frozen;
    }
    /**
     * Retrieves all audit records, optionally filtered by scope string prefix.
     */
    getRecords(scopeFilter) {
        if (!scopeFilter) {
            return Object.freeze([...this.records]);
        }
        return Object.freeze(this.records.filter((r) => r.scopeString.startsWith(scopeFilter)));
    }
    /**
     * Retrieves audit records for a specific device.
     */
    getRecordsByDevice(deviceId) {
        return Object.freeze(this.records.filter((r) => r.deviceId === deviceId));
    }
    /**
     * Returns total audit entries count.
     */
    get count() {
        return this.records.length;
    }
    /**
     * Clears audit ledger (for testing teardown only).
     */
    clear() {
        this.records.length = 0;
        this.sequence = 0;
    }
}
