import type { PersistentDeviceTrustRecord, DeviceKeyMetadata, DeviceChallenge, DeviceProof } from './persistentDeviceTypes.js';
export declare class PersistentDeviceRegistry {
    private readonly devicesById;
    private readonly devicesByScopeAndId;
    private readonly deviceIdByFingerprint;
    private readonly deviceIdsByUserId;
    private readonly keysByDeviceId;
    private readonly activeChallenges;
    private readonly proofsById;
    private readonly usedNonces;
    private makeScopeKey;
    private makeNonceKey;
    /**
     * Registers or updates a persistent device record in the registry.
     */
    registerDevice(record: PersistentDeviceTrustRecord): void;
    /**
     * Retrieves a device by deviceId.
     */
    getDevice(deviceId: string): PersistentDeviceTrustRecord | undefined;
    /**
     * Retrieves a device by deviceId and 9-tuple scope string.
     */
    getDeviceByScope(deviceId: string, scopeString: string): PersistentDeviceTrustRecord | undefined;
    /**
     * Retrieves a device by its deterministic fingerprint.
     */
    getDeviceByFingerprint(fingerprint: string): PersistentDeviceTrustRecord | undefined;
    /**
     * Retrieves all devices associated with a specific userId.
     */
    getDevicesByUser(userId: string): readonly PersistentDeviceTrustRecord[];
    /**
     * Retrieves all devices within a given 9-tuple scope.
     */
    getDevicesByScope(scopeString: string): readonly PersistentDeviceTrustRecord[];
    /**
     * Updates an existing persistent device record.
     */
    updateDevice(record: PersistentDeviceTrustRecord): void;
    /**
     * Removes a device from the registry.
     */
    removeDevice(deviceId: string): boolean;
    /**
     * Registers cryptographic key metadata for a device.
     */
    registerKey(keyMeta: DeviceKeyMetadata): void;
    /**
     * Retrieves cryptographic key metadata for a device.
     */
    getKey(deviceId: string): DeviceKeyMetadata | undefined;
    /**
     * Stores an active recognition challenge.
     */
    storeChallenge(challenge: DeviceChallenge): void;
    /**
     * Retrieves an active recognition challenge.
     */
    getChallenge(challengeId: string): DeviceChallenge | undefined;
    /**
     * Consumes and removes an active recognition challenge (single-use semantics).
     */
    consumeChallenge(challengeId: string): DeviceChallenge | undefined;
    /**
     * Stores a verified or submitted device proof.
     */
    storeProof(proof: DeviceProof): void;
    /**
     * Retrieves a proof by proofId.
     */
    getProof(proofId: string): DeviceProof | undefined;
    /**
     * Checks whether a nonce has already been used for a given device (anti-replay).
     */
    hasProofNonce(deviceId: string, nonce: string): boolean;
    /**
     * Total number of registered devices.
     */
    size(): number;
    /**
     * Clears all entries in the registry.
     */
    clear(): void;
}
