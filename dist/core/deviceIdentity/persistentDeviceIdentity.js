// src/core/deviceIdentity/persistentDeviceIdentity.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Deterministic identity generators and format validators.
// Strictly avoids Math.random(), crypto.randomUUID(), or timestamps in primary identity.
import { computeDeviceDigest } from './persistentDeviceFingerprint.js';
/**
 * Deterministically generates canonical persistent device identity: `device_<fingerprint>`
 */
export function generatePersistentDeviceId(metadata) {
    const digest = computeDeviceDigest(metadata);
    return `device_${digest}`;
}
/**
 * Deterministically generates canonical device key identity: `key_<fingerprint>`
 */
export function generateKeyId(deviceId, keyVersion) {
    const digest = computeDeviceDigest({ deviceId, keyVersion });
    return `key_${digest}`;
}
/**
 * Deterministically generates canonical challenge identity: `chlng_<fingerprint>`
 */
export function generateChallengeId(deviceId, nonce) {
    const digest = computeDeviceDigest({ deviceId, nonce });
    return `chlng_${digest}`;
}
/**
 * Deterministically generates canonical device proof identity: `proof_<fingerprint>`
 */
export function generateProofId(challengeId, deviceId, nonce) {
    const digest = computeDeviceDigest({ challengeId, deviceId, nonce });
    return `proof_${digest}`;
}
/**
 * Deterministically generates canonical persistent trust record identity: `ptrust_<fingerprint>`
 */
export function generatePersistentTrustId(deviceId, pairingId) {
    const digest = computeDeviceDigest({ deviceId, pairingId });
    return `ptrust_${digest}`;
}
/**
 * Validates canonical persistent device identity format: `device_[0-9a-f]{8}`
 */
export function isValidPersistentDeviceId(id) {
    return typeof id === 'string' && /^device_[0-9a-f]{8}$/.test(id);
}
export const isValidDeviceId = isValidPersistentDeviceId;
/**
 * Validates canonical key identity format: `key_[0-9a-f]{8}`
 */
export function isValidKeyId(id) {
    return typeof id === 'string' && /^key_[0-9a-f]{8}$/.test(id);
}
/**
 * Validates canonical challenge identity format: `chlng_[0-9a-f]{8}`
 */
export function isValidChallengeId(id) {
    return typeof id === 'string' && /^chlng_[0-9a-f]{8}$/.test(id);
}
/**
 * Validates canonical proof identity format: `proof_[0-9a-f]{8}`
 */
export function isValidProofId(id) {
    return typeof id === 'string' && /^proof_[0-9a-f]{8}$/.test(id);
}
/**
 * Validates canonical persistent trust identity format: `ptrust_[0-9a-f]{8}`
 */
export function isValidPersistentTrustId(id) {
    return typeof id === 'string' && /^ptrust_[0-9a-f]{8}$/.test(id);
}
