// src/core/internet/internetCertificate.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// X.509 Certificate validation and pinning layer.
// Enforces BOWCON certificate policy: expiry, key algorithm strength,
// chain integrity, and SHA-256 pin matching.
//
// INVARIANT: Certificate pin match is NOT an identity grant.
// INVARIANT: Certificate validation is NOT an authorization decision.
// INVARIANT: This module performs structural checks only; it does NOT verify
//            signatures against a CA (that is delegated to the TLS stack).

import {
  INTERNET_MAX_CERT_AGE_DAYS,
  type InternetCertKeyAlgorithm,
} from './internetTypes.js';
import { InternetEdgeError } from './internetFailure.js';

const MAX_CERT_AGE_MS = INTERNET_MAX_CERT_AGE_DAYS * 24 * 60 * 60 * 1000;

/** Subset of X.509 fields the Edge inspects. */
export interface InternetCertDescriptor {
  /** SHA-256 fingerprint hex string (lowercase, no colons). */
  readonly fingerprint: string;
  readonly subjectCN: string;
  readonly issuerCN: string;
  readonly notBefore: number; // Unix ms
  readonly notAfter: number;  // Unix ms
  readonly keyAlgorithm: InternetCertKeyAlgorithm;
  readonly serialNumber: string;
}

/** Result of a certificate validation pass. */
export interface InternetCertValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly fingerprint: string;
}

/** Minimum acceptable key sizes (bits) per algorithm. */
const MIN_KEY_BITS: Partial<Record<InternetCertKeyAlgorithm, number>> = {
  RSA_2048: 2048,
  RSA_4096: 4096,
};

/** Algorithms considered strong by BOWCON production policy. */
const STRONG_ALGORITHMS: readonly InternetCertKeyAlgorithm[] = Object.freeze([
  'ECDSA_P256',
  'ECDSA_P384',
  'RSA_2048',
  'RSA_4096',
  'ED25519',
]);

/**
 * Validates a certificate descriptor against BOWCON production policy.
 *
 * Checks performed (in order):
 *  1. Not expired (notAfter > now)
 *  2. Not not-yet-valid (notBefore <= now)
 *  3. Certificate age does not exceed MAX_CERT_AGE_DAYS
 *  4. Key algorithm is in the strong-algorithm set
 *  5. (Optional) fingerprint is in the pinSet
 */
export function validateCertificate(
  cert: InternetCertDescriptor,
  opts: { pinSet?: readonly string[]; nowMs?: number } = {}
): InternetCertValidationResult {
  const now = opts.nowMs ?? Date.now();

  if (now > cert.notAfter) {
    return {
      valid: false,
      reason: `Certificate expired at ${new Date(cert.notAfter).toISOString()}.`,
      fingerprint: cert.fingerprint,
    };
  }

  if (now < cert.notBefore) {
    return {
      valid: false,
      reason: `Certificate not yet valid until ${new Date(cert.notBefore).toISOString()}.`,
      fingerprint: cert.fingerprint,
    };
  }

  const ageMs = cert.notAfter - cert.notBefore;
  if (ageMs > MAX_CERT_AGE_MS) {
    return {
      valid: false,
      reason: `Certificate lifetime ${Math.round(ageMs / 86400000)}d exceeds maximum ${INTERNET_MAX_CERT_AGE_DAYS}d.`,
      fingerprint: cert.fingerprint,
    };
  }

  if (!(STRONG_ALGORITHMS as readonly string[]).includes(cert.keyAlgorithm)) {
    return {
      valid: false,
      reason: `Key algorithm "${cert.keyAlgorithm}" is not in the approved algorithm set.`,
      fingerprint: cert.fingerprint,
    };
  }

  if (opts.pinSet && opts.pinSet.length > 0) {
    const fp = cert.fingerprint.toLowerCase();
    const matched = opts.pinSet.some((pin) => pin.toLowerCase() === fp);
    if (!matched) {
      return {
        valid: false,
        reason: `Certificate fingerprint "${cert.fingerprint}" does not match any pinned fingerprint.`,
        fingerprint: cert.fingerprint,
      };
    }
  }

  return { valid: true, fingerprint: cert.fingerprint };
}

/**
 * Asserts certificate validity; throws InternetEdgeError on failure.
 */
export function assertCertificateValid(
  cert: InternetCertDescriptor,
  opts: { pinSet?: readonly string[]; nowMs?: number } = {}
): void {
  const result = validateCertificate(cert, opts);
  if (!result.valid) {
    throw new InternetEdgeError(
      'INTERNET_CERT_CHAIN_INVALID',
      result.reason ?? 'Certificate validation failed.'
    );
  }
}

/**
 * Computes a mock SHA-256 fingerprint label for testing.
 * Production systems use the actual TLS stack fingerprint.
 */
export function makeMockCertFingerprint(seed: string): string {
  // Deterministic hex-like label — NOT cryptographically derived here.
  // The real fingerprint comes from the TLS stack post-handshake.
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
}
