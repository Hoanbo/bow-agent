import { type PersistentDeviceState, type DeviceKeyState } from './persistentDeviceTypes.js';
/**
 * Validates whether an arbitrary value is a valid PersistentDeviceState.
 */
export declare function isValidPersistentDeviceState(state: unknown): state is PersistentDeviceState;
/**
 * Validates whether an arbitrary value is a valid DeviceKeyState.
 */
export declare function isValidDeviceKeyState(state: unknown): state is DeviceKeyState;
/**
 * Checks if a device state is terminal (no further recognition or session eligibility without fresh pairing).
 */
export declare function isTerminalDeviceState(state: PersistentDeviceState): boolean;
/**
 * Checks if a device state represents a recognized, trusted identity.
 */
export declare function isRecognizedDeviceState(state: PersistentDeviceState): boolean;
/**
 * Checks if a device is eligible to establish a fresh ConnectionRuntime session.
 */
export declare function isSessionEligibleState(state: PersistentDeviceState): boolean;
/**
 * Checks if a device or key is marked as requiring key rotation.
 */
export declare function requiresKeyRotationState(state: PersistentDeviceState, keyState?: DeviceKeyState): boolean;
/**
 * Checks if a device is currently undergoing an active challenge-proof evaluation.
 */
export declare function isPendingProofState(state: PersistentDeviceState): boolean;
export declare const isTerminalPersistentDeviceState: typeof isTerminalDeviceState;
export declare function isTransientPersistentDeviceState(state: PersistentDeviceState): boolean;
export declare const isPersistentDeviceState: typeof isValidPersistentDeviceState;
export declare function isDeviceRevokedOrExpired(state: PersistentDeviceState): boolean;
export declare function isDeviceKeyUsable(state: DeviceKeyState): boolean;
