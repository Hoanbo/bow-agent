import { type VaultState, type VaultEntryStatus } from './deviceVaultTypes.js';
/**
 * Validates whether an arbitrary value is a canonical VaultState.
 */
export declare function isValidVaultState(state: unknown): state is VaultState;
/**
 * Validates whether an arbitrary value is a canonical VaultEntryStatus.
 */
export declare function isValidVaultEntryStatus(status: unknown): status is VaultEntryStatus;
/**
 * Checks if a vault state is terminal (permanent end of vault lifecycle).
 */
export declare function isTerminalVaultState(state: VaultState): boolean;
/**
 * Checks if a vault state represents normal, active operational readiness.
 */
export declare function isOperationalVaultState(state: VaultState): boolean;
/**
 * Checks if a vault state represents an internal locked state.
 */
export declare function isLockedVaultState(state: VaultState): boolean;
/**
 * Checks if a vault state represents an unhealthy state (corrupted or degraded).
 */
export declare function isUnhealthyVaultState(state: VaultState): boolean;
/**
 * Checks if a vault state is actively undergoing recovery or migration.
 */
export declare function isRecoveringVaultState(state: VaultState): boolean;
/**
 * Checks if a vault state is transient (in-flight lifecycle operation).
 */
export declare function isTransientVaultState(state: VaultState): boolean;
