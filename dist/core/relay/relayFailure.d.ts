export type RelayErrorCode = 'UNAUTHORIZED_RELAY' | 'FAKE_RELAY' | 'CLONED_RELAY_IDENTITY' | 'FAKE_DEVICE' | 'CLONED_DEVICE_ID' | 'REPLAYED_SESSION' | 'MUTATED_REPLAY' | 'CROSS_DEVICE_INJECTION' | 'CROSS_USER_ROUTING' | 'CROSS_BRAIN_ROUTING' | 'CROSS_SURFACE_ROUTING' | 'SEQUENCE_REWIND' | 'SEQUENCE_GAP' | 'SESSION_CONFUSION' | 'ENDPOINT_SPOOFING' | 'CAPABILITY_ESCALATION' | 'UNAUTHORIZED_RELATIONSHIP' | 'STALE_SESSION_RESUME' | 'HEARTBEAT_TIMEOUT' | 'RECONNECT_EXHAUSTED' | 'BACKPRESSURE_OVERFLOW' | 'TRANSITION_VIOLATION' | 'UNKNOWN_RELAY_ERROR';
export declare class RelayError extends Error {
    readonly code: RelayErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    readonly failClosed: boolean;
    constructor(code: RelayErrorCode, message: string, details?: Record<string, unknown> | undefined);
}
