// src/core/pairing/pairingTransitions.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Authoritative finite-state transition matrices for PairingState and DeviceTrustLevel.
// Every invalid transition fails closed immediately.

import type { PairingState, DeviceTrustLevel } from './pairingTypes.js';

/**
 * Authoritative transition matrix for PairingState.
 * Defines permitted next states from any given state.
 */
export const PAIRING_TRANSITION_MATRIX: Readonly<Record<PairingState, readonly PairingState[]>> = Object.freeze({
  UNPAIRED: ['PAIRING_REQUESTED', 'FAILED'],
  PAIRING_REQUESTED: ['PAIRING_PENDING', 'REJECTED', 'FAILED'],
  PAIRING_PENDING: ['PAIRING_CONFIRMED', 'REJECTED', 'EXPIRED', 'FAILED'],
  PAIRING_CONFIRMED: ['PAIRED', 'REJECTED', 'FAILED'],
  PAIRED: ['TRUSTED', 'REVOKED', 'FAILED'],
  TRUSTED: ['REVOKED', 'FAILED'],
  REVOKED: ['UNPAIRED', 'PAIRING_REQUESTED'],
  EXPIRED: ['UNPAIRED', 'PAIRING_REQUESTED'],
  REJECTED: ['UNPAIRED', 'PAIRING_REQUESTED'],
  FAILED: ['UNPAIRED', 'PAIRING_REQUESTED'],
});

/**
 * Authoritative transition matrix for DeviceTrustLevel.
 * Defines permitted next trust levels from any given level.
 */
export const TRUST_TRANSITION_MATRIX: Readonly<Record<DeviceTrustLevel, readonly DeviceTrustLevel[]>> = Object.freeze({
  NONE: ['PAIRED', 'REVOKED'],
  PAIRED: ['TRUSTED', 'LIMITED', 'REVOKED', 'NONE'],
  TRUSTED: ['LIMITED', 'SUSPENDED', 'REVOKED', 'NONE'],
  LIMITED: ['TRUSTED', 'SUSPENDED', 'REVOKED', 'NONE'],
  SUSPENDED: ['TRUSTED', 'LIMITED', 'REVOKED', 'NONE'],
  REVOKED: ['NONE'], // Must reset to NONE through re-pairing; never direct to TRUSTED
});



/**
 * Validates whether a pairing state transition is permitted.
 */
export function isValidPairingTransition(from: PairingState, to: PairingState): boolean {
  if (from === to) {
    return true; // Idempotent no-op
  }
  const allowed = PAIRING_TRANSITION_MATRIX[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that a pairing state transition is valid; throws fail-closed error otherwise.
 */
export function assertValidPairingTransition(from: PairingState, to: PairingState): void {
  if (!isValidPairingTransition(from, to)) {
    throw new Error(
      `[PAIRING_INVALID_TRANSITION] Illegal pairing state transition from '${from}' to '${to}'`
    );
  }
}

/**
 * Validates whether a trust level transition is permitted.
 */
export function isValidTrustTransition(from: DeviceTrustLevel, to: DeviceTrustLevel): boolean {
  if (from === to) {
    return true; // Idempotent no-op
  }
  const allowed = TRUST_TRANSITION_MATRIX[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that a trust level transition is valid; throws fail-closed error otherwise.
 */
export function assertValidTrustTransition(from: DeviceTrustLevel, to: DeviceTrustLevel): void {
  if (!isValidTrustTransition(from, to)) {
    throw new Error(
      `[PAIRING_INVALID_TRANSITION] Illegal trust level transition from '${from}' to '${to}'`
    );
  }
}
