// src/core/deviceIdentity/persistentDeviceResult.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative result builders enforcing strict invariant boundaries:
// - DEVICE_IDENTITY != DEVICE_AUTHENTICATION != AUTHORIZATION != EXECUTION
// - DEVICE_RECOGNITION != EXECUTION_AUTHORITY
// - DEVICE_TRUST != BRAIN_AUTHORITY
// - SESSION_ELIGIBLE != SESSION_AUTHORIZED
import { deepFreezeDevice } from './persistentDeviceFingerprint.js';
/**
 * Builds a successful DeviceRecognitionResult.
 * Session eligibility is ONLY true if recognized is true, record is valid and non-revoked.
 */
export function createSuccessRecognitionResult(record, state = 'SESSION_ELIGIBLE') {
    const sessionEligible = !record.revoked &&
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
export function createFailureRecognitionResult(failureCode, failureReason, state = 'FAILED', record) {
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
export function createSuccessRehydrationResult(record) {
    return deepFreezeDevice({
        rehydrated: true,
        record,
        timestamp: Date.now(),
    });
}
/**
 * Builds a failed DeviceRehydrationResult.
 */
export function createFailureRehydrationResult(error) {
    return deepFreezeDevice({
        rehydrated: false,
        error,
        timestamp: Date.now(),
    });
}
/**
 * Builds a successful DeviceProofVerificationResult.
 */
export function createSuccessProofVerificationResult(challengeId, deviceId, keyVersion) {
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
export function createFailureProofVerificationResult(challengeId, deviceId, keyVersion, failureCode, failureReason) {
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
export function createSuccessRevocationResult(revokedRecord, previousState) {
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
export function createSuccessRotationResult(updatedRecord, oldKeyVersion, newKeyVersion) {
    return deepFreezeDevice({
        rotated: true,
        deviceId: updatedRecord.deviceId,
        oldKeyVersion,
        newKeyVersion,
        updatedRecord,
        rotatedAt: Date.now(),
    });
}
