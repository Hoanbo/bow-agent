// src/core/pairing/pairingStates.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Finite-state taxonomy, type guards, and state classification predicates.
import { ALL_PAIRING_STATES, ALL_TRUST_LEVELS, SUPPORTED_DEVICE_TYPES, SAFE_DEVICE_CAPABILITIES, } from './pairingTypes.js';
/**
 * Validates whether an arbitrary value is a valid PairingState.
 */
export function isValidPairingState(state) {
    return typeof state === 'string' && ALL_PAIRING_STATES.includes(state);
}
/**
 * Validates whether an arbitrary value is a valid DeviceTrustLevel.
 */
export function isValidTrustLevel(level) {
    return typeof level === 'string' && ALL_TRUST_LEVELS.includes(level);
}
/**
 * Validates whether an arbitrary value is a supported DeviceType.
 */
export function isValidDeviceType(type) {
    return typeof type === 'string' && SUPPORTED_DEVICE_TYPES.includes(type);
}
/**
 * Validates whether an arbitrary string is a safe device capability.
 */
export function isSafeDeviceCapability(cap) {
    return typeof cap === 'string' && SAFE_DEVICE_CAPABILITIES.includes(cap);
}
/**
 * Checks if a pairing state is terminal (no further forward progression without re-pairing flow).
 */
export function isTerminalPairingState(state) {
    return (state === 'REVOKED' ||
        state === 'EXPIRED' ||
        state === 'REJECTED' ||
        state === 'FAILED');
}
/**
 * Checks if a pairing state is in an active pending flow.
 */
export function isPendingPairingState(state) {
    return (state === 'PAIRING_REQUESTED' ||
        state === 'PAIRING_PENDING' ||
        state === 'PAIRING_CONFIRMED');
}
/**
 * Checks if a pairing state represents an established pair.
 */
export function isPairedState(state) {
    return state === 'PAIRED' || state === 'TRUSTED';
}
/**
 * Checks if a device is in authoritative trusted state.
 */
export function isTrustedState(state, trust) {
    return state === 'TRUSTED' && trust === 'TRUSTED';
}
/**
 * Checks if a device is revoked in either pairing state or trust level.
 */
export function isRevokedState(state, trust) {
    return state === 'REVOKED' || trust === 'REVOKED';
}
/**
 * Checks if a device state permits initiating a fresh pairing request.
 */
export function canRequestPairing(state) {
    return (state === 'UNPAIRED' ||
        state === 'REVOKED' ||
        state === 'EXPIRED' ||
        state === 'REJECTED' ||
        state === 'FAILED');
}
