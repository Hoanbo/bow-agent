import { type InternetTlsVersion, type InternetCipherSuite, type InternetTlsHandshakeResult } from './internetTypes.js';
/** Whitelist of AEAD ciphers accepted by the Internet Edge. Ordered by preference. */
export declare const INTERNET_ALLOWED_CIPHER_SUITES: readonly InternetCipherSuite[];
/** TLS versions that are explicitly rejected (security downgrade prevention). */
export declare const INTERNET_REJECTED_TLS_VERSIONS: readonly string[];
export interface TlsSessionParameters {
    readonly negotiatedVersion: string;
    readonly negotiatedCipher: string;
    readonly isMtls: boolean;
    readonly durationMs: number;
}
export interface TlsValidationResult {
    readonly result: InternetTlsHandshakeResult;
    readonly reason?: string;
    readonly acceptedVersion?: InternetTlsVersion;
    readonly acceptedCipher?: InternetCipherSuite;
}
/**
 * Validates a completed TLS handshake against BOWCON production policy.
 *
 * INVARIANT: Any negotiated version below TLSv1.3 in production → REJECT.
 * INVARIANT: Any cipher not in the AEAD whitelist → REJECT.
 * INVARIANT: mTLS required if params.isMtls is false → REJECT (if requireMtls=true).
 */
export declare function validateTlsSession(params: TlsSessionParameters, opts?: {
    requireMtls?: boolean;
    allowTls12?: boolean;
}): TlsValidationResult;
/**
 * Enforces TLS handshake timeout.
 * Returns a rejected promise with InternetEdgeError if the promise does not
 * resolve within INTERNET_HANDSHAKE_TIMEOUT_MS.
 */
export declare function withTlsHandshakeTimeout<T>(work: Promise<T>, overrideMs?: number): Promise<T>;
/**
 * Detects a TLS downgrade attempt by comparing the offered version
 * to the previously negotiated session version.
 * INVARIANT: Returns true (downgrade detected) if offered < previous.
 */
export declare function detectTlsDowngrade(previousVersion: InternetTlsVersion, offeredVersion: string): boolean;
