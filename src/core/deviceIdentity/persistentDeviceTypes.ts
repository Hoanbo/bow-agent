// src/core/deviceIdentity/persistentDeviceTypes.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative contracts for persistent device identity, key abstractions,
// challenge-response proofs, rehydration, and passwordless recognition.
//
// STRICT INVARIANTS:
// - DEVICE_IDENTITY != DEVICE_AUTHENTICATION
// - DEVICE_AUTHENTICATION != AUTHORIZATION
// - AUTHORIZATION != EXECUTION
// - DEVICE_RECOGNITION != EXECUTION_AUTHORITY
// - DEVICE_TRUST != BRAIN_AUTHORITY
// - DEVICE_ID != SESSION_ID
// - PAIRING_ID != SESSION_ID
// - TRUST_ID != SESSION_ID
// - PERSISTENCE != BRAIN_MEMORY
// - REHYDRATION != AUTHORIZATION
// - RECOGNITION != TOOL_EXECUTION
// - REVOCATION == FAIL_CLOSED
// - CLONED_DEVICE_ID != VALID_DEVICE_PROOF
// - OLD_PROOF != NEW_CHALLENGE_PROOF
// - OLD_KEY_VERSION != CURRENT_KEY_VERSION
// - ONE_USER != ONE_DEVICE
// - ONE_DEVICE != ONE_SESSION

