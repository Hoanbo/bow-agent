// src/core/deviceIdentity/persistentDeviceRegistry.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// In-memory, 9-tuple scope-isolated registry for persistent devices,
// key metadata, ephemeral challenges, and cryptographic proofs.
//
// STRICT INVARIANTS:
// - DEVICE_IDENTITY != DEVICE_AUTHENTICATION
// - ONE_USER != ONE_DEVICE
// - ONE_DEVICE != ONE_SESSION
// - Scope isolation enforced via 9-tuple keys
export class PersistentDeviceRegistry {
    // Key: deviceId -> PersistentDeviceTrustRecord
    devicesById = new Map();
    // Key: `${scopeString}::${deviceId}` -> PersistentDeviceTrustRecord
    devicesByScopeAndId = new Map();
    // Key: deterministicFingerprint -> deviceId
    deviceIdByFingerprint = new Map();
    // Key: userId -> Set<deviceId>
    deviceIdsByUserId = new Map();
    // Key: deviceId -> DeviceKeyMetadata
    keysByDeviceId = new Map();
    // Key: challengeId -> DeviceChallenge
    activeChallenges = new Map();
    // Key: proofId -> DeviceProof
    proofsById = new Map();
    // Key: `${deviceId}::${nonce}` -> timestamp (replay prevention)
    usedNonces = new Map();
    makeScopeKey(scopeString, deviceId) {
        return `${scopeString}::${deviceId}`;
    }
    makeNonceKey(deviceId, nonce) {
        return `${deviceId}::${nonce}`;
    }
    /**
     * Registers or updates a persistent device record in the registry.
     */
    registerDevice(record) {
        const scopeKey = this.makeScopeKey(record.scopeString, record.deviceId);
        this.devicesById.set(record.deviceId, record);
        this.devicesByScopeAndId.set(scopeKey, record);
        this.deviceIdByFingerprint.set(record.deterministicFingerprint, record.deviceId);
        let userSet = this.deviceIdsByUserId.get(record.userId);
        if (!userSet) {
            userSet = new Set();
            this.deviceIdsByUserId.set(record.userId, userSet);
        }
        userSet.add(record.deviceId);
    }
    /**
     * Retrieves a device by deviceId.
     */
    getDevice(deviceId) {
        return this.devicesById.get(deviceId);
    }
    /**
     * Retrieves a device by deviceId and 9-tuple scope string.
     */
    getDeviceByScope(deviceId, scopeString) {
        const scopeKey = this.makeScopeKey(scopeString, deviceId);
        return this.devicesByScopeAndId.get(scopeKey);
    }
    /**
     * Retrieves a device by its deterministic fingerprint.
     */
    getDeviceByFingerprint(fingerprint) {
        const deviceId = this.deviceIdByFingerprint.get(fingerprint);
        if (!deviceId) {
            return undefined;
        }
        return this.devicesById.get(deviceId);
    }
    /**
     * Retrieves all devices associated with a specific userId.
     */
    getDevicesByUser(userId) {
        const deviceIds = this.deviceIdsByUserId.get(userId);
        if (!deviceIds || deviceIds.size === 0) {
            return [];
        }
        const results = [];
        for (const id of deviceIds) {
            const record = this.devicesById.get(id);
            if (record) {
                results.push(record);
            }
        }
        return Object.freeze(results);
    }
    /**
     * Retrieves all devices within a given 9-tuple scope.
     */
    getDevicesByScope(scopeString) {
        const results = [];
        for (const record of this.devicesById.values()) {
            if (record.scopeString === scopeString) {
                results.push(record);
            }
        }
        return Object.freeze(results);
    }
    /**
     * Updates an existing persistent device record.
     */
    updateDevice(record) {
        this.registerDevice(record);
    }
    /**
     * Removes a device from the registry.
     */
    removeDevice(deviceId) {
        const record = this.devicesById.get(deviceId);
        if (!record) {
            return false;
        }
        const scopeKey = this.makeScopeKey(record.scopeString, record.deviceId);
        this.devicesById.delete(deviceId);
        this.devicesByScopeAndId.delete(scopeKey);
        this.deviceIdByFingerprint.delete(record.deterministicFingerprint);
        const userSet = this.deviceIdsByUserId.get(record.userId);
        if (userSet) {
            userSet.delete(deviceId);
            if (userSet.size === 0) {
                this.deviceIdsByUserId.delete(record.userId);
            }
        }
        return true;
    }
    /**
     * Registers cryptographic key metadata for a device.
     */
    registerKey(keyMeta) {
        this.keysByDeviceId.set(keyMeta.deviceId, keyMeta);
    }
    /**
     * Retrieves cryptographic key metadata for a device.
     */
    getKey(deviceId) {
        return this.keysByDeviceId.get(deviceId);
    }
    /**
     * Stores an active recognition challenge.
     */
    storeChallenge(challenge) {
        this.activeChallenges.set(challenge.challengeId, challenge);
    }
    /**
     * Retrieves an active recognition challenge.
     */
    getChallenge(challengeId) {
        return this.activeChallenges.get(challengeId);
    }
    /**
     * Consumes and removes an active recognition challenge (single-use semantics).
     */
    consumeChallenge(challengeId) {
        const challenge = this.activeChallenges.get(challengeId);
        if (challenge) {
            this.activeChallenges.delete(challengeId);
        }
        return challenge;
    }
    /**
     * Stores a verified or submitted device proof.
     */
    storeProof(proof) {
        this.proofsById.set(proof.proofId, proof);
        this.usedNonces.set(this.makeNonceKey(proof.deviceId, proof.nonce), proof.createdAt);
    }
    /**
     * Retrieves a proof by proofId.
     */
    getProof(proofId) {
        return this.proofsById.get(proofId);
    }
    /**
     * Checks whether a nonce has already been used for a given device (anti-replay).
     */
    hasProofNonce(deviceId, nonce) {
        return this.usedNonces.has(this.makeNonceKey(deviceId, nonce));
    }
    /**
     * Total number of registered devices.
     */
    size() {
        return this.devicesById.size;
    }
    /**
     * Clears all entries in the registry.
     */
    clear() {
        this.devicesById.clear();
        this.devicesByScopeAndId.clear();
        this.deviceIdByFingerprint.clear();
        this.deviceIdsByUserId.clear();
        this.keysByDeviceId.clear();
        this.activeChallenges.clear();
        this.proofsById.clear();
        this.usedNonces.clear();
    }
}
