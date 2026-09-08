/**
 * Computes 32-bit FNV-1a hash of a UTF-8 string.
 */
export declare function fnv1a32Vault(input: string): number;
/**
 * Computes a deterministic 8-character hex digest of any serializable object.
 */
export declare function computeVaultDigest(data: unknown): string;
/**
 * Deep freezes an object and all nested properties recursively.
 */
export declare function deepFreezeVault<T>(obj: T): Readonly<T>;
