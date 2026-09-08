// src/core/internet/internetTls.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// TLS session governance layer.
// Enforces minimum TLS version, AEAD cipher whitelist, and mTLS requirements.
// Never negotiates security parameters — it validates them after the handshake.
import { INTERNET_MIN_TLS_VERSION, INTERNET_HANDSHAKE_TIMEOUT_MS, } from './internetTypes.js';
import { InternetEdgeError } from './internetFailure.js';
/** Whitelist of AEAD ciphers accepted by the Internet Edge. Ordered by preference. */
export const INTERNET_ALLOWED_CIPHER_SUITES = Object.freeze([
    'TLS_AES_256_GCM_SHA384',
    'TLS_AES_128_GCM_SHA256',
    'TLS_CHACHA20_POLY1305_SHA256',
]);
/** TLS versions that are explicitly rejected (security downgrade prevention). */
export const INTERNET_REJECTED_TLS_VERSIONS = Object.freeze([
    'TLSv1.0',
    'TLSv1.1',
    'TLSv1.2', // allowed only in TEST_STUB mode; production rejects
    'SSLv3',
    'SSLv2',
]);
/**
 * Validates a completed TLS handshake against BOWCON production policy.
 *
 * INVARIANT: Any negotiated version below TLSv1.3 in production → REJECT.
 * INVARIANT: Any cipher not in the AEAD whitelist → REJECT.
 * INVARIANT: mTLS required if params.isMtls is false → REJECT (if requireMtls=true).
 */
export function validateTlsSession(params, opts = {}) {
    const { requireMtls = true, allowTls12 = false } = opts;
    // Version check
    const ver = params.negotiatedVersion;
    const isAcceptedVersion = ver === 'TLSv1.3' || (allowTls12 && ver === 'TLSv1.2');
    if (!isAcceptedVersion) {
        return {
            result: 'TLS_REJECTED_VERSION',
            reason: `Negotiated TLS version "${ver}" is below minimum "${INTERNET_MIN_TLS_VERSION}" or explicitly forbidden. Downgrade rejected fail-closed.`,
        };
    }
    // Cipher whitelist
    const cipher = params.negotiatedCipher;
    if (!INTERNET_ALLOWED_CIPHER_SUITES.includes(params.negotiatedCipher)) {
        return {
            result: 'TLS_REJECTED_CIPHER',
            reason: `Cipher suite "${params.negotiatedCipher}" is not in the AEAD whitelist.`,
        };
    }
    // mTLS enforcement
    if (requireMtls && !params.isMtls) {
        return {
            result: 'TLS_REJECTED_CERT',
            reason: 'mTLS is required; client did not present a certificate.',
        };
    }
    return {
        result: 'TLS_ACCEPTED',
        acceptedVersion: ver,
        acceptedCipher: cipher,
    };
}
/**
 * Enforces TLS handshake timeout.
 * Returns a rejected promise with InternetEdgeError if the promise does not
 * resolve within INTERNET_HANDSHAKE_TIMEOUT_MS.
 */
export async function withTlsHandshakeTimeout(work, overrideMs) {
    const timeout = overrideMs ?? INTERNET_HANDSHAKE_TIMEOUT_MS;
    let timer;
    const race = await Promise.race([
        work.then((v) => ({ ok: true, value: v })),
        new Promise((resolve) => {
            timer = setTimeout(() => resolve({ ok: false }), timeout);
        }),
    ]);
    if (timer !== undefined)
        clearTimeout(timer);
    if (!race.ok) {
        throw new InternetEdgeError('INTERNET_TLS_HANDSHAKE_FAILED', `TLS handshake timed out after ${timeout}ms.`);
    }
    return race.value;
}
/**
 * Detects a TLS downgrade attempt by comparing the offered version
 * to the previously negotiated session version.
 * INVARIANT: Returns true (downgrade detected) if offered < previous.
 */
export function detectTlsDowngrade(previousVersion, offeredVersion) {
    const rank = {
        SSLv2: 0, SSLv3: 1, 'TLSv1.0': 2, 'TLSv1.1': 3, 'TLSv1.2': 4, 'TLSv1.3': 5,
    };
    const prev = rank[previousVersion] ?? 5;
    const offered = rank[offeredVersion] ?? 0;
    return offered < prev;
}
