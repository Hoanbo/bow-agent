import type { DeviceRehydrationResult } from './persistentDeviceTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
/**
 * Authoritatively rehydrates and validates a stored PersistentDeviceTrustRecord.
 * Fails closed on tampered fingerprints, schema violations, or expired/revoked trust.
 */
export declare function rehydratePersistentDevice(raw: unknown, expectedScope: ScopedDeviceIdentity, currentTime?: number): DeviceRehydrationResult;
export declare const rehydrateDeviceRecord: typeof rehydratePersistentDevice;
