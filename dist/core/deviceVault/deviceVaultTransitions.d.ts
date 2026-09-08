import type { VaultState } from './deviceVaultTypes.js';
export declare const VAULT_STATE_TRANSITION_MATRIX: Readonly<Record<VaultState, readonly VaultState[]>>;
/**
 * Validates whether a state transition is permitted in the vault lifecycle.
 */
export declare function isValidVaultTransition(from: VaultState, to: VaultState): boolean;
/**
 * Asserts that a vault state transition is legal; throws fail-closed error otherwise.
 */
export declare function assertValidVaultTransition(from: VaultState, to: VaultState): void;
