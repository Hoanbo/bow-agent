/**
 * Deterministically canonicalizes any JavaScript data structure:
 * - Primitive values stringified canonically
 * - Arrays preserve element order, elements canonicalized recursively
 * - Objects have keys sorted lexicographically
 * - undefined, functions, and symbols normalized
 */
export declare function canonicalizePersistentData(val: unknown): string;
/**
 * Computes deterministic FNV-1a 32-bit integer for a given string.
 */
export declare function fnv1a32Device(input: string): number;
/**
 * Computes 8-character zero-padded lowercase hexadecimal digest.
 */
export declare function computeDeviceDigest(data: unknown): string;
/**
 * Computes deterministic device fingerprint.
 */
export declare function computeDeviceFingerprint(data: unknown): string;
/**
 * Computes an order-independent capability fingerprint.
 */
export declare function computeDeviceCapabilityFingerprint(capabilities: readonly string[]): string;
/**
 * Recursively deep freezes an object to enforce strict immutability.
 */
export declare function deepFreezeDevice<T>(obj: T): T;
