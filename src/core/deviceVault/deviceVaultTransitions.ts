// src/core/deviceVault/deviceVaultTransitions.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Finite-state transition matrix enforcing fail-closed state changes.

import type { VaultState } from './deviceVaultTypes.js';

export const VAULT_STATE_TRANSITION_MATRIX: Readonly<
  Record<VaultState, readonly VaultState[]>
> = Object.freeze({
  UNINITIALIZED: ['INITIALIZING', 'CORRUPTED', 'DESTROYED'],
  INITIALIZING: ['READY', 'RECOVERING', 'MIGRATING', 'CORRUPTED', 'DEGRADED', 'DESTROYED'],
  READY: ['LOCKED', 'DEGRADED', 'CORRUPTED', 'RECOVERING', 'MIGRATING', 'REVOKED', 'DESTROYED'],
  LOCKED: ['READY', 'CORRUPTED', 'DEGRADED', 'REVOKED', 'DESTROYED'],
  DEGRADED: ['READY', 'RECOVERING', 'CORRUPTED', 'REVOKED', 'DESTROYED'],
  CORRUPTED: ['RECOVERING', 'DESTROYED'],
  RECOVERING: ['READY', 'DEGRADED', 'CORRUPTED', 'DESTROYED'],
  MIGRATING: ['READY', 'CORRUPTED', 'DEGRADED', 'DESTROYED'],
  REVOKED: ['DESTROYED'],
  DESTROYED: [],
});

/**
 * Validates whether a state transition is permitted in the vault lifecycle.
 */
export function isValidVaultTransition(from: VaultState, to: VaultState): boolean {
  if (from === to) {
    return true; // Idempotent no-op
  }
  const allowed = VAULT_STATE_TRANSITION_MATRIX[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Asserts that a vault state transition is legal; throws fail-closed error otherwise.
 */
export function assertValidVaultTransition(from: VaultState, to: VaultState): void {
  if (!isValidVaultTransition(from, to)) {
    throw new Error(
      `[VAULT_INVALID_TRANSITION] Illegal vault state transition from '${from}' to '${to}'`
    );
  }
}
