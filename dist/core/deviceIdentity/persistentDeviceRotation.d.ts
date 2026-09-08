import type { DeviceKeyRotationResult, PersistentDeviceTrustRecord } from './persistentDeviceTypes.js';
import type { PersistentDeviceStore } from './persistentDeviceStorage.js';
import type { DeviceKeyStore } from './persistentDeviceKey.js';
/**
 * Marks a persistent device as requiring key rotation.
 */
export declare function requireKeyRotation(store: PersistentDeviceStore, deviceId: string, scopeString: string, timestamp?: number): PersistentDeviceTrustRecord;
/**
 * Executes authoritative key rotation for a persistent device.
 * Increments key version, generates fresh key metadata, updates fingerprint, and clears rotation flag.
 */
export declare function rotatePersistentDeviceKey(store: PersistentDeviceStore, keyStore: DeviceKeyStore, deviceId: string, scopeString: string, timestamp?: number): DeviceKeyRotationResult;
