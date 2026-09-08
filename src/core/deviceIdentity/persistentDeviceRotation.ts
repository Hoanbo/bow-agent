// src/core/deviceIdentity/persistentDeviceRotation.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Key rotation protocol for persistent devices.
// Generates new monotonic key versions and invalidates obsolete keys.

import type { DeviceKeyRotationResult, PersistentDeviceTrustRecord } from './persistentDeviceTypes.js';
import type { PersistentDeviceStore } from './persistentDeviceStorage.js';
import type { DeviceKeyStore } from './persistentDeviceKey.js';
import {
  updatePersistentDeviceTrustRecord,
  markPersistentDeviceRotationRequired,
} from './persistentDeviceRecord.js';
import { computeDeviceDigest, computeDeviceCapabilityFingerprint } from './persistentDeviceFingerprint.js';

/**
 * Marks a persistent device as requiring key rotation.
 */
export function requireKeyRotation(
  store: PersistentDeviceStore,
  deviceId: string,
  scopeString: string,
  timestamp?: number
): PersistentDeviceTrustRecord {
  const record = store.findByDeviceId(deviceId, scopeString);
  if (!record) {
    throw new Error(`[DEVICE_NOT_FOUND] Cannot require rotation for unknown device ${deviceId}`);
  }

  const updated = markPersistentDeviceRotationRequired(record, timestamp);
  store.updateTrustState(updated);
  return updated;
}

/**
 * Executes authoritative key rotation for a persistent device.
 * Increments key version, generates fresh key metadata, updates fingerprint, and clears rotation flag.
 */
export function rotatePersistentDeviceKey(
  store: PersistentDeviceStore,
  keyStore: DeviceKeyStore,
  deviceId: string,
  scopeString: string,
  timestamp?: number
): DeviceKeyRotationResult {
  const now = timestamp ?? Date.now();
  const record = store.findByDeviceId(deviceId, scopeString);
  if (!record) {
    throw new Error(`[DEVICE_NOT_FOUND] Cannot rotate key for unknown device ${deviceId}`);
  }

  const oldKeyVersion = record.keyVersion;
  const newKey = keyStore.rotateKey(deviceId);
  const newKeyVersion = newKey.keyVersion;

  const capFp = computeDeviceCapabilityFingerprint(record.capabilityEnvelope);
  const newFingerprint = computeDeviceDigest({
    deviceId: record.deviceId,
    userId: record.userId,
    brainId: record.brainId,
    surfaceId: record.surfaceId,
    pairingId: record.pairingId,
    trustId: record.trustId,
    publicKeyId: newKey.keyId,
    keyVersion: newKeyVersion,
    scopeString: record.scopeString,
    capFp,
    protocolVersion: record.protocolVersion,
    identityVersion: record.identityVersion,
  });

  const updatedRecord = updatePersistentDeviceTrustRecord(
    record,
    'TRUSTED',
    {
      publicKeyId: newKey.keyId,
      keyVersion: newKeyVersion,
      rotationRequired: false,
      deterministicFingerprint: newFingerprint,
    },
    now
  );

  store.updateTrustState(updatedRecord);

  return {
    rotated: true,
    deviceId,
    oldKeyVersion,
    newKeyVersion,
    updatedRecord,
    rotatedAt: now,
  };
}
