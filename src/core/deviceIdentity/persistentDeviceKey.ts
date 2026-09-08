// src/core/deviceIdentity/persistentDeviceKey.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Cryptographic key abstraction and in-memory key store.
// Strictly manages public keys and opaque privateKeyReferences.
// Raw private keys are NEVER persisted, serialized, or exposed.

import type { DeviceKeyMetadata } from './persistentDeviceTypes.js';
import { generateKeyId } from './persistentDeviceIdentity.js';
import { computeDeviceDigest, deepFreezeDevice } from './persistentDeviceFingerprint.js';
import { assertValidDeviceKeyStateTransition } from './persistentDeviceTransitions.js';

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

export class InMemoryDeviceKeyStore implements DeviceKeyStore {
  private readonly keysById = new Map<string, DeviceKeyMetadata>();
  private readonly keysByDevice = new Map<string, DeviceKeyMetadata[]>();

  /**
   * Generates a new cryptographic key entry with an opaque privateKeyRef.
   */
  public generateKey(
    deviceId: string,
    version = 1,
    algorithm = 'ED25519_REF'
  ): DeviceKeyMetadata {
    const keyId = generateKeyId(deviceId, version);
    const now = Date.now();

    // Deterministically derive public key identifier from deviceId and keyId
    const publicKey = `pub_${computeDeviceDigest({ deviceId, keyId, version, algorithm })}`;
    // Opaque reference pointing to secure keystore (never plaintext secret bytes)
    const privateKeyRef = `ref://keystore/${deviceId}/${keyId}`;

    const metadata: DeviceKeyMetadata = {
      keyId,
      deviceId,
      publicKey,
      privateKeyRef,
      keyAlgorithm: algorithm,
      keyVersion: version,
      keyState: 'ACTIVE',
      createdAt: now,
    };

    const frozen = deepFreezeDevice(metadata);
    this.keysById.set(keyId, frozen);

    const deviceList = this.keysByDevice.get(deviceId) ?? [];
    deviceList.push(frozen);
    this.keysByDevice.set(deviceId, deviceList);

    return frozen;
  }

  public getKey(keyId: string): DeviceKeyMetadata | undefined {
    return this.keysById.get(keyId);
  }

  public getKeyForDevice(deviceId: string, version?: number): DeviceKeyMetadata | undefined {
    const list = this.keysByDevice.get(deviceId);
    if (!list || list.length === 0) {
      return undefined;
    }
    if (version !== undefined) {
      return list.find((k) => k.keyVersion === version);
    }
    // Return newest version
    return list[list.length - 1];
  }

  /**
   * Rotates a device's key to the next monotonic version.
   */
  public rotateKey(deviceId: string): DeviceKeyMetadata {
    const current = this.getKeyForDevice(deviceId);
    const nextVersion = current ? current.keyVersion + 1 : 1;

    if (current && current.keyState === 'ACTIVE') {
      assertValidDeviceKeyStateTransition(current.keyState, 'ROTATED');
      const rotatedCurrent: DeviceKeyMetadata = {
        ...current,
        keyState: 'ROTATED',
        rotatedAt: Date.now(),
      };
      this.keysById.set(current.keyId, deepFreezeDevice(rotatedCurrent));
    }

    return this.generateKey(deviceId, nextVersion);
  }

  /**
   * Revokes a key authoritatively.
   */
  public revokeKey(keyId: string): DeviceKeyMetadata {
    const key = this.keysById.get(keyId);
    if (!key) {
      throw new Error(`[DEVICE_KEY_INVALID] Key ${keyId} not found in keystore`);
    }

    assertValidDeviceKeyStateTransition(key.keyState, 'REVOKED');
    const revoked: DeviceKeyMetadata = {
      ...key,
      keyState: 'REVOKED',
      revokedAt: Date.now(),
    };

    const frozen = deepFreezeDevice(revoked);
    this.keysById.set(keyId, frozen);
    return frozen;
  }

  /**
   * Computes a deterministic proof signature over challenge payload using the key reference.
   */
  public signChallenge(keyId: string, payload: string): string {
    const key = this.keysById.get(keyId);
    if (!key) {
      throw new Error(`[DEVICE_KEY_INVALID] Signing failed: key ${keyId} does not exist`);
    }
    if (key.keyState === 'REVOKED') {
      throw new Error(`[DEVICE_KEY_INVALID] Signing failed: key ${keyId} is in state REVOKED`);
    }

    // Deterministic signature algorithm using privateKeyRef + payload (opaque proof)
    const digest = computeDeviceDigest({
      ref: key.privateKeyRef,
      payload,
      version: key.keyVersion,
    });
    return `sig_${digest}`;
  }

  /**
   * Verifies proof signature against key and payload.
   */
  public verifySignature(keyId: string, payload: string, signature: string): boolean {
    const key = this.keysById.get(keyId);
    if (!key || key.keyState === 'REVOKED' || key.keyState === 'EXPIRED') {
      return false;
    }
    const expected = computeDeviceDigest({
      ref: key.privateKeyRef,
      payload,
      version: key.keyVersion,
    });
    return signature === `sig_${expected}`;
  }

  public listKeys(deviceId?: string): readonly DeviceKeyMetadata[] {
    if (!deviceId) {
      return Object.freeze(Array.from(this.keysById.values()));
    }
    return Object.freeze(this.keysByDevice.get(deviceId) ?? []);
  }

  public clear(): void {
    this.keysById.clear();
    this.keysByDevice.clear();
  }
}

/**
 * Helper to rotate a device's key in the given key store.
 */
export function rotateDeviceKey(keyStore: DeviceKeyStore, deviceId: string): DeviceKeyMetadata {
  return keyStore.rotateKey(deviceId);
}
