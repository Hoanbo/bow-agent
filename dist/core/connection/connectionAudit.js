// src/core/connection/connectionAudit.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Immutable connection audit records with automatic secret scrubbing and deterministic fingerprinting.
import { createConnectionScope, deepFreeze, scrubConnectionSecrets } from './connectionScope.js';
import { computeConnectionFingerprint } from './connectionFingerprint.js';
/**
 * Creates an immutable ConnectionAuditRecord
 */
export function createConnectionAuditRecord(identity, eventType, rawDetails = {}, timestamp = new Date().toISOString()) {
    const scope = createConnectionScope(identity);
    const scrubbedDetails = scrubConnectionSecrets(rawDetails);
    const fp = computeConnectionFingerprint({
        scope,
        eventType,
        details: scrubbedDetails,
    });
    return deepFreeze({
        auditId: `caud_${fp}`,
        scope,
        eventType,
        details: deepFreeze({ ...scrubbedDetails }),
        timestamp,
        fingerprint: fp,
    });
}
/**
 * In-memory audit ledger for connection sessions
 */
export class ConnectionAuditLedger {
    records = [];
    record(audit) {
        this.records.push(audit);
    }
    getRecords(scope) {
        if (!scope)
            return Object.freeze([...this.records]);
        return Object.freeze(this.records.filter((r) => r.scope === scope));
    }
    clear() {
        this.records.length = 0;
    }
}
