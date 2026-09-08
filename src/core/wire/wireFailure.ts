// src/core/wire/wireFailure.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Typed fail-closed error hierarchy for real wire transport and relay gateway operations.
// Automatically scrubs secrets and sensitive data from error messages and stacks.

export type WireErrorCode =
  | 'WIRE_CONNECTION_FAILED'
  | 'WIRE_HANDSHAKE_TIMEOUT'
  | 'WIRE_PROTOCOL_MISMATCH'
  | 'WIRE_MALFORMED_FRAME'
  | 'WIRE_FRAME_SIZE_EXCEEDED'
  | 'WIRE_CHECKSUM_MISMATCH'
  | 'WIRE_ADMISSION_FAILED'
  | 'WIRE_DEVICE_REVOKED'
  | 'WIRE_SESSION_BINDING_FAILED'
  | 'WIRE_SEQUENCE_REWIND'
  | 'WIRE_REPLAY_DETECTED'
  | 'WIRE_SCOPE_VIOLATION'
  | 'WIRE_BACKPRESSURE_OVERFLOW'
  | 'WIRE_RECONNECT_FAILED'
  | 'WIRE_RESUME_REJECTED'
  | 'WIRE_TIMEOUT'
  | 'WIRE_CLOSED_UNEXPECTEDLY'
  | 'WIRE_SECURITY_VIOLATION'
  | 'WIRE_ILLEGAL_STATE_TRANSITION'
  | 'WIRE_PAYLOAD_FORBIDDEN'
  | 'WIRE_AUTHENTICATION_FAILED'
  | 'WIRE_ROAMING_ERROR'
  | 'WIRE_DRAIN_TIMEOUT'
  | 'WIRE_INTERNAL_ERROR';

/**
 * Sanitizes error messages by scrubbing private keys, tokens, passwords, and secrets.
 */
export function sanitizeWireErrorMessage(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/(key|secret|token|password|bearer|auth|nonce|proof)([=:\s]+)["']?([a-zA-Z0-9_\-\.\+/]{8,})["']?/gi, '$1$2[REDACTED_SECRET]')
    .replace(/-----BEGIN [A-Z ]+-----[^-]+-----END [A-Z ]+-----/g, '[REDACTED_KEY_BLOCK]');
}

export class WireTransportError extends Error {
  public readonly code: WireErrorCode;
  public readonly timestamp: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: WireErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    const sanitizedMsg = sanitizeWireErrorMessage(message);
    super(`[${code}] ${sanitizedMsg}`);
    this.name = 'WireTransportError';
    this.code = code;
    this.timestamp = Date.now();
    this.details = details ? Object.freeze({ ...details }) : undefined;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
