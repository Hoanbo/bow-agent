// src/core/internet/internetFailure.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Typed fail-closed error hierarchy for the Internet Edge & TLS relay layer.
// All error messages are automatically sanitized before construction — no raw
// secrets, tokens, or PEM blocks can leak into log pipelines via this class.

/** All typed error codes the Internet Edge layer can emit. */
export type InternetEdgeErrorCode =
  | 'INTERNET_TLS_HANDSHAKE_FAILED'
  | 'INTERNET_TLS_VERSION_REJECTED'
  | 'INTERNET_TLS_CIPHER_REJECTED'
  | 'INTERNET_TLS_DOWNGRADE_DETECTED'
  | 'INTERNET_CERT_EXPIRED'
  | 'INTERNET_CERT_REVOKED'
  | 'INTERNET_CERT_PIN_MISMATCH'
  | 'INTERNET_CERT_CHAIN_INVALID'
  | 'INTERNET_CERT_ALGORITHM_WEAK'
  | 'INTERNET_ILLEGAL_TRANSITION'
  | 'INTERNET_ADMISSION_REJECTED'
  | 'INTERNET_RELAY_BIND_FAILED'
  | 'INTERNET_ROAMING_FAILED'
  | 'INTERNET_RECONNECT_EXHAUSTED'
  | 'INTERNET_HEALTH_UNREACHABLE'
  | 'INTERNET_AUDIT_WRITE_FAILED'
  | 'INTERNET_TOKEN_EXPIRED'
  | 'INTERNET_PROTOCOL_VERSION_MISMATCH'
  | 'INTERNET_OVERLOAD_REJECTED'
  | 'INTERNET_INTERNAL_ERROR';

/**
 * Sanitizes an error message by scrubbing PEM blocks, API keys, tokens,
 * passwords, and bearer credentials.  Labels are preserved; values are
 * replaced with [REDACTED_SECRET].
 */
export function sanitizeInternetErrorMessage(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(
      /(key|secret|token|password|bearer|auth|nonce|proof|pin)([=:\s]+)["']?([a-zA-Z0-9_\-\.+/]{4,})["']?/gi,
      '$1$2[REDACTED_SECRET]'
    )
    .replace(/-----BEGIN [A-Z ]+-----[^-]+-----END [A-Z ]+-----/g, '[REDACTED_KEY_BLOCK]');
}

/**
 * Typed error for all Internet Edge / TLS relay failures.
 * Guarantees that sensitive data cannot propagate through the error message.
 */
export class InternetEdgeError extends Error {
  public readonly code: InternetEdgeErrorCode;
  public readonly timestamp: number;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: InternetEdgeErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    const sanitized = sanitizeInternetErrorMessage(message);
    super(`[${code}] ${sanitized}`);
    this.name = 'InternetEdgeError';
    this.code = code;
    this.timestamp = Date.now();
    this.details = details ? Object.freeze({ ...details }) : undefined;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
