import type { PersistentDeviceTrustRecord, DeviceRecognitionResult, DeviceRehydrationResult, DeviceProofVerificationResult, DeviceRevocationResult, DeviceKeyRotationResult, PersistentDeviceState, DeviceIdentityErrorCode } from './persistentDeviceTypes.js';
/**
 * Builds a successful DeviceRecognitionResult.
 * Session eligibility is ONLY true if recognized is true, record is valid and non-revoked.
 */
export declare function createSuccessRecognitionResult(record: PersistentDeviceTrustRecord, state?: PersistentDeviceState): DeviceRecognitionResult;
/**
 * Builds a failed DeviceRecognitionResult (fails closed).
 */
export declare function createFailureRecognitionResult(failureCode: DeviceIdentityErrorCode, failureReason: string, state?: PersistentDeviceState, record?: PersistentDeviceTrustRecord): DeviceRecognitionResult;
/**
 * Builds a successful DeviceRehydrationResult.
 */
export declare function createSuccessRehydrationResult(record: PersistentDeviceTrustRecord): DeviceRehydrationResult;
/**
 * Builds a failed DeviceRehydrationResult.
 */
export declare function createFailureRehydrationResult(error: string): DeviceRehydrationResult;
/**
 * Builds a successful DeviceProofVerificationResult.
 */
export declare function createSuccessProofVerificationResult(challengeId: string, deviceId: string, keyVersion: number): DeviceProofVerificationResult;
/**
 * Builds a failed DeviceProofVerificationResult.
 */
export declare function createFailureProofVerificationResult(challengeId: string, deviceId: string, keyVersion: number, failureCode: DeviceIdentityErrorCode, failureReason: string): DeviceProofVerificationResult;
/**
 * Builds a successful DeviceRevocationResult.
 */
export declare function createSuccessRevocationResult(revokedRecord: PersistentDeviceTrustRecord, previousState: PersistentDeviceState): DeviceRevocationResult;
/**
 * Builds a successful DeviceKeyRotationResult.
 */
export declare function createSuccessRotationResult(updatedRecord: PersistentDeviceTrustRecord, oldKeyVersion: number, newKeyVersion: number): DeviceKeyRotationResult;
