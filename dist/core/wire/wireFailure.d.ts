export type WireErrorCode = 'WIRE_CONNECTION_FAILED' | 'WIRE_HANDSHAKE_TIMEOUT' | 'WIRE_PROTOCOL_MISMATCH' | 'WIRE_MALFORMED_FRAME' | 'WIRE_FRAME_SIZE_EXCEEDED' | 'WIRE_CHECKSUM_MISMATCH' | 'WIRE_ADMISSION_FAILED' | 'WIRE_DEVICE_REVOKED' | 'WIRE_SESSION_BINDING_FAILED' | 'WIRE_SEQUENCE_REWIND' | 'WIRE_REPLAY_DETECTED' | 'WIRE_SCOPE_VIOLATION' | 'WIRE_BACKPRESSURE_OVERFLOW' | 'WIRE_RECONNECT_FAILED' | 'WIRE_RESUME_REJECTED' | 'WIRE_TIMEOUT' | 'WIRE_CLOSED_UNEXPECTEDLY' | 'WIRE_SECURITY_VIOLATION' | 'WIRE_ILLEGAL_STATE_TRANSITION' | 'WIRE_PAYLOAD_FORBIDDEN' | 'WIRE_AUTHENTICATION_FAILED' | 'WIRE_ROAMING_ERROR' | 'WIRE_DRAIN_TIMEOUT' | 'WIRE_INTERNAL_ERROR';
/**
 * Sanitizes error messages by scrubbing private keys, tokens, passwords, and secrets.
 */
export declare function sanitizeWireErrorMessage(raw: string): string;
export declare class WireTransportError extends Error {
    readonly code: WireErrorCode;
    readonly timestamp: number;
    readonly details?: Record<string, unknown>;
    constructor(code: WireErrorCode, message: string, details?: Record<string, unknown>);
}
