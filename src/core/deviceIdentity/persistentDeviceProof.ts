// src/core/deviceIdentity/persistentDeviceProof.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Challenge-response protocol, proof generation, and verification.
// Enforces proof-of-possession of private key material.
// Defends against cloned device IDs, stale challenges, and replayed proofs.

import type {
  DeviceChallenge,
  DeviceProof,
  DeviceProofVerificationResult,
  ScopedDeviceIdentity,
} from './persistentDeviceTypes.js';
import { PERSISTENT_DEVICE_PROTOCOL_VERSION } from './persistentDeviceTypes.js';
import { generateChallengeId, generateProofId } from './persistentDeviceIdentity.js';
import { computeDeviceDigest, deepFreezeDevice } from './persistentDeviceFingerprint.js';
import { createDeviceScope } from '../pairing/pairingScope.js';
import type { DeviceKeyStore } from './persistentDeviceKey.js';

export const DEFAULT_CHALLENGE_TTL_MS = 60_000; // 60 seconds

export interface CreateChallengeParams {
  readonly deviceId: string;
  readonly scope: ScopedDeviceIdentity;
  readonly keyVersion: number;
  readonly nonce?: string;
  readonly ttlMs?: number;
  readonly timestamp?: number;
}

/**
 * Issues an authoritative, ephemeral cryptographic challenge for a device.
 */
export function createDeviceChallenge(params: CreateChallengeParams): DeviceChallenge {
  const now = params.timestamp ?? Date.now();
  const ttl = params.ttlMs ?? DEFAULT_CHALLENGE_TTL_MS;
  const expiresAt = now + ttl;
  const scopeString = createDeviceScope(params.scope);

  // Deterministic nonce based on device, scope, keyVersion, and issue window
  const nonce = params.nonce ?? `nonce_${computeDeviceDigest({
    deviceId: params.deviceId,
    scopeString,
    keyVersion: params.keyVersion,
    issuedAt: now,
  })}`;

  const challengeId = generateChallengeId(params.deviceId, nonce);

  const challengeFingerprint = computeDeviceDigest({
    challengeId,
    deviceId: params.deviceId,
    scopeString,
    nonce,
    keyVersion: params.keyVersion,
    issuedAt: now,
    expiresAt,
    protocolVersion: PERSISTENT_DEVICE_PROTOCOL_VERSION,
  });

  const challenge: DeviceChallenge = {
    challengeId,
    deviceId: params.deviceId,
    scope: Object.freeze({ ...params.scope }),
    scopeString,
    nonce,
    keyVersion: params.keyVersion,
    issuedAt: now,
    expiresAt,
    protocolVersion: PERSISTENT_DEVICE_PROTOCOL_VERSION,
    challengeFingerprint,
  };

  return deepFreezeDevice(challenge);
}

export interface CreateProofParams {
  readonly challenge: DeviceChallenge;
  readonly keyStore: DeviceKeyStore;
  readonly keyId: string;
  readonly timestamp?: number;
}

/**
 * Creates a DeviceProof in response to a challenge by signing the challenge via the key store.
 */
export function createDeviceProof(params: CreateProofParams): DeviceProof {
  const now = params.timestamp ?? Date.now();
  const key = params.keyStore.getKey(params.keyId);
  if (!key) {
    throw new Error(`[DEVICE_KEY_INVALID] Key ${params.keyId} not found in keyStore`);
  }

  if (key.deviceId !== params.challenge.deviceId) {
    throw new Error(
      `[DEVICE_CLONE_DETECTED] Key deviceId (${key.deviceId}) does not match challenge deviceId (${params.challenge.deviceId})`
    );
  }

  // Payload binds challengeId, deviceId, nonce, scopeString, and keyVersion
  const payloadToSign = `${params.challenge.challengeId}::${params.challenge.deviceId}::${params.challenge.nonce}::${params.challenge.scopeString}::${key.keyVersion}`;
  const proofSignature = params.keyStore.signChallenge(params.keyId, payloadToSign);

  const proofId = generateProofId(params.challenge.challengeId, params.challenge.deviceId, params.challenge.nonce);
  const proofFingerprint = computeDeviceDigest({
    proofId,
    challengeId: params.challenge.challengeId,
    deviceId: params.challenge.deviceId,
    keyId: params.keyId,
    keyVersion: key.keyVersion,
    nonce: params.challenge.nonce,
    proofSignature,
  });

  const proof: DeviceProof = {
    proofId,
    challengeId: params.challenge.challengeId,
    deviceId: params.challenge.deviceId,
    keyId: params.keyId,
    keyVersion: key.keyVersion,
    nonce: params.challenge.nonce,
    proofSignature,
    proofFingerprint,
    createdAt: now,
  };

  return deepFreezeDevice(proof);
}

