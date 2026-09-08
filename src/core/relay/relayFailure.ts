// src/core/relay/relayFailure.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Typed fail-closed error taxonomy for all relay security violations.
//
// INVARIANTS:
// - All security failures fail closed.
// - No silent swallow of errors.

export type RelayErrorCode =
  | 'UNAUTHORIZED_RELAY'
  | 'FAKE_RELAY'
  | 'CLONED_RELAY_IDENTITY'
  | 'FAKE_DEVICE'
  | 'CLONED_DEVICE_ID'
  | 'REPLAYED_SESSION'
  | 'MUTATED_REPLAY'
  | 'CROSS_DEVICE_INJECTION'
  | 'CROSS_USER_ROUTING'
  | 'CROSS_BRAIN_ROUTING'
  | 'CROSS_SURFACE_ROUTING'
  | 'SEQUENCE_REWIND'
  | 'SEQUENCE_GAP'
  | 'SESSION_CONFUSION'
  | 'ENDPOINT_SPOOFING'
  | 'CAPABILITY_ESCALATION'
  | 'UNAUTHORIZED_RELATIONSHIP'
  | 'STALE_SESSION_RESUME'
  | 'HEARTBEAT_TIMEOUT'
  | 'RECONNECT_EXHAUSTED'
  | 'BACKPRESSURE_OVERFLOW'
  | 'TRANSITION_VIOLATION'
  | 'UNKNOWN_RELAY_ERROR';

export class RelayError extends Error {
  public readonly failClosed: boolean = true;

  constructor(
    public readonly code: RelayErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`RELAY_SECURITY_FAILURE [${code}]: ${message}`);
    this.name = 'RelayError';
  }
}
