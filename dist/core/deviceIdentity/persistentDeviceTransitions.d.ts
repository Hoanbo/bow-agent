import type { PersistentDeviceState, DeviceKeyState } from './persistentDeviceTypes.js';
export declare const PERSISTENT_DEVICE_TRANSITION_MATRIX: Readonly<Record<PersistentDeviceState, readonly PersistentDeviceState[]>>;
export declare const DEVICE_KEY_TRANSITION_MATRIX: Readonly<Record<DeviceKeyState, readonly DeviceKeyState[]>>;
/**
 * Validates whether a persistent device state transition is permitted.
 */
export declare function isValidPersistentDeviceStateTransition(from: PersistentDeviceState, to: PersistentDeviceState): boolean;
/**
 * Asserts that a persistent device state transition is valid; throws fail-closed error otherwise.
 */
export declare function assertValidPersistentDeviceStateTransition(from: PersistentDeviceState, to: PersistentDeviceState): void;
/**
 * Validates whether a device key state transition is permitted.
 */
export declare function isValidDeviceKeyStateTransition(from: DeviceKeyState, to: DeviceKeyState): boolean;
/**
 * Asserts that a device key state transition is valid; throws fail-closed error otherwise.
 */
export declare function assertValidDeviceKeyStateTransition(from: DeviceKeyState, to: DeviceKeyState): void;
export declare const isValidPersistentDeviceTransition: typeof isValidPersistentDeviceStateTransition;
export declare const assertValidPersistentDeviceTransition: typeof assertValidPersistentDeviceStateTransition;
export declare const isValidDeviceKeyTransition: typeof isValidDeviceKeyStateTransition;
export declare const assertValidDeviceKeyTransition: typeof assertValidDeviceKeyStateTransition;
