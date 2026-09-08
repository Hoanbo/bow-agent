/** All typed error codes the Internet Edge layer can emit. */
export type InternetEdgeErrorCode = 'INTERNET_TLS_HANDSHAKE_FAILED' | 'INTERNET_TLS_VERSION_REJECTED' | 'INTERNET_TLS_CIPHER_REJECTED' | 'INTERNET_TLS_DOWNGRADE_DETECTED' | 'INTERNET_CERT_EXPIRED' | 'INTERNET_CERT_REVOKED' | 'INTERNET_CERT_PIN_MISMATCH' | 'INTERNET_CERT_CHAIN_INVALID' | 'INTERNET_CERT_ALGORITHM_WEAK' | 'INTERNET_ILLEGAL_TRANSITION' | 'INTERNET_ADMISSION_REJECTED' | 'INTERNET_RELAY_BIND_FAILED' | 'INTERNET_ROAMING_FAILED' | 'INTERNET_RECONNECT_EXHAUSTED' | 'INTERNET_HEALTH_UNREACHABLE' | 'INTERNET_AUDIT_WRITE_FAILED' | 'INTERNET_TOKEN_EXPIRED' | 'INTERNET_PROTOCOL_VERSION_MISMATCH' | 'INTERNET_OVERLOAD_REJECTED' | 'INTERNET_INTERNAL_ERROR';
/**
 * Sanitizes an error message by scrubbing PEM blocks, API keys, tokens,
 * passwords, and bearer credentials.  Labels are preserved; values are
 * replaced with [REDACTED_SECRET].
 */
export declare function sanitizeInternetErrorMessage(raw: string): string;
/**
 * Typed error for all Internet Edge / TLS relay failures.
 * Guarantees that sensitive data cannot propagate through the error message.
 */
export declare class InternetEdgeError extends Error {
    readonly code: InternetEdgeErrorCode;
    readonly timestamp: number;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(code: InternetEdgeErrorCode, message: string, details?: Record<string, unknown>);
}
