import type { DeviceCredentialRecord } from './deviceVaultTypes.js';
export interface RotateVaultKeyInput {
    readonly record: DeviceCredentialRecord;
    readonly newKeyId: string;
    readonly newPublicKey: string;
    readonly algorithm?: string;
    readonly timestamp?: number;
}
export interface RotateVaultKeyResult {
    readonly success: boolean;
    readonly updatedRecord: DeviceCredentialRecord;
    readonly oldKeyVersion: number;
    readonly newKeyVersion: number;
    readonly rotatedAt: number;
}
/**
 * Persists key rotation within a DeviceCredentialRecord.
 * Retires the active key entry to ROTATED and adds a fresh ACTIVE entry with incremented keyVersion.
 */
export declare function rotateVaultKey(input: RotateVaultKeyInput): RotateVaultKeyResult;
