import type { PairingState, DeviceTrustLevel } from './pairingTypes.js';
/**
 * Authoritative transition matrix for PairingState.
 * Defines permitted next states from any given state.
 */
export declare const PAIRING_TRANSITION_MATRIX: Readonly<Record<PairingState, readonly PairingState[]>>;
/**
 * Authoritative transition matrix for DeviceTrustLevel.
 * Defines permitted next trust levels from any given level.
 */
export declare const TRUST_TRANSITION_MATRIX: Readonly<Record<DeviceTrustLevel, readonly DeviceTrustLevel[]>>;
/**
 * Validates whether a pairing state transition is permitted.
 */
export declare function isValidPairingTransition(from: PairingState, to: PairingState): boolean;
/**
 * Asserts that a pairing state transition is valid; throws fail-closed error otherwise.
 */
export declare function assertValidPairingTransition(from: PairingState, to: PairingState): void;
/**
 * Validates whether a trust level transition is permitted.
 */
export declare function isValidTrustTransition(from: DeviceTrustLevel, to: DeviceTrustLevel): boolean;
/**
 * Asserts that a trust level transition is valid; throws fail-closed error otherwise.
 */
export declare function assertValidTrustTransition(from: DeviceTrustLevel, to: DeviceTrustLevel): void;
