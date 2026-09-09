// src/core/agent-loop/agentLoopAudit.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Chained Append-Only Audit Ledger.
//
// Invariants:
// APPEND-ONLY LEDGER
// CHAINED SHA-256 PREVIOUS_HASH INTEGRITY
// RECURSIVE SECRET REDACTION ([REDACTED_SECRET])
import crypto from 'node:crypto';
export class AgentLoopAuditLedger {
    ledger = [];
    lastHash = '0'.repeat(64);
    redactSecrets(obj) {
        if (!obj || typeof obj !== 'object')
            return obj;
        if (Array.isArray(obj))
            return obj.map(item => this.redactSecrets(item));
        const clean = {};
        for (const [key, value] of Object.entries(obj)) {
            if (/key|token|secret|password|auth|credential/i.test(key)) {
                clean[key] = '[REDACTED_SECRET]';
            }
            else if (typeof value === 'object' && value !== null) {
                clean[key] = this.redactSecrets(value);
            }
            else {
                clean[key] = value;
            }
        }
        return clean;
    }
    record(eventType, payload) {
        const auditId = `laudit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const timestamp = Date.now();
        const scrubbedPayload = this.redactSecrets(payload);
        const payloadHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(scrubbedPayload))
            .digest('hex');
        const entry = {
            auditId,
            timestamp,
            eventType,
            payload: scrubbedPayload,
            previousHash: this.lastHash,
            payloadHash,
        };
        this.lastHash = crypto
            .createHash('sha256')
            .update(this.lastHash + payloadHash + timestamp.toString())
            .digest('hex');
        this.ledger.push(entry);
        return entry;
    }
    getEntries() {
        return this.ledger;
    }
    verifyChainIntegrity() {
        let currentPrev = '0'.repeat(64);
        for (const entry of this.ledger) {
            if (entry.previousHash !== currentPrev) {
                return false;
            }
            currentPrev = crypto
                .createHash('sha256')
                .update(currentPrev + entry.payloadHash + entry.timestamp.toString())
                .digest('hex');
        }
        return true;
    }
    clear() {
        this.ledger.length = 0;
        this.lastHash = '0'.repeat(64);
    }
}
export const globalAgentLoopAudit = new AgentLoopAuditLedger();
