export declare const PRIVATE_KEY_REF_REGEX: RegExp;
/**
 * Formats an opaque privateKeyRef string: ref://vault/<vaultId>/<entryId>
 */
export declare function formatPrivateKeyRef(vaultId: string, entryId: string): string;
/**
 * Parses an opaque privateKeyRef string.
 */
export declare function parsePrivateKeyRef(ref: string): {
    vaultId: string;
    entryId: string;
} | null;
/**
 * Validates whether a value is a well-formed opaque privateKeyRef.
 */
export declare function isValidPrivateKeyRef(ref: unknown): ref is string;
/**
 * Asserts that a value is a valid opaque privateKeyRef.
 */
export declare function assertValidPrivateKeyRef(ref: unknown): void;
/**
 * Deeply scans an arbitrary object or string for accidental raw private key material.
 */
export declare function containsRawPrivateKey(value: unknown): boolean;
/**
 * Asserts that an object does NOT contain raw private key material.
 * Fails closed immediately if raw private key exposure is detected.
 */
export declare function assertNoRawPrivateKey(value: unknown, context?: string): void;
