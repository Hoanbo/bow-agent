// src/core/capability/capabilityFailure.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Failure taxonomy and error classes for capability execution and discovery.
//
// INVARIANTS:
// FAILURE != BRAIN_DEATH
// Recoverable failures must not crash or terminate the Brain.
export class CapabilityError extends Error {
    code;
    capabilityId;
    target;
    timestamp;
    details;
    constructor(code, message, capabilityId, target, details) {
        super(message);
        this.name = 'CapabilityError';
        this.code = code;
        this.capabilityId = capabilityId;
        this.target = target;
        this.timestamp = Date.now();
        this.details = details ? CapabilityError.scrubDetails(details) : undefined;
    }
    get isRecoverable() {
        return this.code !== 'FATAL';
    }
    static scrubDetails(obj) {
        const scrubbed = {};
        const sensitiveKeys = ['secret', 'token', 'password', 'key', 'auth', 'signature', 'private'];
        for (const [k, v] of Object.entries(obj)) {
            if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
                scrubbed[k] = '[REDACTED_SECRET]';
            }
            else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
                scrubbed[k] = this.scrubDetails(v);
            }
            else {
                scrubbed[k] = v;
            }
        }
        return scrubbed;
    }
}
