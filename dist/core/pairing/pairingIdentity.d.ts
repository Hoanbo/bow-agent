import type { DeviceType } from './pairingTypes.js';
export interface DeviceMetadataInput {
    readonly deviceType: DeviceType;
    readonly surfaceId: string;
    readonly hardwareModel?: string;
    readonly clientPlatform?: string;
    readonly clientAppVersion?: string;
    readonly publicKeyHint?: string;
}
/**
 * Deterministically generates canonical device identity: `device_<fingerprint>`
 */
export declare function generateDeviceId(metadata: DeviceMetadataInput): string;
/**
 * Deterministically generates canonical pairing identity: `pair_<fingerprint>`
 */
export declare function generatePairingId(deviceId: string, scopeString: string, sequence: number): string;
/**
 * Deterministically generates canonical trust record identity: `trust_<fingerprint>`
 */
export declare function generateTrustId(deviceId: string, scopeString: string): string;
/**
 * Deterministically generates canonical audit record identity: `audit_<fingerprint>`
 */
export declare function generateAuditId(eventType: string, deviceId: string, timestamp: number, sequence: number): string;
/**
 * Validates canonical device identity format: `device_[0-9a-f]{8}`
 */
export declare function isValidDeviceId(id: unknown): id is string;
/**
 * Validates canonical pairing identity format: `pair_[0-9a-f]{8}`
 */
export declare function isValidPairingId(id: unknown): id is string;
/**
 * Validates canonical trust identity format: `trust_[0-9a-f]{8}`
 */
export declare function isValidTrustId(id: unknown): id is string;
