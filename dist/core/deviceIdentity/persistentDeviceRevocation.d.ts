import type { DeviceRevocationResult } from './persistentDeviceTypes.js';
import type { PersistentDeviceStore } from './persistentDeviceStorage.js';
import type { DeviceKeyStore } from './persistentDeviceKey.js';
/**
 * Authoritatively revokes a persistent device and its associated cryptographic keys.
 * Fails closed on unknown devices or missing records.
 */
export declare function revokePersistentDevice(store: PersistentDeviceStore, keyStore: DeviceKeyStore, deviceId: string, scopeString: string, reason: string, timestamp?: number): DeviceRevocationResult;
