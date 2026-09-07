// src/core/pairing/pairingFingerprint.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Deterministic 32-bit FNV-1a hex digest algorithm.
// Guarantees zero entropy leakage, zero timestamps, and zero randomness in primary identity.

const FNV_PRIME = 0x01000193;
const FNV_OFFSET_BASIS = 0x811c9dc5;

/**
 * Deterministically canonicalizes any JavaScript data structure:
 * - Primitive values stringified canonically
 * - Arrays preserve element order, elements canonicalized recursively
 * - Objects have keys sorted lexicographically
 * - undefined, functions, and symbols normalized
 */
export function canonicalizePairingData(val: unknown): string {
  if (val === null || val === undefined) {
    return 'null';
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return JSON.stringify(val);
  }
  if (typeof val === 'string') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map((item) => canonicalizePairingData(item)).join(',') + ']';
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    return (
      '{' +
      sortedKeys
        .map((k) => `${JSON.stringify(k)}:${canonicalizePairingData(obj[k])}`)
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(String(val));
}

/**
 * Computes deterministic FNV-1a 32-bit integer for a given string.
 */
export function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

export const fnv1a32Pairing = fnv1a32;

/**
 * Computes 8-character zero-padded lowercase hexadecimal digest.
 */
export function computePairingDigest(data: unknown): string {
  const canonical = canonicalizePairingData(data);
  const hash = fnv1a32(canonical);
  return hash.toString(16).padStart(8, '0');
}

/**
 * Computes an order-independent capability fingerprint.
 * Two devices with identical capabilities in different array orders
 * MUST produce identical capability fingerprints.
 */
export function computeCapabilityFingerprint(capabilities: readonly string[]): string {
  const uniqueSorted = Array.from(new Set(capabilities)).sort();
  return computePairingDigest({ capabilities: uniqueSorted });
}

/**
 * Computes deterministic pairing fingerprint.
 */
export function computePairingFingerprint(data: unknown): string {
  return computePairingDigest(data);
}

/**
 * Recursively deep freezes an object to enforce strict immutability.
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && (typeof val === 'object' || typeof val === 'function') && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

export const deepFreezePairing = deepFreeze;

