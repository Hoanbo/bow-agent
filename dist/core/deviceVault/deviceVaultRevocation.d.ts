import type { DeviceCredentialRecord } from './deviceVaultTypes.js';
export interface RevokeDeviceRecordResult {
    readonly revoked: boolean;
    readonly deviceId: string;
    readonly updatedRecord: DeviceCredentialRecord;
    readonly revokedAt: number;
    readonly reason: string;
}
/**
 * Authoritatively marks a DeviceCredentialRecord as revoked.
 * Sets all internal entries to REVOKED and recalculates the record fingerprint.
 */
export declare function revokeDeviceCredentialRecord(record: DeviceCredentialRecord, reason: string, timestamp?: number): RevokeDeviceRecordResult;
