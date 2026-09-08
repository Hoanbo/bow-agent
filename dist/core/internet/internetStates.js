// src/core/internet/internetStates.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Finite state taxonomy for the Internet Edge lifecycle.
// States are fail-closed: any undefined transition defaults to INTERNET_CLOSED.
/** States where the edge may carry user-plane traffic. */
export const INTERNET_TRANSMIT_STATES = Object.freeze([
    'INTERNET_ACTIVE',
    'INTERNET_DEGRADED',
]);
/** Terminal states — no further transitions are legal. */
export const INTERNET_TERMINAL_STATES = Object.freeze([
    'INTERNET_CLOSED',
    'INTERNET_REJECTED',
]);
/** States that indicate an in-progress recovery attempt. */
export const INTERNET_RECOVERY_STATES = Object.freeze([
    'INTERNET_RECONNECTING',
    'INTERNET_ROAMING',
]);
/** All valid Internet Edge states for exhaustive testing. */
export const ALL_INTERNET_STATES = Object.freeze([
    'INTERNET_OFFLINE',
    'INTERNET_RESOLVING',
    'INTERNET_CONNECTING',
    'INTERNET_TLS_HANDSHAKING',
    'INTERNET_CERT_VALIDATING',
    'INTERNET_ADMITTED',
    'INTERNET_RELAY_BINDING',
    'INTERNET_ACTIVE',
    'INTERNET_DEGRADED',
    'INTERNET_ROAMING',
    'INTERNET_RECONNECTING',
    'INTERNET_DRAINING',
    'INTERNET_CLOSED',
    'INTERNET_REJECTED',
]);
export function isInternetActive(state) {
    return INTERNET_TRANSMIT_STATES.includes(state);
}
export function isInternetTerminal(state) {
    return INTERNET_TERMINAL_STATES.includes(state);
}
export function isInternetRecovering(state) {
    return INTERNET_RECOVERY_STATES.includes(state);
}
export function canInternetTransmit(state) {
    return isInternetActive(state);
}