import type { DeviceType, DeviceTrustLevel, SafeDeviceCapability, ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
export type { DeviceType, DeviceTrustLevel, SafeDeviceCapability, ScopedDeviceIdentity };

export const PERSISTENT_DEVICE_PROTOCOL_VERSION = '4.0.0';

/**
 * 16 Canonical Persistent Device States representing the full passwordless recognition lifecycle.
 */
export type PersistentDeviceState =
  | 'UNSEEN'
  | 'IDENTITY_PRESENT'
  | 'PAIRING_REQUIRED'
  | 'PAIRING_PENDING'
  | 'PAIRED'
  | 'TRUST_PENDING'
  | 'TRUSTED'
  | 'RECOGNITION_CHALLENGE'
  | 'PROOF_RECEIVED'
  | 'PROOF_VERIFIED'
  | 'RECOGNIZED'
  | 'SESSION_ELIGIBLE'
  | 'REVOKED'
  | 'ROTATION_REQUIRED'
  | 'EXPIRED'
  | 'FAILED';

export const ALL_PERSISTENT_DEVICE_STATES: readonly PersistentDeviceState[] = Object.freeze([
  'UNSEEN',
  'IDENTITY_PRESENT',
  'PAIRING_REQUIRED',
  'PAIRING_PENDING',
  'PAIRED',
  'TRUST_PENDING',
  'TRUSTED',
  'RECOGNITION_CHALLENGE',
  'PROOF_RECEIVED',
  'PROOF_VERIFIED',
  'RECOGNIZED',
  'SESSION_ELIGIBLE',
  'REVOKED',
  'ROTATION_REQUIRED',
  'EXPIRED',
  'FAILED',
]);

/**
 * Lifecycle state of cryptographic key material associated with a persistent device.
 */
export type DeviceKeyState =
  | 'ACTIVE'
  | 'ROTATION_REQUIRED'
  | 'ROTATED'
  | 'REVOKED'
  | 'EXPIRED';

export const ALL_DEVICE_KEY_STATES: readonly DeviceKeyState[] = Object.freeze([
  'ACTIVE',
  'ROTATION_REQUIRED',
  'ROTATED',
  'REVOKED',
  'EXPIRED',
]);

/**
 * Cryptographic device key material metadata.
 * STRICT INVARIANT: Contains ONLY public keys and opaque references.
 * Raw private key material is NEVER stored, serialized, or held in this model.
 */
export interface DeviceKeyMetadata {
  readonly keyId: string;
  readonly deviceId: string;
  readonly publicKey: string;
  readonly privateKeyRef: string; // e.g. "ref://keystore/device_key_01" (never raw bytes)
  readonly keyAlgorithm: string;   // e.g. "ED25519_REF" or "ECDSA_P256_REF"
  readonly keyVersion: number;
  readonly keyState: DeviceKeyState;
  readonly createdAt: number;
  readonly rotatedAt?: number;
  readonly revokedAt?: number;
}

/**
 * Ephemeral challenge issued by the Brain to verify possession of private key material.
 */
export interface DeviceChallenge {
  readonly challengeId: string;
  readonly deviceId: string;
  readonly scope: ScopedDeviceIdentity;
  readonly scopeString: string;
  readonly nonce: string;
  readonly keyVersion: number;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly protocolVersion: string;
  readonly challengeFingerprint: string;
}

/**
 * Cryptographic proof of possession presented by a device in response to a challenge.
 */
export interface DeviceProof {
  readonly proofId: string;
  readonly challengeId: string;
  readonly deviceId: string;
  readonly keyId: string;
  readonly keyVersion: number;
  readonly nonce: string;
  readonly proofSignature: string; // Deterministic proof string computed via privateKeyRef
  readonly proofFingerprint: string;
  readonly createdAt: number;
}

/**
 * Policy governing passwordless recognition eligibility and proofs.
 */
export interface DeviceRecognitionPolicy {
  readonly maxAgeMs: number;
  readonly requireProofOfPossession: boolean;
  readonly maxClockSkewMs: number;
}

/**
 * Authoritative immutable persistent device trust record.
 * Stored logically in the persistent device store; rehydrated on subsequent connections.
 */
export interface PersistentDeviceTrustRecord {
  readonly deviceId: string;
  readonly userId: string;
  readonly brainId: string;
  readonly surfaceId: string;
  readonly pairingId: string;
  readonly trustId: string;
  readonly deviceType: DeviceType;
  readonly scope: ScopedDeviceIdentity;
  readonly scopeString: string;
  readonly publicKeyId: string;
  readonly keyVersion: number;
  readonly trustLevel: DeviceTrustLevel;
  readonly lifecycleState: PersistentDeviceState;
  readonly capabilityEnvelope: readonly SafeDeviceCapability[];
  readonly protocolVersion: string;
  readonly identityVersion: string;
  readonly recognitionPolicy: DeviceRecognitionPolicy;
  readonly revoked: boolean;
  readonly revocationReason?: string;
  readonly revokedAt?: number;
  readonly rotationRequired: boolean;
  readonly deterministicFingerprint: string;
  readonly enrolledAt: number;
  readonly updatedAt: number;
  readonly expiresAt?: number;
}

/**
 * Result of a passwordless device recognition attempt.
 */
export interface DeviceRecognitionResult {
  readonly recognized: boolean;
  readonly state: PersistentDeviceState;
  readonly record?: PersistentDeviceTrustRecord;
  readonly sessionEligible: boolean;
  readonly failureCode?: string;
  readonly failureReason?: string;
  readonly timestamp: number;
}

/**
 * Result of rehydrating a persistent device record from storage.
 */
export interface DeviceRehydrationResult {
  readonly rehydrated: boolean;
  readonly record?: PersistentDeviceTrustRecord;
  readonly error?: string;
  readonly timestamp: number;
}

/**
 * Result of verifying a cryptographic device proof.
 */
export interface DeviceProofVerificationResult {
  readonly valid: boolean;
  readonly challengeId: string;
  readonly deviceId: string;
  readonly keyVersion: number;
  readonly failureCode?: DeviceIdentityErrorCode;
  readonly failureReason?: string;
  readonly verifiedAt: number;
}

/**
 * Result of authoritative device revocation.
 */
export interface DeviceRevocationResult {
  readonly revoked: boolean;
  readonly deviceId: string;
  readonly revokedRecord: PersistentDeviceTrustRecord;
  readonly previousState: PersistentDeviceState;
  readonly revokedAt: number;
}

/**
 * Result of a key rotation lifecycle event.
 */
export interface DeviceKeyRotationResult {
  readonly rotated: boolean;
  readonly deviceId: string;
  readonly oldKeyVersion: number;
  readonly newKeyVersion: number;
  readonly updatedRecord: PersistentDeviceTrustRecord;
  readonly rotatedAt: number;
}

/**
 * 17 Authoritative Persistent Device Audit Event Types.
 */
export type PersistentDeviceAuditEventType =
  | 'DEVICE_IDENTITY_CREATED'
  | 'DEVICE_PERSISTED'
  | 'DEVICE_REHYDRATED'
  | 'DEVICE_LOOKUP'
  | 'TRUST_LOOKUP'
  | 'RECOGNITION_CHALLENGE_CREATED'
  | 'DEVICE_PROOF_RECEIVED'
  | 'DEVICE_PROOF_VERIFIED'
  | 'DEVICE_RECOGNIZED'
  | 'DEVICE_RECOGNITION_FAILED'
  | 'DEVICE_REVOKED'
  | 'DEVICE_KEY_ROTATION_REQUIRED'
  | 'DEVICE_KEY_ROTATED'
  | 'DEVICE_SCOPE_MISMATCH'
  | 'DEVICE_PROOF_REPLAY'
  | 'DEVICE_PROOF_INVALID'
  | 'DEVICE_TRUST_EXPIRED';

/**
 * Immutable audit entry for persistent device identity operations.
 */
export interface PersistentDeviceAuditRecord {
  readonly auditId: string;
  readonly eventType: PersistentDeviceAuditEventType;
  readonly deviceId: string;
  readonly scopeString: string;
  readonly keyVersion?: number;
  readonly state?: PersistentDeviceState;
  readonly details: Readonly<Record<string, unknown>>;
  readonly auditFingerprint: string;
  readonly timestamp: number;
}

/**
 * 18 Authoritative Error Codes for Persistent Device Identity and Recognition.
 */
export type DeviceIdentityErrorCode =
  | 'DEVICE_INVALID_REQUEST'
  | 'DEVICE_IDENTITY_MISMATCH'
  | 'DEVICE_SCOPE_MISMATCH'
  | 'DEVICE_KEY_INVALID'
  | 'DEVICE_KEY_ROTATION_REQUIRED'
  | 'DEVICE_KEY_EXPIRED'
  | 'DEVICE_KEY_REVOKED'
  | 'DEVICE_CHALLENGE_EXPIRED'
  | 'DEVICE_CHALLENGE_MISMATCH'
  | 'DEVICE_PROOF_INVALID'
  | 'DEVICE_PROOF_REPLAY'
  | 'DEVICE_PROOF_EXPIRED'
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_NOT_TRUSTED'
  | 'DEVICE_REVOKED'
  | 'DEVICE_CLONE_DETECTED'
  | 'DEVICE_REHYDRATION_FAILED'
  | 'DEVICE_INVALID_TRANSITION';
