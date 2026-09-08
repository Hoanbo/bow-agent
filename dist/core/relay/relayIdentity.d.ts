import type { RelayId } from './relayTypes.js';
export declare class RelayIdentityError extends Error {
    constructor(message: string);
}
/**
 * Generates a deterministic Relay ID using cryptographic hashing (SHA-256) of a fixed configuration seed.
 * NEVER uses IP, MAC, SSID, timestamp, Math.random, or random UUID.
 */
export declare function generateDeterministicRelayId(seed: string): RelayId;
/**
 * Validates whether an identifier conforms to the authoritative RelayId format.
 */
export declare function isValidRelayId(id: unknown): id is RelayId;
/**
 * Enforces architectural identity separation:
 * RELAY_ID != DEVICE_ID, RELAY_ID != SESSION_ID, RELAY_ID != BRAIN_ID
 */
export declare function assertRelayIdentitySeparation(relayId: string, deviceId: string, sessionId: string, brainId: string): void;
