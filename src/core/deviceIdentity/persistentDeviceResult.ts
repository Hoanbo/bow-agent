// src/core/deviceIdentity/persistentDeviceResult.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative result builders enforcing strict invariant boundaries:
// - DEVICE_IDENTITY != DEVICE_AUTHENTICATION != AUTHORIZATION != EXECUTION
// - DEVICE_RECOGNITION != EXECUTION_AUTHORITY
// - DEVICE_TRUST != BRAIN_AUTHORITY
// - SESSION_ELIGIBLE != SESSION_AUTHORIZED

import type {
  PersistentDeviceTrustRecord,
  DeviceRecognitionResult,
  DeviceRehydrationResult,
  DeviceProofVerificationResult,
  DeviceRevocationResult,
  DeviceKeyRotationResult,
  PersistentDeviceState,
  DeviceIdentityErrorCode,
} from './persistentDeviceTypes.js';
import { deepFreezeDevice } from './persistentDeviceFingerprint.js';

/**
 * Builds a successful DeviceRecognitionResult.
 * Session eligibility is ONLY true if recognized is true, record is valid and non-revoked.
 */
export function createSuccessRecognitionResult(
  record: PersistentDeviceTrustRecord,
  state: PersistentDeviceState = 'SESSION_ELIGIBLE',
): DeviceRecognitionResult {
  const sessionEligible =
    !record.revoked &&
    !record.rotationRequired &&
    (record.expiresAt === undefined || record.expiresAt > Date.now()) &&
    record.trustLevel !== 'REVOKED' &&
    record.trustLevel !== 'NONE';

  return deepFreezeDevice({
    recognized: true,
    state,
    record,
    sessionEligible,
    timestamp: Date.now(),
  });
}

/**
 * Builds a failed DeviceRecognitionResult (fails closed).
 */
export function createFailureRecognitionResult(
  failureCode: DeviceIdentityErrorCode,
  failureReason: string,
  state: PersistentDeviceState = 'FAILED',
  record?: PersistentDeviceTrustRecord,
): DeviceRecognitionResult {
  return deepFreezeDevice({
    recognized: false,
    state,
    record,
    sessionEligible: false,
    failureCode,
    failureReason,
    timestamp: Date.now(),
  });
}

/**
 * Builds a successful DeviceRehydrationResult.
 */
export function createSuccessRehydrationResult(
  record: PersistentDeviceTrustRecord,
): DeviceRehydrationResult {
  return deepFreezeDevice({
    rehydrated: true,
    record,
    timestamp: Date.now(),
  });
}

/**
 * Builds a failed DeviceRehydrationResult.
 */
export function createFailureRehydrationResult(
  error: string,
): DeviceRehydrationResult {
  return deepFreezeDevice({
    rehydrated: false,
    error,
    timestamp: Date.now(),
  });
}

/**
 * Builds a successful DeviceProofVerificationResult.
 */
export function createSuccessProofVerificationResult(
  challengeId: string,
  deviceId: string,
  keyVersion: number,
): DeviceProofVerificationResult {
  return deepFreezeDevice({
    valid: true,
    challengeId,
    deviceId,
    keyVersion,
    verifiedAt: Date.now(),
  });
}

/**
 * Builds a failed DeviceProofVerificationResult.
 */
export function createFailureProofVerificationResult(
  challengeId: string,
  deviceId: string,
  keyVersion: number,
  failureCode: DeviceIdentityErrorCode,
  failureReason: string,
): DeviceProofVerificationResult {
  return deepFreezeDevice({
    valid: false,
    challengeId,
    deviceId,
    keyVersion,
    failureCode,
    failureReason,
    verifiedAt: Date.now(),
  });
}

/**
 * Builds a successful DeviceRevocationResult.
 */
export function createSuccessRevocationResult(
  revokedRecord: PersistentDeviceTrustRecord,
  previousState: PersistentDeviceState,
): DeviceRevocationResult {
  return deepFreezeDevice({
    revoked: true,
    deviceId: revokedRecord.deviceId,
    revokedRecord,
    previousState,
    revokedAt: revokedRecord.revokedAt ?? Date.now(),
  });
}

/**
 * Builds a successful DeviceKeyRotationResult.
 */
export function createSuccessRotationResult(
  updatedRecord: PersistentDeviceTrustRecord,
  oldKeyVersion: number,
  newKeyVersion: number,
): DeviceKeyRotationResult {
  return deepFreezeDevice({
    rotated: true,
    deviceId: updatedRecord.deviceId,
    oldKeyVersion,
    newKeyVersion,
    updatedRecord,
    rotatedAt: Date.now(),
  });
}
