// src/core/brain/brainFailure.ts
// BOWCON V4.0 — MS-1.3.30: BRAIN ERROR HIERARCHY & SECRET SCRUBBING
//
// BrainError is the typed error class for all Brain Runtime failures.
// All error messages are scrubbed of secrets before logging.
//
// INVARIANT: Brain errors never expose credentials, tokens, or keys.
// INVARIANT: BrainError includes a machine-readable code for recovery decisions.
const SECRET_PATTERNS = [
    /(key|secret|token|password|bearer|auth|nonce|proof|pin)([=:\s]+)["']?([a-zA-Z0-9_\-\.+/]{4,})["']?/gi,
    /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g,
];
export function sanitizeBrainErrorMessage(raw) {
    if (!raw)
        return '';
    let result = raw;
    result = result.replace(SECRET_PATTERNS[0], '$1$2[REDACTED]');
    result = result.replace(SECRET_PATTERNS[1], '[REDACTED_KEY_BLOCK]');
    return result;
}
export class BrainError extends Error {
    code;
    timestamp;
    recoverable;
    constructor(code, message, recoverable = false) {
        super(`[${code}] ${sanitizeBrainErrorMessage(message)}`);
        this.name = 'BrainError';
        this.code = code;
        this.timestamp = Date.now();
        this.recoverable = recoverable;
        Object.setPrototypeOf(this, BrainError.prototype);
    }
}
