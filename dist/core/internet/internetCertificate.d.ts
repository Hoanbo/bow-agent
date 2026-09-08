import { type InternetCertKeyAlgorithm } from './internetTypes.js';
/** Subset of X.509 fields the Edge inspects. */
export interface InternetCertDescriptor {
    /** SHA-256 fingerprint hex string (lowercase, no colons). */
    readonly fingerprint: string;
    readonly subjectCN: string;
    readonly issuerCN: string;
    readonly notBefore: number;
    readonly notAfter: number;
    readonly keyAlgorithm: InternetCertKeyAlgorithm;
    readonly serialNumber: string;
}
/** Result of a certificate validation pass. */
export interface InternetCertValidationResult {
    readonly valid: boolean;
    readonly reason?: string;
    readonly fingerprint: string;
}
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
export declare function validateCertificate(cert: InternetCertDescriptor, opts?: {
    pinSet?: readonly string[];
    nowMs?: number;
}): InternetCertValidationResult;
/**
 * Asserts certificate validity; throws InternetEdgeError on failure.
 */
export declare function assertCertificateValid(cert: InternetCertDescriptor, opts?: {
    pinSet?: readonly string[];
    nowMs?: number;
}): void;
/**
 * Computes a mock SHA-256 fingerprint label for testing.
 * Production systems use the actual TLS stack fingerprint.
 */
export declare function makeMockCertFingerprint(seed: string): string;
