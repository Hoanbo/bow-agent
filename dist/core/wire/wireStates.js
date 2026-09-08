// src/core/wire/wireStates.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Authoritative lifecycle state machine taxonomy and classification predicates
// for physical wire connections and gateway sessions.
export const ALL_WIRE_STATES = Object.freeze([
    'WIRE_DISCONNECTED',
    'WIRE_CONNECTING',
    'WIRE_CONNECTED',
    'WIRE_HANDSHAKING',
    'WIRE_VALIDATING',
    'WIRE_ADMISSION_PENDING',
    'WIRE_ADMITTED',
    'WIRE_SESSION_BINDING',
    'WIRE_ACTIVE',
    'WIRE_DEGRADED',
    'WIRE_RECONNECTING',
    'WIRE_RESUMING',
    'WIRE_DRAINING',
    'WIRE_CLOSED',
    'WIRE_REJECTED',
]);
/**
 * Evaluates whether a wire state allows operational frame exchange.
 */
export function isWireActive(state) {
    return state === 'WIRE_ACTIVE' || state === 'WIRE_DEGRADED';
}
/**
 * Evaluates whether a wire state is permanently terminal.
 */
export function isWireTerminal(state) {
    return state === 'WIRE_CLOSED' || state === 'WIRE_REJECTED';
}
/**
 * Evaluates whether user/task payloads can be accepted for transmission.
 * Strictly prohibited during pre-admission, handshake, reconnection, or drain.
 */
export function canTransmitWirePayload(state) {
    return state === 'WIRE_ACTIVE' || state === 'WIRE_DEGRADED';
}
/**
 * Evaluates whether connection is performing protocol setup before admission.
 */
export function isWireHandshakingOrValidating(state) {
    return (state === 'WIRE_HANDSHAKING' ||
        state === 'WIRE_VALIDATING' ||
        state === 'WIRE_ADMISSION_PENDING' ||
        state === 'WIRE_ADMITTED' ||
        state === 'WIRE_SESSION_BINDING');
}
/**
 * Evaluates whether connection is recovering after network roaming or transport loss.
 */
export function isWireReconnectingOrResuming(state) {
    return state === 'WIRE_RECONNECTING' || state === 'WIRE_RESUMING';
}
/**
 * Evaluates whether connection is shutting down cleanly.
 */
export function isWireDraining(state) {
    return state === 'WIRE_DRAINING';
}
