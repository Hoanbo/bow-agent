// src/core/supervisor/supervisorAudit.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Supervisory Append-Only Chained Audit Ledger with recursive secret redaction.
//
// INVARIANTS:
// Chained SHA-256 hash integrity.
// Never log unredacted secrets or private credentials.
import crypto from 'node:crypto';
export class SupervisorAuditLogger {
    entries = [];
    lastHash = '0'.repeat(64);
    record(eventType, payload = {}) {
        const scrubbed = this.scrub(payload);
        const eventId = `sup_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const timestamp = new Date().toISOString();
        const payloadJson = JSON.stringify(scrubbed);
        const payloadHash = crypto.createHash('sha256').update(payloadJson).digest('hex');
        const entryHash = crypto
            .createHash('sha256')
            .update(`${eventId}:${eventType}:${this.lastHash}:${payloadHash}`)
            .digest('hex');
        const entry = {
            eventId,
            eventType,
            timestamp,
            payload: scrubbed,
            payloadHash,
            previousHash: this.lastHash,
        };
        this.lastHash = entryHash;
        this.entries.push(entry);
        return entry;
    }
    getAllEntries() {
        return this.entries;
    }
    scrub(obj) {
        if (obj === null || obj === undefined)
            return obj;
        if (typeof obj === 'string') {
            return obj
                .replace(/(bearer\s+)[a-zA-Z0-9_\-\.]{10,}/gi, '$1[REDACTED_SECRET]')
                .replace(/(token=)[a-zA-Z0-9_\-\.]{10,}/gi, '$1[REDACTED_SECRET]')
                .replace(/(api[_-]?key[=:\s]+)[a-zA-Z0-9_\-]{10,}/gi, '$1[REDACTED_SECRET]');
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.scrub(item));
        }
        if (typeof obj === 'object') {
            const scrubbed = {};
            const sensitiveKeys = ['secret', 'token', 'password', 'key', 'auth', 'signature', 'private', 'bearer'];
            for (const [k, v] of Object.entries(obj)) {
                if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
                    scrubbed[k] = '[REDACTED_SECRET]';
                }
                else {
                    scrubbed[k] = this.scrub(v);
                }
            }
            return scrubbed;
        }
        return obj;
    }
    clear() {
        this.entries = [];
        this.lastHash = '0'.repeat(64);
    }
}
export const globalSupervisorAudit = new SupervisorAuditLogger();
