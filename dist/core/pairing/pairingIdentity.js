// src/core/pairing/pairingIdentity.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Deterministic device identity generation.
// Strictly deterministic; zero randomness or timestamps in primary identity.
import { computePairingDigest } from './pairingFingerprint.js';
/**
 * Deterministically generates canonical device identity: `device_<fingerprint>`
 */
export function generateDeviceId(metadata) {
    const digest = computePairingDigest(metadata);
    return `device_${digest}`;
}
/**
 * Deterministically generates canonical pairing identity: `pair_<fingerprint>`
 */
export function generatePairingId(deviceId, scopeString, sequence) {
    const digest = computePairingDigest({ deviceId, scopeString, sequence });
    return `pair_${digest}`;
}
/**
 * Deterministically generates canonical trust record identity: `trust_<fingerprint>`
 */
export function generateTrustId(deviceId, scopeString) {
    const digest = computePairingDigest({ deviceId, scopeString });
    return `trust_${digest}`;
}
/**
 * Deterministically generates canonical audit record identity: `audit_<fingerprint>`
 */
export function generateAuditId(eventType, deviceId, timestamp, sequence) {
    const digest = computePairingDigest({ eventType, deviceId, timestamp, sequence });
    return `audit_${digest}`;
}
/**
 * Validates canonical device identity format: `device_[0-9a-f]{8}`
 */
export function isValidDeviceId(id) {
    return typeof id === 'string' && /^device_[0-9a-f]{8}$/.test(id);
}
/**
 * Validates canonical pairing identity format: `pair_[0-9a-f]{8}`
 */
export function isValidPairingId(id) {
    return typeof id === 'string' && /^pair_[0-9a-f]{8}$/.test(id);
}
/**
 * Validates canonical trust identity format: `trust_[0-9a-f]{8}`
 */
export function isValidTrustId(id) {
    return typeof id === 'string' && /^trust_[0-9a-f]{8}$/.test(id);
}
