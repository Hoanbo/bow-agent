import type { DeviceKeyMetadata } from './persistentDeviceTypes.js';
export interface DeviceKeyStore {
    generateKey(deviceId: string, version?: number, algorithm?: string): DeviceKeyMetadata;
    getKey(keyId: string): DeviceKeyMetadata | undefined;
    getKeyForDevice(deviceId: string, version?: number): DeviceKeyMetadata | undefined;
    rotateKey(deviceId: string): DeviceKeyMetadata;
    revokeKey(keyId: string, reason?: string): DeviceKeyMetadata;
    signChallenge(keyId: string, payload: string): string;
    verifySignature(keyId: string, payload: string, signature: string): boolean;
    listKeys(deviceId?: string): readonly DeviceKeyMetadata[];
    clear(): void;
}
export declare class InMemoryDeviceKeyStore implements DeviceKeyStore {
    private readonly keysById;
    private readonly keysByDevice;
    /**
     * Generates a new cryptographic key entry with an opaque privateKeyRef.
     */
    generateKey(deviceId: string, version?: number, algorithm?: string): DeviceKeyMetadata;
    getKey(keyId: string): DeviceKeyMetadata | undefined;
    getKeyForDevice(deviceId: string, version?: number): DeviceKeyMetadata | undefined;
    /**
     * Rotates a device's key to the next monotonic version.
     */
    rotateKey(deviceId: string): DeviceKeyMetadata;
    /**
     * Revokes a key authoritatively.
     */
    revokeKey(keyId: string): DeviceKeyMetadata;
    /**
     * Computes a deterministic proof signature over challenge payload using the key reference.
     */
    signChallenge(keyId: string, payload: string): string;
    /**
     * Verifies proof signature against key and payload.
     */
    verifySignature(keyId: string, payload: string, signature: string): boolean;
    listKeys(deviceId?: string): readonly DeviceKeyMetadata[];
    clear(): void;
}
/**
 * Helper to rotate a device's key in the given key store.
 */
export declare function rotateDeviceKey(keyStore: DeviceKeyStore, deviceId: string): DeviceKeyMetadata;
