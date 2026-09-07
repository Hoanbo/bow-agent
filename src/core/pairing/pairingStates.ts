// src/core/pairing/pairingStates.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Finite-state taxonomy, type guards, and state classification predicates.

import {
  ALL_PAIRING_STATES,
  ALL_TRUST_LEVELS,
  SUPPORTED_DEVICE_TYPES,
  SAFE_DEVICE_CAPABILITIES,
  type PairingState,
  type DeviceTrustLevel,
  type DeviceType,
  type SafeDeviceCapability,
} from './pairingTypes.js';

/**
 * Validates whether an arbitrary value is a valid PairingState.
 */
export function isValidPairingState(state: unknown): state is PairingState {
  return typeof state === 'string' && ALL_PAIRING_STATES.includes(state as PairingState);
}

/**
 * Validates whether an arbitrary value is a valid DeviceTrustLevel.
 */
export function isValidTrustLevel(level: unknown): level is DeviceTrustLevel {
  return typeof level === 'string' && ALL_TRUST_LEVELS.includes(level as DeviceTrustLevel);
}

/**
 * Validates whether an arbitrary value is a supported DeviceType.
 */
export function isValidDeviceType(type: unknown): type is DeviceType {
  return typeof type === 'string' && SUPPORTED_DEVICE_TYPES.includes(type as DeviceType);
}

/**
 * Validates whether an arbitrary string is a safe device capability.
 */
export function isSafeDeviceCapability(cap: unknown): cap is SafeDeviceCapability {
  return typeof cap === 'string' && SAFE_DEVICE_CAPABILITIES.includes(cap as SafeDeviceCapability);
}

/**
 * Checks if a pairing state is terminal (no further forward progression without re-pairing flow).
 */
export function isTerminalPairingState(state: PairingState): boolean {
  return (
    state === 'REVOKED' ||
    state === 'EXPIRED' ||
    state === 'REJECTED' ||
    state === 'FAILED'
  );
}

/**
 * Checks if a pairing state is in an active pending flow.
 */
export function isPendingPairingState(state: PairingState): boolean {
  return (
    state === 'PAIRING_REQUESTED' ||
    state === 'PAIRING_PENDING' ||
    state === 'PAIRING_CONFIRMED'
  );
}

/**
 * Checks if a pairing state represents an established pair.
 */
export function isPairedState(state: PairingState): boolean {
  return state === 'PAIRED' || state === 'TRUSTED';
}

/**
 * Checks if a device is in authoritative trusted state.
 */
export function isTrustedState(state: PairingState, trust: DeviceTrustLevel): boolean {
  return state === 'TRUSTED' && trust === 'TRUSTED';
}

/**
 * Checks if a device is revoked in either pairing state or trust level.
 */
export function isRevokedState(state: PairingState, trust: DeviceTrustLevel): boolean {
  return state === 'REVOKED' || trust === 'REVOKED';
}

/**
 * Checks if a device state permits initiating a fresh pairing request.
 */
export function canRequestPairing(state: PairingState): boolean {
  return (
    state === 'UNPAIRED' ||
    state === 'REVOKED' ||
    state === 'EXPIRED' ||
    state === 'REJECTED' ||
    state === 'FAILED'
  );
}
