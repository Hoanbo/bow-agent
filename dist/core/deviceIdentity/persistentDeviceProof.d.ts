import type { DeviceChallenge, DeviceProof, DeviceProofVerificationResult, ScopedDeviceIdentity } from './persistentDeviceTypes.js';
import type { DeviceKeyStore } from './persistentDeviceKey.js';
export declare const DEFAULT_CHALLENGE_TTL_MS = 60000;
export interface CreateChallengeParams {
    readonly deviceId: string;
    readonly scope: ScopedDeviceIdentity;
    readonly keyVersion: number;
    readonly nonce?: string;
    readonly ttlMs?: number;
    readonly timestamp?: number;
}
/**
 * Issues an authoritative, ephemeral cryptographic challenge for a device.
 */
export declare function createDeviceChallenge(params: CreateChallengeParams): DeviceChallenge;
export interface CreateProofParams {
    readonly challenge: DeviceChallenge;
    readonly keyStore: DeviceKeyStore;
    readonly keyId: string;
    readonly timestamp?: number;
}
/**
 * Creates a DeviceProof in response to a challenge by signing the challenge via the key store.
 */
export declare function createDeviceProof(params: CreateProofParams): DeviceProof;
/**
 * Convenience helper to generate a DeviceProof directly from a challenge and key store.
 */
export declare function generateDeviceProof(challenge: DeviceChallenge, keyStore: DeviceKeyStore, keyId?: string, timestamp?: number): DeviceProof;
/**
 * Verifies a DeviceProof against an authoritative challenge and key store.
 * Strictly verifies challenge expiration, deviceId match, nonce match, and cryptographic signature.
 */
export declare function verifyDeviceProof(challenge: DeviceChallenge, proof: DeviceProof, keyStore: DeviceKeyStore, currentTime?: number): DeviceProofVerificationResult;
