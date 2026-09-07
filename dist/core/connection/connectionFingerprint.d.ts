/**
 * Deterministically canonicalizes any Javascript data structure:
 * - Primitive values stringified canonically
 * - Arrays preserve element order, elements canonicalized recursively
 * - Objects have keys sorted lexicographically
 * - undefined, functions, and symbols normalized
 */
export declare function canonicalize(val: unknown): string;
/**
 * Computes deterministic FNV-1a 32-bit integer for a given string
 */
export declare function fnv1a32(input: string): number;
/**
 * Computes 8-character zero-padded lowercase hexadecimal digest
 */
export declare function computeConnectionRuntimeFingerprint(data: unknown): string;
export declare const computeConnectionFingerprint: typeof computeConnectionRuntimeFingerprint;