/**
 * Convenience helper to generate a DeviceProof directly from a challenge and key store.
 */
export function generateDeviceProof(
  challenge: DeviceChallenge,
  keyStore: DeviceKeyStore,
  keyId?: string,
  timestamp?: number
): DeviceProof {
  let resolvedKeyId = keyId;
  if (!resolvedKeyId) {
    const keyMeta = keyStore.getKeyForDevice(challenge.deviceId, challenge.keyVersion)
      ?? keyStore.getKeyForDevice(challenge.deviceId);
    if (!keyMeta) {
      throw new Error(`[DEVICE_KEY_INVALID] No key found for device ${challenge.deviceId} in keyStore`);
    }
    resolvedKeyId = keyMeta.keyId;
  }
  return createDeviceProof({
    challenge,
    keyStore,
    keyId: resolvedKeyId,
    timestamp,
  });
}

/**
 * Verifies a DeviceProof against an authoritative challenge and key store.
 * Strictly verifies challenge expiration, deviceId match, nonce match, and cryptographic signature.
 */
export function verifyDeviceProof(
  challenge: DeviceChallenge,
  proof: DeviceProof,
  keyStore: DeviceKeyStore,
  currentTime?: number
): DeviceProofVerificationResult {
  const now = currentTime ?? Date.now();

  // 1. Check expiration
  if (now > challenge.expiresAt) {
    return {
      valid: false,
      challengeId: challenge.challengeId,
      deviceId: challenge.deviceId,
      keyVersion: proof.keyVersion,
      failureCode: 'DEVICE_CHALLENGE_EXPIRED',
      failureReason: `Challenge ${challenge.challengeId} expired at ${challenge.expiresAt} (current: ${now})`,
      verifiedAt: now,
    };
  }

  // 2. Check challengeId and nonce consistency
  if (proof.challengeId !== challenge.challengeId) {
    return {
      valid: false,
      challengeId: challenge.challengeId,
      deviceId: challenge.deviceId,
      keyVersion: proof.keyVersion,
      failureCode: 'DEVICE_CHALLENGE_MISMATCH',
      failureReason: `Proof challengeId (${proof.challengeId}) does not match challenge (${challenge.challengeId})`,
      verifiedAt: now,
    };
  }

  if (proof.nonce !== challenge.nonce) {
    return {
      valid: false,
      challengeId: challenge.challengeId,
      deviceId: challenge.deviceId,
      keyVersion: proof.keyVersion,
      failureCode: 'DEVICE_PROOF_INVALID',
      failureReason: `Proof nonce does not match challenge nonce`,
      verifiedAt: now,
    };
  }

  // 3. Check device identity match (clone defense)
  if (proof.deviceId !== challenge.deviceId) {
    return {
      valid: false,
      challengeId: challenge.challengeId,
      deviceId: challenge.deviceId,
      keyVersion: proof.keyVersion,
      failureCode: 'DEVICE_CLONE_DETECTED',
      failureReason: `Proof deviceId (${proof.deviceId}) does not match challenge deviceId (${challenge.deviceId})`,
      verifiedAt: now,
    };
  }

  // 4. Check key version consistency
  if (proof.keyVersion !== challenge.keyVersion) {
    return {
      valid: false,
      challengeId: challenge.challengeId,
      deviceId: challenge.deviceId,
      keyVersion: proof.keyVersion,
      failureCode: 'DEVICE_KEY_INVALID',
      failureReason: `Proof keyVersion (${proof.keyVersion}) does not match challenge keyVersion (${challenge.keyVersion})`,
      verifiedAt: now,
    };
  }

  // 5. Verify cryptographic signature via keyStore
  const payloadToSign = `${challenge.challengeId}::${challenge.deviceId}::${challenge.nonce}::${challenge.scopeString}::${proof.keyVersion}`;
  const isSignatureValid = keyStore.verifySignature(proof.keyId, payloadToSign, proof.proofSignature);

  if (!isSignatureValid) {
    return {
      valid: false,
      challengeId: challenge.challengeId,
      deviceId: challenge.deviceId,
      keyVersion: proof.keyVersion,
      failureCode: 'DEVICE_PROOF_INVALID',
      failureReason: `Cryptographic proof signature verification failed for key ${proof.keyId}`,
      verifiedAt: now,
    };
  }

  return {
    valid: true,
    challengeId: challenge.challengeId,
    deviceId: challenge.deviceId,
    keyVersion: proof.keyVersion,
    verifiedAt: now,
  };
}
