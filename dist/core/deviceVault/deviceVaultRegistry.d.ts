import type { DeviceCredentialRecord, VaultEntry } from './deviceVaultTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
export declare class DeviceVaultRegistry {
    private readonly recordsByDeviceId;
    private readonly recordsByScopeAndDeviceId;
    private readonly recordsByFingerprint;
    private readonly deviceIdsByUserId;
    private readonly entriesById;
    private makeScopeKey;
    registerRecord(record: DeviceCredentialRecord): void;
    getRecordByDeviceId(deviceId: string): DeviceCredentialRecord | undefined;
    getRecordByScope(deviceId: string, scope: ScopedDeviceIdentity): DeviceCredentialRecord | undefined;
    getRecordByFingerprint(fingerprint: string): DeviceCredentialRecord | undefined;
    getEntry(entryId: string): VaultEntry | undefined;
    getDevicesByUser(userId: string): readonly DeviceCredentialRecord[];
    removeRecord(deviceId: string): boolean;
    size(): number;
    clear(): void;
}
