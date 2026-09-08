// src/core/deviceVault/deviceVaultStates.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Lifecycle state classification, type guards, and state predicates.

import {
  ALL_VAULT_STATES,
  ALL_VAULT_ENTRY_STATUSES,
  type VaultState,
  type VaultEntryStatus,
} from './deviceVaultTypes.js';

/**
 * Validates whether an arbitrary value is a canonical VaultState.
 */
export function isValidVaultState(state: unknown): state is VaultState {
  return typeof state === 'string' && ALL_VAULT_STATES.includes(state as VaultState);
}

/**
 * Validates whether an arbitrary value is a canonical VaultEntryStatus.
 */
export function isValidVaultEntryStatus(status: unknown): status is VaultEntryStatus {
  return typeof status === 'string' && ALL_VAULT_ENTRY_STATUSES.includes(status as VaultEntryStatus);
}

/**
 * Checks if a vault state is terminal (permanent end of vault lifecycle).
 */
export function isTerminalVaultState(state: VaultState): boolean {
  return state === 'REVOKED' || state === 'DESTROYED';
}

/**
 * Checks if a vault state represents normal, active operational readiness.
 */
export function isOperationalVaultState(state: VaultState): boolean {
  return state === 'READY';
}

/**
 * Checks if a vault state represents an internal locked state.
 */
export function isLockedVaultState(state: VaultState): boolean {
  return state === 'LOCKED';
}

/**
 * Checks if a vault state represents an unhealthy state (corrupted or degraded).
 */
export function isUnhealthyVaultState(state: VaultState): boolean {
  return state === 'DEGRADED' || state === 'CORRUPTED';
}

/**
 * Checks if a vault state is actively undergoing recovery or migration.
 */
export function isRecoveringVaultState(state: VaultState): boolean {
  return state === 'RECOVERING' || state === 'MIGRATING';
}

/**
 * Checks if a vault state is transient (in-flight lifecycle operation).
 */
export function isTransientVaultState(state: VaultState): boolean {
  return state === 'INITIALIZING' || state === 'RECOVERING' || state === 'MIGRATING';
}
