// src/core/deviceVault/deviceVaultRevocation.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Authoritative device revocation persistence.
// Invariant: Revocation MUST survive process and application restart.
import { updateVaultEntryStatus } from './deviceVaultEntry.js';
import { computeVaultDigest, deepFreezeVault } from './deviceVaultFingerprint.js';
/**
 * Authoritatively marks a DeviceCredentialRecord as revoked.
 * Sets all internal entries to REVOKED and recalculates the record fingerprint.
 */
export function revokeDeviceCredentialRecord(record, reason, timestamp) {
    const now = timestamp ?? Date.now();
    const updatedEntries = record.entries.map((entry) => updateVaultEntryStatus(entry, 'REVOKED', now));
    const newFingerprint = computeVaultDigest({
        recordId: record.recordId,
        deviceId: record.deviceId,
        vaultId: record.vaultId,
        activeKeyVersion: record.activeKeyVersion,
        revoked: true,
        revocationReason: reason,
        entries: updatedEntries.map((e) => e.fingerprint),
    });
    const updatedRecord = deepFreezeVault({
        ...record,
        entries: Object.freeze(updatedEntries),
        revoked: true,
        revokedAt: now,
        revocationReason: reason,
        trustRecordFingerprint: newFingerprint,
        updatedAt: now,
    });
    return {
        revoked: true,
        deviceId: record.deviceId,
        updatedRecord,
        revokedAt: now,
        reason,
    };
}
