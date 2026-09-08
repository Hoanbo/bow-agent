// src/core/wire/wireFailure.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Typed fail-closed error hierarchy for real wire transport and relay gateway operations.
// Automatically scrubs secrets and sensitive data from error messages and stacks.
/**
 * Sanitizes error messages by scrubbing private keys, tokens, passwords, and secrets.
 */
export function sanitizeWireErrorMessage(raw) {
    if (!raw)
        return '';
    return raw
        .replace(/(key|secret|token|password|bearer|auth|nonce|proof)([=:\s]+)["']?([a-zA-Z0-9_\-\.\+/]{8,})["']?/gi, '$1$2[REDACTED_SECRET]')
        .replace(/-----BEGIN [A-Z ]+-----[^-]+-----END [A-Z ]+-----/g, '[REDACTED_KEY_BLOCK]');
}
export class WireTransportError extends Error {
    code;
    timestamp;
    details;
    constructor(code, message, details) {
        const sanitizedMsg = sanitizeWireErrorMessage(message);
        super(`[${code}] ${sanitizedMsg}`);
        this.name = 'WireTransportError';
        this.code = code;
        this.timestamp = Date.now();
        this.details = details ? Object.freeze({ ...details }) : undefined;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
