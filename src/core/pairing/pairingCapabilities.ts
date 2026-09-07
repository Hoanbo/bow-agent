// src/core/pairing/pairingCapabilities.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Device capability boundary enforcement and order-independent fingerprinting.
// Strictly prevents cognitive or execution authority escalation.

import {
  SAFE_DEVICE_CAPABILITIES,
  PAIRING_FORBIDDEN_CAPABILITIES,
  type SafeDeviceCapability,
} from './pairingTypes.js';
import { computeCapabilityFingerprint } from './pairingFingerprint.js';

/**
 * Checks if any of the provided capabilities match forbidden cognitive/execution escalation.
 */
export function hasForbiddenCapability(capabilities: readonly string[]): boolean {
  return capabilities.some((cap) =>
    PAIRING_FORBIDDEN_CAPABILITIES.includes(cap) ||
    cap.startsWith('EXECUTE_') ||
    cap.startsWith('MUTATE_') ||
    cap.startsWith('BYPASS_')
  );
}


/**
 * Validates a capability list.
 * Fails closed with [PAIRING_CAPABILITY_REJECTED] if any forbidden or unknown capability is requested.
 */
export function validatePairingCapabilities(
  capabilities: readonly string[]
): readonly SafeDeviceCapability[] {
  if (!Array.isArray(capabilities)) {
    throw new Error('[PAIRING_CAPABILITY_REJECTED] Capabilities must be an array');
  }

  for (const cap of capabilities) {
    if (typeof cap !== 'string' || cap.trim().length === 0) {
      throw new Error('[PAIRING_CAPABILITY_REJECTED] Capability must be a non-empty string');
    }
    if (hasForbiddenCapability([cap])) {
      throw new Error(
        `[PAIRING_CAPABILITY_REJECTED] Forbidden cognitive/execution capability requested: ${cap}`
      );
    }
    if (!SAFE_DEVICE_CAPABILITIES.includes(cap as SafeDeviceCapability)) {
      throw new Error(
        `[PAIRING_CAPABILITY_REJECTED] Unknown or unpermitted device capability: ${cap}`
      );
    }
  }

  // Deduplicate and return as typed array
  const unique = Array.from(new Set(capabilities)) as SafeDeviceCapability[];
  return Object.freeze(unique);
}

/**
 * Filters only safe device capabilities from an arbitrary list, silently dropping unpermitted ones.
 */
export function filterSafeCapabilities(
  capabilities: readonly string[]
): readonly SafeDeviceCapability[] {
  if (!Array.isArray(capabilities)) {
    return Object.freeze([]);
  }
  const filtered = capabilities.filter(
    (cap): cap is SafeDeviceCapability =>
      typeof cap === 'string' &&
      !hasForbiddenCapability([cap]) &&
      SAFE_DEVICE_CAPABILITIES.includes(cap as SafeDeviceCapability)
  );
  return Object.freeze(Array.from(new Set(filtered)));
}

/**
 * Computes canonical order-independent capability fingerprint.
 * [ 'RECEIVE_EVENTS', 'REQUEST_SCREEN_CAPTURE' ] and
 * [ 'REQUEST_SCREEN_CAPTURE', 'RECEIVE_EVENTS' ] produce identical digests.
 */
export function computeCanonicalCapabilityFingerprint(
  capabilities: readonly SafeDeviceCapability[]
): string {
  return computeCapabilityFingerprint(capabilities);
}
