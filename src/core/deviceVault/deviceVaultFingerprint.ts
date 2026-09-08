// src/core/deviceVault/deviceVaultFingerprint.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Deterministic 32-bit FNV-1a hex digest algorithm and deep freezing.

const FNV_PRIME_32 = 16777619;
const FNV_OFFSET_32 = 2166136261;

/**
 * Computes 32-bit FNV-1a hash of a UTF-8 string.
 */
export function fnv1a32Vault(input: string): number {
  let hash = FNV_OFFSET_32;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME_32) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Recursively serializes arbitrary objects with key-order independence.
 */
function canonicalVaultStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalVaultStringify(item));
    return `[${items.join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).filter((key) => obj[key] !== undefined).sort();
  const pairs = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalVaultStringify(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Computes a deterministic 8-character hex digest of any serializable object.
 */
export function computeVaultDigest(data: unknown): string {
  const canonical = canonicalVaultStringify(data);
  const hash = fnv1a32Vault(canonical);
  return hash.toString(16).padStart(8, '0');
}

/**
 * Deep freezes an object and all nested properties recursively.
 */
export function deepFreezeVault<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepFreezeVault(item);
    }
    return Object.freeze(obj) as unknown as Readonly<T>;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    const val = record[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreezeVault(val);
    }
  }

  return Object.freeze(obj) as Readonly<T>;
}
