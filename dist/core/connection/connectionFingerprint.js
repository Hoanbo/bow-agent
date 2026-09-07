// src/core/connection/connectionFingerprint.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Deterministic 32-bit FNV-1a hex digest algorithm.
// Guarantees zero entropy leakage, zero timestamps, zero randomness in primary identity calculation.
const FNV_PRIME = 0x01000193;
const FNV_OFFSET_BASIS = 0x811c9dc5;
/**
 * Deterministically canonicalizes any Javascript data structure:
 * - Primitive values stringified canonically
 * - Arrays preserve element order, elements canonicalized recursively
 * - Objects have keys sorted lexicographically
 * - undefined, functions, and symbols normalized
 */
export function canonicalize(val) {
    if (val === null || val === undefined) {
        return 'null';
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
        return JSON.stringify(val);
    }
    if (typeof val === 'string') {
        return JSON.stringify(val);
    }
    if (Array.isArray(val)) {
        return '[' + val.map((item) => canonicalize(item)).join(',') + ']';
    }
    if (typeof val === 'object') {
        const obj = val;
        const sortedKeys = Object.keys(obj).sort();
        return ('{' +
            sortedKeys
                .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
                .join(',') +
            '}');
    }
    return JSON.stringify(String(val));
}
/**
 * Computes deterministic FNV-1a 32-bit integer for a given string
 */
export function fnv1a32(input) {
    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }
    return hash >>> 0;
}
/**
 * Computes 8-character zero-padded lowercase hexadecimal digest
 */
export function computeConnectionRuntimeFingerprint(data) {
    const canonical = canonicalize(data);
    const hash = fnv1a32(canonical);
    return hash.toString(16).padStart(8, '0');
}
export const computeConnectionFingerprint = computeConnectionRuntimeFingerprint;
