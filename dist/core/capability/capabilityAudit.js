// src/core/capability/capabilityAudit.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Capability Audit Logger with recursive secret scrubbing.
//
// INVARIANTS:
// Never log raw credentials, tokens, or private keys.
// Fail-closed audit integrity.
import crypto from 'node:crypto';
export class CapabilityAuditLogger {
    events = [];
    lastHash = '0'.repeat(64);
    record(eventType, capabilityId, payload = {}, target) {
        const scrubbed = this.scrub(payload);
        const eventId = `cap_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const timestamp = new Date().toISOString();
        const payloadJson = JSON.stringify(scrubbed);
        const payloadHash = crypto.createHash('sha256').update(payloadJson).digest('hex');
        const entryHash = crypto
            .createHash('sha256')
            .update(`${eventId}:${eventType}:${capabilityId}:${this.lastHash}:${payloadHash}`)
            .digest('hex');
        const entry = {
            eventId,
            eventType,
            capabilityId,
            target,
            timestamp,
            payload: scrubbed,
            payloadHash,
            previousHash: this.lastHash,
        };
        this.lastHash = entryHash;
        this.events.push(entry);
        return entry;
    }
    getAllEvents() {
        return this.events;
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
        this.events = [];
        this.lastHash = '0'.repeat(64);
    }
}
export const globalCapabilityAudit = new CapabilityAuditLogger();
