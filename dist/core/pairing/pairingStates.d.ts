import { type PairingState, type DeviceTrustLevel, type DeviceType, type SafeDeviceCapability } from './pairingTypes.js';
/**
 * Validates whether an arbitrary value is a valid PairingState.
 */
export declare function isValidPairingState(state: unknown): state is PairingState;
/**
 * Validates whether an arbitrary value is a valid DeviceTrustLevel.
 */
export declare function isValidTrustLevel(level: unknown): level is DeviceTrustLevel;
/**
 * Validates whether an arbitrary value is a supported DeviceType.
 */
export declare function isValidDeviceType(type: unknown): type is DeviceType;
/**
 * Validates whether an arbitrary string is a safe device capability.
 */
export declare function isSafeDeviceCapability(cap: unknown): cap is SafeDeviceCapability;
/**
 * Checks if a pairing state is terminal (no further forward progression without re-pairing flow).
 */
export declare function isTerminalPairingState(state: PairingState): boolean;
/**
 * Checks if a pairing state is in an active pending flow.
 */
export declare function isPendingPairingState(state: PairingState): boolean;
/**
 * Checks if a pairing state represents an established pair.
 */
export declare function isPairedState(state: PairingState): boolean;
/**
 * Checks if a device is in authoritative trusted state.
 */
export declare function isTrustedState(state: PairingState, trust: DeviceTrustLevel): boolean;
/**
 * Checks if a device is revoked in either pairing state or trust level.
 */
export declare function isRevokedState(state: PairingState, trust: DeviceTrustLevel): boolean;
/**
 * Checks if a device state permits initiating a fresh pairing request.
 */
export declare function canRequestPairing(state: PairingState): boolean;
