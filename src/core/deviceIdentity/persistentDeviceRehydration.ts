// src/core/deviceIdentity/persistentDeviceRehydration.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Rehydrates stored PersistentDeviceTrustRecords.
// Verifies schema integrity, cryptographic fingerprint, 9-tuple scope, revocation, and expiration.
// Invariant: REHYDRATION != AUTHORIZATION != TOOL_EXECUTION.

import type {
  PersistentDeviceTrustRecord,
  DeviceRehydrationResult,
} from './persistentDeviceTypes.js';
import { PERSISTENT_DEVICE_PROTOCOL_VERSION } from './persistentDeviceTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import { areDeviceScopesEqual, createDeviceScope } from '../pairing/pairingScope.js';
import { computeDeviceDigest, computeDeviceCapabilityFingerprint, deepFreezeDevice } from './persistentDeviceFingerprint.js';
import { isValidDeviceId, isValidKeyId, isValidPersistentTrustId } from './persistentDeviceIdentity.js';
import { isValidPersistentDeviceState } from './persistentDeviceStates.js';

/**
 * Authoritatively rehydrates and validates a stored PersistentDeviceTrustRecord.
 * Fails closed on tampered fingerprints, schema violations, or expired/revoked trust.
 */
export function rehydratePersistentDevice(
  raw: unknown,
  expectedScope: ScopedDeviceIdentity,
  currentTime?: number
): DeviceRehydrationResult {
  const now = currentTime ?? Date.now();

  if (!raw || typeof raw !== 'object') {
    return {
      rehydrated: false,
      error: '[DEVICE_REHYDRATION_FAILED] Record payload is null or not an object',
      timestamp: now,
    };
  }

  const record = raw as PersistentDeviceTrustRecord;

  // 1. Basic schema checks
  if (!isValidDeviceId(record.deviceId)) {
    return {
      rehydrated: false,
      error: `[DEVICE_REHYDRATION_FAILED] Invalid deviceId format: ${record.deviceId}`,
      timestamp: now,
    };
  }

  if (!isValidPersistentDeviceState(record.lifecycleState)) {
    return {
      rehydrated: false,
      error: `[DEVICE_REHYDRATION_FAILED] Unknown lifecycleState: ${record.lifecycleState}`,
      timestamp: now,
    };
  }

  if (record.protocolVersion !== PERSISTENT_DEVICE_PROTOCOL_VERSION) {
    return {
      rehydrated: false,
      error: `[DEVICE_REHYDRATION_FAILED] Protocol mismatch: expected ${PERSISTENT_DEVICE_PROTOCOL_VERSION}, got ${record.protocolVersion}`,
      timestamp: now,
    };
  }

  // 2. Scope validation
  if (!record.scope || !areDeviceScopesEqual(record.scope, expectedScope)) {
    return {
      rehydrated: false,
      error: `[DEVICE_SCOPE_MISMATCH] Rehydrated record scope does not match expected scope`,
      timestamp: now,
    };
  }

  // 3. Recompute deterministic fingerprint to detect tampering or bit-rot
  const capFp = computeDeviceCapabilityFingerprint(record.capabilityEnvelope ?? []);
  const expectedFingerprint = computeDeviceDigest({
    deviceId: record.deviceId,
    userId: record.userId,
    brainId: record.brainId,
    surfaceId: record.surfaceId,
    pairingId: record.pairingId,
    trustId: record.trustId,
    publicKeyId: record.publicKeyId,
    keyVersion: record.keyVersion,
    scopeString: record.scopeString,
    capFp,
    protocolVersion: record.protocolVersion,
    identityVersion: record.identityVersion,
  });

  if (record.deterministicFingerprint !== expectedFingerprint) {
    return {
      rehydrated: false,
      error: `[DEVICE_REHYDRATION_FAILED] Fingerprint mismatch detected; record corrupted or tampered`,
      timestamp: now,
    };
  }

  // 4. Check revocation state
  if (record.revoked || record.lifecycleState === 'REVOKED' || record.trustLevel === 'REVOKED') {
    return {
      rehydrated: false,
      error: `[DEVICE_REVOKED] Cannot rehydrate revoked device ${record.deviceId}`,
      timestamp: now,
    };
  }

  // 5. Check expiration
  if (record.expiresAt && now > record.expiresAt) {
    return {
      rehydrated: false,
      error: `[DEVICE_KEY_EXPIRED] Trust record for ${record.deviceId} expired at ${record.expiresAt}`,
      timestamp: now,
    };
  }

  return {
    rehydrated: true,
    record: deepFreezeDevice(record),
    timestamp: now,
  };
}

export const rehydrateDeviceRecord = rehydratePersistentDevice;
