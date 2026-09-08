// src/core/relay/relayFailure.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Typed fail-closed error taxonomy for all relay security violations.
//
// INVARIANTS:
// - All security failures fail closed.
// - No silent swallow of errors.
export class RelayError extends Error {
    code;
    details;
    failClosed = true;
    constructor(code, message, details) {
        super(`RELAY_SECURITY_FAILURE [${code}]: ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'RelayError';
    }
}
