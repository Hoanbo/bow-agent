// src/core/deviceIdentity/persistentDeviceStates.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Finite-state taxonomy, type guards, and state classification predicates.

import {
  ALL_PERSISTENT_DEVICE_STATES,
  ALL_DEVICE_KEY_STATES,
  type PersistentDeviceState,
  type DeviceKeyState,
} from './persistentDeviceTypes.js';

/**
 * Validates whether an arbitrary value is a valid PersistentDeviceState.
 */
export function isValidPersistentDeviceState(state: unknown): state is PersistentDeviceState {
  return typeof state === 'string' && ALL_PERSISTENT_DEVICE_STATES.includes(state as PersistentDeviceState);
}

/**
 * Validates whether an arbitrary value is a valid DeviceKeyState.
 */
export function isValidDeviceKeyState(state: unknown): state is DeviceKeyState {
  return typeof state === 'string' && ALL_DEVICE_KEY_STATES.includes(state as DeviceKeyState);
}

/**
 * Checks if a device state is terminal (no further recognition or session eligibility without fresh pairing).
 */
export function isTerminalDeviceState(state: PersistentDeviceState): boolean {
  return state === 'REVOKED' || state === 'EXPIRED' || state === 'FAILED';
}

/**
 * Checks if a device state represents a recognized, trusted identity.
 */
export function isRecognizedDeviceState(state: PersistentDeviceState): boolean {
  return state === 'RECOGNIZED' || state === 'SESSION_ELIGIBLE';
}

/**
 * Checks if a device is eligible to establish a fresh ConnectionRuntime session.
 */
export function isSessionEligibleState(state: PersistentDeviceState): boolean {
  return state === 'SESSION_ELIGIBLE';
}

/**
 * Checks if a device or key is marked as requiring key rotation.
 */
export function requiresKeyRotationState(
  state: PersistentDeviceState,
  keyState?: DeviceKeyState
): boolean {
  return state === 'ROTATION_REQUIRED' || keyState === 'ROTATION_REQUIRED';
}

/**
 * Checks if a device is currently undergoing an active challenge-proof evaluation.
 */
export function isPendingProofState(state: PersistentDeviceState): boolean {
  return (
    state === 'RECOGNITION_CHALLENGE' ||
    state === 'PROOF_RECEIVED' ||
    state === 'PROOF_VERIFIED'
  );
}

export const isTerminalPersistentDeviceState = isTerminalDeviceState;

export function isTransientPersistentDeviceState(state: PersistentDeviceState): boolean {
  return (
    state === 'RECOGNITION_CHALLENGE' ||
    state === 'PROOF_RECEIVED' ||
    state === 'PROOF_VERIFIED'
  );
}

export const isPersistentDeviceState = isValidPersistentDeviceState;

export function isDeviceRevokedOrExpired(state: PersistentDeviceState): boolean {
  return state === 'REVOKED' || state === 'EXPIRED';
}

export function isDeviceKeyUsable(state: DeviceKeyState): boolean {
  return state === 'ACTIVE';
}
