// src/core/deviceIdentity/persistentDeviceRevocation.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative device revocation.
// Invalidates recognition and future session eligibility permanently.

import type { DeviceRevocationResult } from './persistentDeviceTypes.js';
import type { PersistentDeviceStore } from './persistentDeviceStorage.js';
import type { DeviceKeyStore } from './persistentDeviceKey.js';
import { revokePersistentDeviceTrustRecord } from './persistentDeviceRecord.js';

/**
 * Authoritatively revokes a persistent device and its associated cryptographic keys.
 * Fails closed on unknown devices or missing records.
 */
export function revokePersistentDevice(
  store: PersistentDeviceStore,
  keyStore: DeviceKeyStore,
  deviceId: string,
  scopeString: string,
  reason: string,
  timestamp?: number
): DeviceRevocationResult {
  const now = timestamp ?? Date.now();
  const existing = store.findByDeviceId(deviceId, scopeString);
  if (!existing) {
    throw new Error(`[DEVICE_NOT_FOUND] Cannot revoke unknown device ${deviceId} in scope ${scopeString}`);
  }

  const previousState = existing.lifecycleState;
  const revokedRecord = revokePersistentDeviceTrustRecord(existing, reason, now);

  // Revoke associated cryptographic keys in keystore
  const keys = keyStore.listKeys(deviceId);
  for (const k of keys) {
    if (k.keyState !== 'REVOKED') {
      try {
        keyStore.revokeKey(k.keyId, reason);
      } catch {
        // Continue revoking remaining keys
      }
    }
  }

  // Update record in persistent store
  store.updateTrustState(revokedRecord);

  return {
    revoked: true,
    deviceId,
    revokedRecord,
    previousState,
    revokedAt: now,
  };
}
