// src/core/supervisor/supervisorFailure.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Failure taxonomy and typed SupervisorError with recursive secret scrubbing.
//
// INVARIANTS:
// FAILURE != BRAIN_DEATH
// USER_STOP > AUTONOMOUS_EXECUTION
export class SupervisorError extends Error {
    code;
    anomalyId;
    target;
    timestamp;
    details;
    constructor(code, message, anomalyId, target, details) {
        super(message);
        this.name = 'SupervisorError';
        this.code = code;
        this.anomalyId = anomalyId;
        this.target = target;
        this.timestamp = Date.now();
        this.details = details ? SupervisorError.scrubDetails(details) : undefined;
    }
    get isRecoverable() {
        return this.code !== 'FATAL';
    }
    static scrubDetails(obj) {
        const scrubbed = {};
        const sensitiveKeys = ['secret', 'token', 'password', 'key', 'auth', 'signature', 'private', 'bearer'];
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
