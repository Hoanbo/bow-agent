import type { VaultEnvelope, DeviceCredentialRecord, VaultIntegrityRecord, VaultEntry } from './deviceVaultTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
export interface IntegrityCheckOptions {
    readonly expectedScope?: ScopedDeviceIdentity;
    readonly expectedVaultId?: string;
    readonly expectedSchemaVersion?: number;
}
/**
 * Computes canonical checksum of a vault envelope payload (excluding the integrity block itself).
 */
export declare function computeEnvelopeChecksum(envelope: Omit<VaultEnvelope, 'integrity'>): string;
/**
 * Validates a single VaultEntry's fingerprint and invariants.
 */
export declare function validateVaultEntryIntegrity(entry: VaultEntry): {
    readonly valid: boolean;
    readonly reason?: string;
};
/**
 * Validates a DeviceCredentialRecord's internal integrity.
 */
export declare function validateDeviceCredentialRecordIntegrity(record: DeviceCredentialRecord, options?: IntegrityCheckOptions): {
    readonly valid: boolean;
    readonly reason?: string;
};
/**
 * Authoritatively validates raw serialized vault payload or parsed envelope.
 * Fails closed on malformed JSON, truncation, checksum mismatch, or scope mismatch.
 */
export declare function verifyVaultEnvelopeIntegrity(rawOrParsed: string | VaultEnvelope, options?: IntegrityCheckOptions): VaultIntegrityRecord;
