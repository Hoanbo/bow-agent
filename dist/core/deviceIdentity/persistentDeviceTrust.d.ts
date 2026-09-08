import type { PersistentDeviceTrustRecord, PersistentDeviceState, DeviceIdentityErrorCode } from './persistentDeviceTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
export interface TrustValidationResult {
    readonly trusted: boolean;
    readonly failureCode?: DeviceIdentityErrorCode;
    readonly failureReason?: string;
}
/**
 * Validates whether a PersistentDeviceTrustRecord represents active, valid trust.
 */
export declare function validatePersistentDeviceTrust(record: PersistentDeviceTrustRecord, targetScope: ScopedDeviceIdentity, currentTime?: number): TrustValidationResult;
/**
 * Checks if a device record or state is eligible for fresh connection session establishment.
 */
export declare function isDeviceSessionEligible(recordOrState: PersistentDeviceTrustRecord | PersistentDeviceState, currentTime?: number): boolean;
/**
 * Asserts that a device is actively trusted; throws fail-closed error otherwise.
 */
export declare function assertDeviceTrusted(record: PersistentDeviceTrustRecord, targetScope: ScopedDeviceIdentity, currentTime?: number): void;
