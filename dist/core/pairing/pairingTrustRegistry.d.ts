import type { PairingRecord, TrustRecord, DeviceTrustLevel } from './pairingTypes.js';
import type { PairingRegistry } from './pairingRegistry.js';
export declare class PairingTrustRegistry {
    private readonly registry;
    constructor(registry: PairingRegistry);
    /**
     * Checks whether a device is currently paired in the given scope.
     */
    isDevicePaired(deviceId: string, scopeString: string): boolean;
    /**
     * Checks whether a device has active authoritative trust in the given scope.
     */
    isDeviceTrusted(deviceId: string, scopeString: string): boolean;
    /**
     * Retrieves the current DeviceTrustLevel for a device in the given scope.
     */
    getDeviceTrustLevel(deviceId: string, scopeString: string): DeviceTrustLevel;
    /**
     * Checks whether a device is marked as revoked.
     */
    isDeviceRevoked(deviceId: string, scopeString: string): boolean;
    /**
     * Retrieves the PairingRecord for a device in the given scope.
     */
    getPairingRecord(deviceId: string, scopeString: string): PairingRecord | undefined;
    /**
     * Retrieves the TrustRecord for a device in the given scope.
     */
    getTrustRecord(deviceId: string, scopeString: string): TrustRecord | undefined;
}
