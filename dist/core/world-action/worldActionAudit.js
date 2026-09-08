// src/core/world-action/worldActionAudit.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Append-only audit logger for governed physical host actions with recursive secret scrubbing.
//
// INVARIANTS:
// Never store secrets, credentials, or private keys.
// Fail-closed audit integrity.
// Cryptographic event binding.
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
export class WorldActionAuditLogger {
    inMemoryEvents = [];
    lastHash = '0'.repeat(64);
    record(eventType, actionId, payload = {}, metadata) {
        const scrubbedPayload = this.scrubSensitiveData(payload);
        const eventId = `wa_audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const timestamp = new Date().toISOString();
        const payloadJson = JSON.stringify(scrubbedPayload);
        const payloadHash = crypto.createHash('sha256').update(payloadJson).digest('hex');
        const entryHash = crypto
            .createHash('sha256')
            .update(`${eventId}:${eventType}:${actionId}:${this.lastHash}:${payloadHash}`)
            .digest('hex');
        const entry = {
            eventId,
            eventType,
            actionId,
            traceId: metadata?.traceId,
            tenantId: metadata?.tenantId,
            deviceId: metadata?.deviceId,
            userId: metadata?.userId,
            toolId: metadata?.toolId,
            target: metadata?.target,
            timestamp,
            payload: scrubbedPayload,
            payloadHash,
            previousHash: this.lastHash,
        };
        this.lastHash = entryHash;
        this.inMemoryEvents.push(entry);
        // Also record into the global governance audit ledger
        try {
            globalAuditLedger.record({
                timestamp,
                actor: {
                    userId: metadata?.userId || 'unknown',
                    role: 'world_action_runtime',
                    channel: 'WORLD_ACTION',
                },
                domain: 'desktop',
                toolName: metadata?.toolId || 'world_action',
                classification: 'REVERSIBLE',
                argumentsHash: payloadHash,
                policyDecision: eventType === 'DENIED' || eventType === 'SECURITY_BLOCK' ? 'DENY' : 'PERMIT',
                executionStatus: eventType === 'COMMITTED' ? 'SUCCESS' : (eventType === 'VERIFICATION_FAILED' || eventType === 'TIMEOUT') ? 'FAILURE' : 'BLOCKED',
            });
        }
        catch {
            // Keep local audit intact even if global ledger fails
        }
        return entry;
    }
    getEventsForAction(actionId) {
        return this.inMemoryEvents.filter(e => e.actionId === actionId);
    }
    getAllEvents() {
        return this.inMemoryEvents;
    }
    scrubSensitiveData(obj) {
        if (obj === null || obj === undefined)
            return obj;
        if (typeof obj === 'string') {
            return this.scrubString(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.scrubSensitiveData(item));
        }
        if (typeof obj === 'object') {
            const scrubbed = {};
            const sensitiveKeys = ['secret', 'token', 'password', 'key', 'auth', 'signature', 'private', 'bearer'];
            for (const [k, v] of Object.entries(obj)) {
                if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
                    scrubbed[k] = '[REDACTED_SECRET]';
                }
                else {
                    scrubbed[k] = this.scrubSensitiveData(v);
                }
            }
            return scrubbed;
        }
        return obj;
    }
    scrubString(str) {
        return str
            .replace(/(bearer\s+)[a-zA-Z0-9_\-\.]{10,}/gi, '$1[REDACTED_SECRET]')
            .replace(/(token=)[a-zA-Z0-9_\-\.]{10,}/gi, '$1[REDACTED_SECRET]')
            .replace(/(api[_-]?key[=:\s]+)[a-zA-Z0-9_\-]{10,}/gi, '$1[REDACTED_SECRET]');
    }
    clear() {
        this.inMemoryEvents = [];
        this.lastHash = '0'.repeat(64);
    }
}
export const globalWorldActionAudit = new WorldActionAuditLogger();
