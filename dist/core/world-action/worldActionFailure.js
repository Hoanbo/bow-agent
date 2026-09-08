// src/core/world-action/worldActionFailure.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Typed failure codes, error class, and context scrubbing for the governed execution subsystem.
export class WorldActionError extends Error {
    code;
    actionId;
    target;
    timestamp;
    details;
    constructor(code, message, actionId, target, details) {
        super(message);
        this.name = 'WorldActionError';
        this.code = code;
        this.actionId = actionId;
        this.target = target;
        this.timestamp = Date.now();
        this.details = details ? WorldActionError.scrubDetails(details) : undefined;
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
