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

import type {
  PersistentDeviceTrustRecord,
  DeviceKeyMetadata,
  DeviceChallenge,
  DeviceProof,
} from './persistentDeviceTypes.js';

export class PersistentDeviceRegistry {
  // Key: deviceId -> PersistentDeviceTrustRecord
  private readonly devicesById = new Map<string, PersistentDeviceTrustRecord>();

  // Key: `${scopeString}::${deviceId}` -> PersistentDeviceTrustRecord
  private readonly devicesByScopeAndId = new Map<string, PersistentDeviceTrustRecord>();

  // Key: deterministicFingerprint -> deviceId
  private readonly deviceIdByFingerprint = new Map<string, string>();

  // Key: userId -> Set<deviceId>
  private readonly deviceIdsByUserId = new Map<string, Set<string>>();

  // Key: deviceId -> DeviceKeyMetadata
  private readonly keysByDeviceId = new Map<string, DeviceKeyMetadata>();

  // Key: challengeId -> DeviceChallenge
  private readonly activeChallenges = new Map<string, DeviceChallenge>();

  // Key: proofId -> DeviceProof
  private readonly proofsById = new Map<string, DeviceProof>();

  // Key: `${deviceId}::${nonce}` -> timestamp (replay prevention)
  private readonly usedNonces = new Map<string, number>();

  private makeScopeKey(scopeString: string, deviceId: string): string {
    return `${scopeString}::${deviceId}`;
  }

  private makeNonceKey(deviceId: string, nonce: string): string {
    return `${deviceId}::${nonce}`;
  }

  /**
   * Registers or updates a persistent device record in the registry.
   */
  public registerDevice(record: PersistentDeviceTrustRecord): void {
    const scopeKey = this.makeScopeKey(record.scopeString, record.deviceId);
    this.devicesById.set(record.deviceId, record);
    this.devicesByScopeAndId.set(scopeKey, record);
    this.deviceIdByFingerprint.set(record.deterministicFingerprint, record.deviceId);

    let userSet = this.deviceIdsByUserId.get(record.userId);
    if (!userSet) {
      userSet = new Set<string>();
      this.deviceIdsByUserId.set(record.userId, userSet);
    }
    userSet.add(record.deviceId);
  }

  /**
   * Retrieves a device by deviceId.
   */
  public getDevice(deviceId: string): PersistentDeviceTrustRecord | undefined {
    return this.devicesById.get(deviceId);
  }

  /**
   * Retrieves a device by deviceId and 9-tuple scope string.
   */
  public getDeviceByScope(deviceId: string, scopeString: string): PersistentDeviceTrustRecord | undefined {
    const scopeKey = this.makeScopeKey(scopeString, deviceId);
    return this.devicesByScopeAndId.get(scopeKey);
  }

  /**
   * Retrieves a device by its deterministic fingerprint.
   */
  public getDeviceByFingerprint(fingerprint: string): PersistentDeviceTrustRecord | undefined {
    const deviceId = this.deviceIdByFingerprint.get(fingerprint);
    if (!deviceId) {
      return undefined;
    }
    return this.devicesById.get(deviceId);
  }

  /**
   * Retrieves all devices associated with a specific userId.
   */
  public getDevicesByUser(userId: string): readonly PersistentDeviceTrustRecord[] {
    const deviceIds = this.deviceIdsByUserId.get(userId);
    if (!deviceIds || deviceIds.size === 0) {
      return [];
    }
    const results: PersistentDeviceTrustRecord[] = [];
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
  public getDevicesByScope(scopeString: string): readonly PersistentDeviceTrustRecord[] {
    const results: PersistentDeviceTrustRecord[] = [];
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
  public updateDevice(record: PersistentDeviceTrustRecord): void {
    this.registerDevice(record);
  }

  /**
   * Removes a device from the registry.
   */
  public removeDevice(deviceId: string): boolean {
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
  public registerKey(keyMeta: DeviceKeyMetadata): void {
    this.keysByDeviceId.set(keyMeta.deviceId, keyMeta);
  }

  /**
   * Retrieves cryptographic key metadata for a device.
   */
  public getKey(deviceId: string): DeviceKeyMetadata | undefined {
    return this.keysByDeviceId.get(deviceId);
  }

  /**
   * Stores an active recognition challenge.
   */
  public storeChallenge(challenge: DeviceChallenge): void {
    this.activeChallenges.set(challenge.challengeId, challenge);
  }

  /**
   * Retrieves an active recognition challenge.
   */
  public getChallenge(challengeId: string): DeviceChallenge | undefined {
    return this.activeChallenges.get(challengeId);
  }

  /**
   * Consumes and removes an active recognition challenge (single-use semantics).
   */
  public consumeChallenge(challengeId: string): DeviceChallenge | undefined {
    const challenge = this.activeChallenges.get(challengeId);
    if (challenge) {
      this.activeChallenges.delete(challengeId);
    }
    return challenge;
  }

  /**
   * Stores a verified or submitted device proof.
   */
  public storeProof(proof: DeviceProof): void {
    this.proofsById.set(proof.proofId, proof);
    this.usedNonces.set(this.makeNonceKey(proof.deviceId, proof.nonce), proof.createdAt);
  }

  /**
   * Retrieves a proof by proofId.
   */
  public getProof(proofId: string): DeviceProof | undefined {
    return this.proofsById.get(proofId);
  }

  /**
   * Checks whether a nonce has already been used for a given device (anti-replay).
   */
  public hasProofNonce(deviceId: string, nonce: string): boolean {
    return this.usedNonces.has(this.makeNonceKey(deviceId, nonce));
  }

  /**
   * Total number of registered devices.
   */
  public size(): number {
    return this.devicesById.size;
  }

  /**
   * Clears all entries in the registry.
   */
  public clear(): void {
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
