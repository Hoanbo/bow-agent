/**
 * Deterministically canonicalizes any JavaScript data structure:
 * - Primitive values stringified canonically
 * - Arrays preserve element order, elements canonicalized recursively
 * - Objects have keys sorted lexicographically
 * - undefined, functions, and symbols normalized
 */
export declare function canonicalizePairingData(val: unknown): string;
/**
 * Computes deterministic FNV-1a 32-bit integer for a given string.
 */
export declare function fnv1a32(input: string): number;
export declare const fnv1a32Pairing: typeof fnv1a32;
/**
 * Computes 8-character zero-padded lowercase hexadecimal digest.
 */
export declare function computePairingDigest(data: unknown): string;
/**
 * Computes an order-independent capability fingerprint.
 * Two devices with identical capabilities in different array orders
 * MUST produce identical capability fingerprints.
 */
export declare function computeCapabilityFingerprint(capabilities: readonly string[]): string;
/**
 * Computes deterministic pairing fingerprint.
 */
export declare function computePairingFingerprint(data: unknown): string;
/**
 * Recursively deep freezes an object to enforce strict immutability.
 */
export declare function deepFreeze<T>(obj: T): T;
export declare const deepFreezePairing: typeof deepFreeze;
