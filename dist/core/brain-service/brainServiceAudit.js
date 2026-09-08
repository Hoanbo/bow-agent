// src/core/brain-service/brainServiceAudit.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Append-Only Service Audit Ledger with Recursive Secret Redaction.
import { makeAuditEventId, } from './brainServiceTypes.js';
const SENSITIVE_KEYS = new Set([
    'password',
    'secret',
    'token',
    'privatekey',
    'apikey',
    'authorization',
    'credential',
]);
function redactSensitive(data) {
    if (!data || typeof data !== 'object')
        return data;
    if (Array.isArray(data)) {
        return data.map(redactSensitive);
    }
    const result = {};
    for (const [k, v] of Object.entries(data)) {
        if (SENSITIVE_KEYS.has(k.toLowerCase())) {
            result[k] = '[REDACTED_SECRET]';
        }
        else if (typeof v === 'object' && v !== null) {
            result[k] = redactSensitive(v);
        }
        else {
            result[k] = v;
        }
    }
    return result;
}
export class BrainServiceAuditLedger {
    _events = [];
    serviceId;
    brainId;
    constructor(serviceId, brainId) {
        this.serviceId = serviceId;
        this.brainId = brainId;
    }
    record(type, data, requestId) {
        const event = {
            eventId: makeAuditEventId(),
            type,
            serviceId: this.serviceId,
            brainId: this.brainId,
            timestamp: Date.now(),
            requestId,
            data: data ? redactSensitive(data) : undefined,
        };
        this._events.push(event);
        return event;
    }
    getEvents() {
        return Object.freeze([...this._events]);
    }
    get count() {
        return this._events.length;
    }
}
