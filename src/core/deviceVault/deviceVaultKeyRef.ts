// src/core/deviceVault/deviceVaultKeyRef.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Opaque private key reference abstraction (ref://vault/<vaultId>/<entryId>).
// Invariant: MUST NOT expose or store raw private key bytes.

export const PRIVATE_KEY_REF_REGEX = /^ref:\/\/vault\/(vault_[0-9a-zA-Z_-]+)\/(entry_[0-9a-zA-Z_-]+)$/;

const FORBIDDEN_KEY_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /-----BEGIN ENCRYPTED PRIVATE KEY-----/i,
  /"kty"\s*:\s*"OKP"/i,
  /"kty"\s*:\s*"RSA"/i,
  /"d"\s*:\s*"[A-Za-z0-9_-]{20,}"/,
];

const FORBIDDEN_KEY_FIELD_NAMES = new Set([
  'privatekey',
  'privatekeybytes',
  'privatekeypem',
  'privatekeybase64',
  'privatekeyder',
  'privatekeyjwk',
]);

/**
 * Formats an opaque privateKeyRef string: ref://vault/<vaultId>/<entryId>
 */
export function formatPrivateKeyRef(vaultId: string, entryId: string): string {
  return `ref://vault/${vaultId}/${entryId}`;
}

/**
 * Parses an opaque privateKeyRef string.
 */
export function parsePrivateKeyRef(ref: string): { vaultId: string; entryId: string } | null {
  const match = PRIVATE_KEY_REF_REGEX.exec(ref);
  if (!match) {
    return null;
  }
  return {
    vaultId: match[1],
    entryId: match[2],
  };
}

/**
 * Validates whether a value is a well-formed opaque privateKeyRef.
 */
export function isValidPrivateKeyRef(ref: unknown): ref is string {
  return typeof ref === 'string' && PRIVATE_KEY_REF_REGEX.test(ref);
}

/**
 * Asserts that a value is a valid opaque privateKeyRef.
 */
export function assertValidPrivateKeyRef(ref: unknown): void {
  if (!isValidPrivateKeyRef(ref)) {
    throw new Error(`[VAULT_KEY_REVOKED] Invalid or malformed privateKeyRef: ${String(ref)}`);
  }
}

/**
 * Deeply scans an arbitrary object or string for accidental raw private key material.
 */
export function containsRawPrivateKey(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    for (const pattern of FORBIDDEN_KEY_PATTERNS) {
      if (pattern.test(value)) {
        return true;
      }
    }
    return false;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (containsRawPrivateKey(item)) {
          return true;
        }
      }
      return false;
    }

    const record = value as Record<string, unknown>;

    // Detect JWK private key format ({ kty: ..., d: ... })
    if ('d' in record && 'kty' in record) {
      return true;
    }

    try {
      const jsonStr = JSON.stringify(record);
      for (const pattern of FORBIDDEN_KEY_PATTERNS) {
        if (pattern.test(jsonStr)) {
          return true;
        }
      }
    } catch {
      // Ignore serialization failures for circular objects
    }

    for (const key of Object.keys(record)) {
      if (FORBIDDEN_KEY_FIELD_NAMES.has(key.toLowerCase())) {
        return true;
      }
      if (containsRawPrivateKey(record[key])) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Asserts that an object does NOT contain raw private key material.
 * Fails closed immediately if raw private key exposure is detected.
 */
export function assertNoRawPrivateKey(value: unknown, context: string = 'Vault'): void {
  if (containsRawPrivateKey(value)) {
    throw new Error(
      `[VAULT_SECRET_LEAKAGE_PREVENTED] Raw private key material detected in ${context}. Exposure strictly prohibited.`
    );
  }
}
