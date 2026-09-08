// src/core/deviceIdentity/persistentDeviceTransitions.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative finite-state transition matrices for PersistentDeviceState and DeviceKeyState.
// Every illegal transition fails closed immediately.

import type { PersistentDeviceState, DeviceKeyState } from './persistentDeviceTypes.js';

export const PERSISTENT_DEVICE_TRANSITION_MATRIX: Readonly<
  Record<PersistentDeviceState, readonly PersistentDeviceState[]>
> = Object.freeze({
  UNSEEN: ['IDENTITY_PRESENT', 'PAIRING_REQUIRED', 'FAILED'],
  IDENTITY_PRESENT: ['PAIRING_REQUIRED', 'RECOGNITION_CHALLENGE', 'FAILED'],
  PAIRING_REQUIRED: ['PAIRING_PENDING', 'FAILED'],
  PAIRING_PENDING: ['PAIRED', 'FAILED'],
  PAIRED: ['TRUST_PENDING', 'FAILED'],
  TRUST_PENDING: ['TRUSTED', 'FAILED'],
  TRUSTED: ['RECOGNITION_CHALLENGE', 'RECOGNIZED', 'ROTATION_REQUIRED', 'REVOKED', 'EXPIRED', 'FAILED'],
  RECOGNITION_CHALLENGE: ['PROOF_RECEIVED', 'FAILED', 'EXPIRED'],
  PROOF_RECEIVED: ['PROOF_VERIFIED', 'FAILED'],
  PROOF_VERIFIED: ['RECOGNIZED', 'FAILED'],
  RECOGNIZED: ['SESSION_ELIGIBLE', 'TRUSTED', 'ROTATION_REQUIRED', 'REVOKED', 'FAILED'],
  SESSION_ELIGIBLE: ['TRUSTED', 'REVOKED', 'ROTATION_REQUIRED', 'FAILED'],
  ROTATION_REQUIRED: ['RECOGNITION_CHALLENGE', 'TRUSTED', 'REVOKED', 'FAILED'],
  REVOKED: ['PAIRING_REQUIRED'], // Must restart pairing; direct to TRUSTED strictly prohibited
  EXPIRED: ['PAIRING_REQUIRED', 'RECOGNITION_CHALLENGE', 'FAILED'],
  FAILED: ['PAIRING_REQUIRED'],
});

export const DEVICE_KEY_TRANSITION_MATRIX: Readonly<
  Record<DeviceKeyState, readonly DeviceKeyState[]>
> = Object.freeze({
  ACTIVE: ['ROTATION_REQUIRED', 'ROTATED', 'REVOKED', 'EXPIRED'],
  ROTATION_REQUIRED: ['ROTATED', 'REVOKED', 'EXPIRED'],
  ROTATED: ['REVOKED', 'EXPIRED'],
  REVOKED: [],
  EXPIRED: [],
});

/**
 * Validates whether a persistent device state transition is permitted.
 */
export function isValidPersistentDeviceStateTransition(
  from: PersistentDeviceState,
  to: PersistentDeviceState
): boolean {
  if (from === to) {
    return true; // Idempotent no-op
  }
  const allowed = PERSISTENT_DEVICE_TRANSITION_MATRIX[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that a persistent device state transition is valid; throws fail-closed error otherwise.
 */
export function assertValidPersistentDeviceStateTransition(
  from: PersistentDeviceState,
  to: PersistentDeviceState
): void {
  if (!isValidPersistentDeviceStateTransition(from, to)) {
    throw new Error(
      `[INVALID_STATE_TRANSITION] Illegal persistent device state transition from '${from}' to '${to}'`
    );
  }
}

/**
 * Validates whether a device key state transition is permitted.
 */
export function isValidDeviceKeyStateTransition(
  from: DeviceKeyState,
  to: DeviceKeyState
): boolean {
  if (from === to) {
    return true; // Idempotent no-op
  }
  const allowed = DEVICE_KEY_TRANSITION_MATRIX[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that a device key state transition is valid; throws fail-closed error otherwise.
 */
export function assertValidDeviceKeyStateTransition(
  from: DeviceKeyState,
  to: DeviceKeyState
): void {
  if (!isValidDeviceKeyStateTransition(from, to)) {
    throw new Error(
      `[DEVICE_INVALID_TRANSITION] Illegal device key state transition from '${from}' to '${to}'`
    );
  }
}

export const isValidPersistentDeviceTransition = isValidPersistentDeviceStateTransition;
export const assertValidPersistentDeviceTransition = assertValidPersistentDeviceStateTransition;
export const isValidDeviceKeyTransition = isValidDeviceKeyStateTransition;
export const assertValidDeviceKeyTransition = assertValidDeviceKeyStateTransition;
