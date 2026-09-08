// src/core/relay/relayIdentity.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Deterministic relay identity generation and strict boundary separation.
//
// INVARIANTS:
// - RELAY_ID != DEVICE_ID
// - RELAY_ID != SESSION_ID
// - RELAY_ID != BRAIN_ID
// - IP != RELAY_ID
// - SSID != RELAY_ID
// - NO crypto.randomUUID()
// - NO Math.random()
import * as crypto from 'node:crypto';
export class RelayIdentityError extends Error {
    constructor(message) {
        super(`RELAY_IDENTITY_ERROR: ${message}`);
        this.name = 'RelayIdentityError';
    }
}
/**
 * Generates a deterministic Relay ID using cryptographic hashing (SHA-256) of a fixed configuration seed.
 * NEVER uses IP, MAC, SSID, timestamp, Math.random, or random UUID.
 */
export function generateDeterministicRelayId(seed) {
    if (!seed || typeof seed !== 'string' || seed.trim().length === 0) {
        throw new RelayIdentityError('Relay seed must be a non-empty string');
    }
    // Reject seeds that attempt to use transient network properties
    const lower = seed.toLowerCase();
    if (lower.includes('192.168.') ||
        lower.includes('10.') ||
        lower.includes('127.0.0.1') ||
        lower.includes('ssid') ||
        lower.includes('wifi') ||
        lower.includes('ip_address')) {
        throw new RelayIdentityError('Network location (IP, SSID, Wi-Fi) is strictly forbidden as relay identity seed.');
    }
    const hash = crypto.createHash('sha256').update(`bow_relay_seed_v4:${seed.trim()}`).digest('hex');
    return `relay_${hash.substring(0, 16)}`;
}
/**
 * Validates whether an identifier conforms to the authoritative RelayId format.
 */
export function isValidRelayId(id) {
    if (typeof id !== 'string')
        return false;
    return /^relay_[0-9a-f]{16}$/.test(id);
}
/**
 * Enforces architectural identity separation:
 * RELAY_ID != DEVICE_ID, RELAY_ID != SESSION_ID, RELAY_ID != BRAIN_ID
 */
export function assertRelayIdentitySeparation(relayId, deviceId, sessionId, brainId) {
    if (relayId === deviceId) {
        throw new RelayIdentityError(`INVARIANT_VIOLATION: RELAY_ID cannot equal DEVICE_ID (${relayId})`);
    }
    if (relayId === sessionId) {
        throw new RelayIdentityError(`INVARIANT_VIOLATION: RELAY_ID cannot equal SESSION_ID (${relayId})`);
    }
    if (relayId === brainId) {
        throw new RelayIdentityError(`INVARIANT_VIOLATION: RELAY_ID cannot equal BRAIN_ID (${relayId})`);
    }
}
