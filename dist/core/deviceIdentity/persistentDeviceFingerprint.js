// src/core/deviceIdentity/persistentDeviceFingerprint.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Deterministic 32-bit FNV-1a hex digest algorithm.
// Zero entropy leakage, zero timestamps, zero randomness in primary identity.
const FNV_PRIME = 0x01000193;
const FNV_OFFSET_BASIS = 0x811c9dc5;
/**
 * Deterministically canonicalizes any JavaScript data structure:
 * - Primitive values stringified canonically
 * - Arrays preserve element order, elements canonicalized recursively
 * - Objects have keys sorted lexicographically
 * - undefined, functions, and symbols normalized
 */
export function canonicalizePersistentData(val) {
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
        return '[' + val.map((item) => canonicalizePersistentData(item)).join(',') + ']';
    }
    if (typeof val === 'object') {
        const obj = val;
        const sortedKeys = Object.keys(obj).sort();
        return ('{' +
            sortedKeys
                .map((k) => `${JSON.stringify(k)}:${canonicalizePersistentData(obj[k])}`)
                .join(',') +
            '}');
    }
    return JSON.stringify(String(val));
}
/**
 * Computes deterministic FNV-1a 32-bit integer for a given string.
 */
export function fnv1a32Device(input) {
    let hash = FNV_OFFSET_BASIS;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }
    return hash >>> 0;
}
/**
 * Computes 8-character zero-padded lowercase hexadecimal digest.
 */
export function computeDeviceDigest(data) {
    const canonical = canonicalizePersistentData(data);
    const hash = fnv1a32Device(canonical);
    return hash.toString(16).padStart(8, '0');
}
/**
 * Computes deterministic device fingerprint.
 */
export function computeDeviceFingerprint(data) {
    return computeDeviceDigest(data);
}
/**
 * Computes an order-independent capability fingerprint.
 */
export function computeDeviceCapabilityFingerprint(capabilities) {
    const uniqueSorted = Array.from(new Set(capabilities)).sort();
    return computeDeviceDigest({ capabilities: uniqueSorted });
}
/**
 * Recursively deep freezes an object to enforce strict immutability.
 */
export function deepFreezeDevice(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
        const val = obj[key];
        if (val !== null && (typeof val === 'object' || typeof val === 'function') && !Object.isFrozen(val)) {
            deepFreezeDevice(val);
        }
    }
    return obj;
}
