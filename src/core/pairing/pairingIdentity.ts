// src/core/pairing/pairingIdentity.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Deterministic device identity generation.
// Strictly deterministic; zero randomness or timestamps in primary identity.

import { computePairingDigest } from './pairingFingerprint.js';
import type { DeviceType } from './pairingTypes.js';

export interface DeviceMetadataInput {
  readonly deviceType: DeviceType;
  readonly surfaceId: string;
  readonly hardwareModel?: string;
  readonly clientPlatform?: string;
  readonly clientAppVersion?: string;
  readonly publicKeyHint?: string;
}

/**
 * Deterministically generates canonical device identity: `device_<fingerprint>`
 */
export function generateDeviceId(metadata: DeviceMetadataInput): string {
  const digest = computePairingDigest(metadata);
  return `device_${digest}`;
}

/**
 * Deterministically generates canonical pairing identity: `pair_<fingerprint>`
 */
export function generatePairingId(deviceId: string, scopeString: string, sequence: number): string {
  const digest = computePairingDigest({ deviceId, scopeString, sequence });
  return `pair_${digest}`;
}

/**
 * Deterministically generates canonical trust record identity: `trust_<fingerprint>`
 */
export function generateTrustId(deviceId: string, scopeString: string): string {
  const digest = computePairingDigest({ deviceId, scopeString });
  return `trust_${digest}`;
}

/**
 * Deterministically generates canonical audit record identity: `audit_<fingerprint>`
 */
export function generateAuditId(
  eventType: string,
  deviceId: string,
  timestamp: number,
  sequence: number
): string {
  const digest = computePairingDigest({ eventType, deviceId, timestamp, sequence });
  return `audit_${digest}`;
}

/**
 * Validates canonical device identity format: `device_[0-9a-f]{8}`
 */
export function isValidDeviceId(id: unknown): id is string {
  return typeof id === 'string' && /^device_[0-9a-f]{8}$/.test(id);
}

/**
 * Validates canonical pairing identity format: `pair_[0-9a-f]{8}`
 */
export function isValidPairingId(id: unknown): id is string {
  return typeof id === 'string' && /^pair_[0-9a-f]{8}$/.test(id);
}

/**
 * Validates canonical trust identity format: `trust_[0-9a-f]{8}`
 */
export function isValidTrustId(id: unknown): id is string {
  return typeof id === 'string' && /^trust_[0-9a-f]{8}$/.test(id);
}
