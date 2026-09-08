import type { DeviceType } from '../pairing/pairingTypes.js';
export interface PersistentDeviceEnrollmentMetadata {
    readonly deviceType: DeviceType;
    readonly surfaceId: string;
    readonly hardwareModel?: string;
    readonly clientPlatform?: string;
    readonly clientAppVersion?: string;
    readonly publicKeyHint?: string;
}
/**
 * Deterministically generates canonical persistent device identity: `device_<fingerprint>`
 */
export declare function generatePersistentDeviceId(metadata: PersistentDeviceEnrollmentMetadata): string;
/**
 * Deterministically generates canonical device key identity: `key_<fingerprint>`
 */
export declare function generateKeyId(deviceId: string, keyVersion: number): string;
/**
 * Deterministically generates canonical challenge identity: `chlng_<fingerprint>`
 */
export declare function generateChallengeId(deviceId: string, nonce: string): string;
/**
 * Deterministically generates canonical device proof identity: `proof_<fingerprint>`
 */
export declare function generateProofId(challengeId: string, deviceId: string, nonce: string): string;
/**
 * Deterministically generates canonical persistent trust record identity: `ptrust_<fingerprint>`
 */
export declare function generatePersistentTrustId(deviceId: string, pairingId: string): string;
/**
 * Validates canonical persistent device identity format: `device_[0-9a-f]{8}`
 */
export declare function isValidPersistentDeviceId(id: unknown): id is string;
export declare const isValidDeviceId: typeof isValidPersistentDeviceId;
/**
 * Validates canonical key identity format: `key_[0-9a-f]{8}`
 */
export declare function isValidKeyId(id: unknown): id is string;
/**
 * Validates canonical challenge identity format: `chlng_[0-9a-f]{8}`
 */
export declare function isValidChallengeId(id: unknown): id is string;
/**
 * Validates canonical proof identity format: `proof_[0-9a-f]{8}`
 */
export declare function isValidProofId(id: unknown): id is string;
/**
 * Validates canonical persistent trust identity format: `ptrust_[0-9a-f]{8}`
 */
export declare function isValidPersistentTrustId(id: unknown): id is string;
