// src/core/deviceIdentity/persistentDeviceTrust.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Trust evaluation and validation logic for persistent devices.
// Evaluates revocation, scope match, expiration, and key rotation status.

import type {
  PersistentDeviceTrustRecord,
  PersistentDeviceState,
  DeviceIdentityErrorCode,
} from './persistentDeviceTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import { areDeviceScopesEqual, createDeviceScope } from '../pairing/pairingScope.js';

export interface TrustValidationResult {
  readonly trusted: boolean;
  readonly failureCode?: DeviceIdentityErrorCode;
  readonly failureReason?: string;
}

/**
 * Validates whether a PersistentDeviceTrustRecord represents active, valid trust.
 */
export function validatePersistentDeviceTrust(
  record: PersistentDeviceTrustRecord,
  targetScope: ScopedDeviceIdentity,
  currentTime?: number
): TrustValidationResult {
  const now = currentTime ?? Date.now();

  // 1. Revocation check (fails closed)
  if (record.revoked || record.trustLevel === 'REVOKED' || record.lifecycleState === 'REVOKED') {
    return {
      trusted: false,
      failureCode: 'DEVICE_REVOKED',
      failureReason: `Device ${record.deviceId} has been revoked: ${record.revocationReason ?? 'no reason specified'}`,
    };
  }

  // 2. Scope isolation check
  if (!areDeviceScopesEqual(record.scope, targetScope)) {
    return {
      trusted: false,
      failureCode: 'DEVICE_SCOPE_MISMATCH',
      failureReason: `Scope mismatch for device ${record.deviceId}: expected (${record.scopeString}) vs actual (${createDeviceScope(targetScope)})`,
    };
  }

  // 3. Expiration check
  if (record.expiresAt && now > record.expiresAt) {
    return {
      trusted: false,
      failureCode: 'DEVICE_KEY_EXPIRED',
      failureReason: `Trust for device ${record.deviceId} expired at ${record.expiresAt} (current: ${now})`,
    };
  }

  // 4. Rotation requirement check
  if (record.rotationRequired || record.lifecycleState === 'ROTATION_REQUIRED') {
    return {
      trusted: false,
      failureCode: 'DEVICE_KEY_ROTATION_REQUIRED',
      failureReason: `Device ${record.deviceId} requires cryptographic key rotation before recognition`,
    };
  }

  // 5. Active state check
  if (record.trustLevel !== 'TRUSTED') {
    return {
      trusted: false,
      failureCode: 'DEVICE_NOT_TRUSTED',
      failureReason: `Device ${record.deviceId} trust level is '${record.trustLevel}' (expected 'TRUSTED')`,
    };
  }

  return { trusted: true };
}

/**
 * Checks if a device record or state is eligible for fresh connection session establishment.
 */
export function isDeviceSessionEligible(
  recordOrState: PersistentDeviceTrustRecord | PersistentDeviceState,
  currentTime?: number
): boolean {
  if (typeof recordOrState === 'string') {
    return recordOrState === 'SESSION_ELIGIBLE';
  }
  const validation = validatePersistentDeviceTrust(recordOrState, recordOrState.scope, currentTime);
  return validation.trusted && recordOrState.lifecycleState === 'SESSION_ELIGIBLE';
}

/**
 * Asserts that a device is actively trusted; throws fail-closed error otherwise.
 */
export function assertDeviceTrusted(
  record: PersistentDeviceTrustRecord,
  targetScope: ScopedDeviceIdentity,
  currentTime?: number
): void {
  const result = validatePersistentDeviceTrust(record, targetScope, currentTime);
  if (!result.trusted) {
    throw new Error(`[${result.failureCode ?? 'DEVICE_NOT_TRUSTED'}] ${result.failureReason}`);
  }
}
