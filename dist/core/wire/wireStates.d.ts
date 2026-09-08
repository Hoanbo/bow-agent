export type WireConnectionState = 'WIRE_DISCONNECTED' | 'WIRE_CONNECTING' | 'WIRE_CONNECTED' | 'WIRE_HANDSHAKING' | 'WIRE_VALIDATING' | 'WIRE_ADMISSION_PENDING' | 'WIRE_ADMITTED' | 'WIRE_SESSION_BINDING' | 'WIRE_ACTIVE' | 'WIRE_DEGRADED' | 'WIRE_RECONNECTING' | 'WIRE_RESUMING' | 'WIRE_DRAINING' | 'WIRE_CLOSED' | 'WIRE_REJECTED';
export declare const ALL_WIRE_STATES: readonly WireConnectionState[];
/**
 * Evaluates whether a wire state allows operational frame exchange.
 */
export declare function isWireActive(state: WireConnectionState): boolean;
/**
 * Evaluates whether a wire state is permanently terminal.
 */
export declare function isWireTerminal(state: WireConnectionState): boolean;
/**
 * Evaluates whether user/task payloads can be accepted for transmission.
 * Strictly prohibited during pre-admission, handshake, reconnection, or drain.
 */
export declare function canTransmitWirePayload(state: WireConnectionState): boolean;
/**
 * Evaluates whether connection is performing protocol setup before admission.
 */
export declare function isWireHandshakingOrValidating(state: WireConnectionState): boolean;
/**
 * Evaluates whether connection is recovering after network roaming or transport loss.
 */
export declare function isWireReconnectingOrResuming(state: WireConnectionState): boolean;
/**
 * Evaluates whether connection is shutting down cleanly.
 */
export declare function isWireDraining(state: WireConnectionState): boolean;
