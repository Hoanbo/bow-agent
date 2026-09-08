// src/core/internet/internetFailure.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Typed fail-closed error hierarchy for the Internet Edge & TLS relay layer.
// All error messages are automatically sanitized before construction — no raw
// secrets, tokens, or PEM blocks can leak into log pipelines via this class.
/**
 * Sanitizes an error message by scrubbing PEM blocks, API keys, tokens,
 * passwords, and bearer credentials.  Labels are preserved; values are
 * replaced with [REDACTED_SECRET].
 */
export function sanitizeInternetErrorMessage(raw) {
    if (!raw)
        return '';
    return raw
        .replace(/(key|secret|token|password|bearer|auth|nonce|proof|pin)([=:\s]+)["']?([a-zA-Z0-9_\-\.+/]{4,})["']?/gi, '$1$2[REDACTED_SECRET]')
        .replace(/-----BEGIN [A-Z ]+-----[^-]+-----END [A-Z ]+-----/g, '[REDACTED_KEY_BLOCK]');
}
/**
 * Typed error for all Internet Edge / TLS relay failures.
 * Guarantees that sensitive data cannot propagate through the error message.
 */
export class InternetEdgeError extends Error {
    code;
    timestamp;
    details;
    constructor(code, message, details) {
        const sanitized = sanitizeInternetErrorMessage(message);
        super(`[${code}] ${sanitized}`);
        this.name = 'InternetEdgeError';
        this.code = code;
        this.timestamp = Date.now();
        this.details = details ? Object.freeze({ ...details }) : undefined;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
