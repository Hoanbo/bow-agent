import type { VaultEntry, VaultEntryStatus } from './deviceVaultTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
export interface CreateVaultEntryInput {
    readonly deviceId: string;
    readonly keyId: string;
    readonly keyVersion: number;
    readonly publicKey: string;
    readonly algorithm: string;
    readonly status?: VaultEntryStatus;
    readonly scope: ScopedDeviceIdentity;
    readonly privateKeyRef: string;
    readonly timestamp?: number;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * Creates an immutable, validated VaultEntry.
 * Fails closed if raw private keys are detected or if privateKeyRef is invalid.
 */
export declare function createVaultEntry(input: CreateVaultEntryInput): VaultEntry;
/**
 * Updates the status of an existing VaultEntry, recalculating its fingerprint.
 */
export declare function updateVaultEntryStatus(entry: VaultEntry, newStatus: VaultEntryStatus, timestamp?: number): VaultEntry;
