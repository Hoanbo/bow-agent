// src/core/deviceVault/deviceVaultRotation.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Key rotation persistence: marks old key entries ROTATED and persists fresh active keys.
// Invariant: Old key versions MUST remain permanently rejected for new recognition.
import { createVaultEntry, updateVaultEntryStatus } from './deviceVaultEntry.js';
import { computeVaultDigest, deepFreezeVault } from './deviceVaultFingerprint.js';
import { formatPrivateKeyRef } from './deviceVaultKeyRef.js';
import { generateVaultEntryId } from './deviceVaultIdentity.js';
/**
 * Persists key rotation within a DeviceCredentialRecord.
 * Retires the active key entry to ROTATED and adds a fresh ACTIVE entry with incremented keyVersion.
 */
export function rotateVaultKey(input) {
    const now = input.timestamp ?? Date.now();
    const currentRecord = input.record;
    if (currentRecord.revoked) {
        throw new Error(`[VAULT_ROTATION_FAILED] Cannot rotate key for revoked device ${currentRecord.deviceId}`);
    }
    const oldKeyVersion = currentRecord.activeKeyVersion;
    const newKeyVersion = oldKeyVersion + 1;
    // 1. Mark existing entries as ROTATED
    const updatedEntries = [];
    for (const entry of currentRecord.entries) {
        if (entry.status === 'ACTIVE') {
            updatedEntries.push(updateVaultEntryStatus(entry, 'ROTATED', now));
        }
        else {
            updatedEntries.push(entry);
        }
    }
    // 2. Create new ACTIVE entry
    const newEntryId = generateVaultEntryId(currentRecord.deviceId, input.newKeyId, newKeyVersion);
    const newPrivateKeyRef = formatPrivateKeyRef(currentRecord.vaultId, newEntryId);
    const newEntry = createVaultEntry({
        deviceId: currentRecord.deviceId,
        keyId: input.newKeyId,
        keyVersion: newKeyVersion,
        publicKey: input.newPublicKey,
        algorithm: input.algorithm ?? 'ED25519_REF',
        status: 'ACTIVE',
        scope: currentRecord.scope,
        privateKeyRef: newPrivateKeyRef,
        timestamp: now,
    });
    updatedEntries.push(newEntry);
    // 3. Recalculate record fingerprint
    const newTrustFingerprint = computeVaultDigest({
        recordId: currentRecord.recordId,
        deviceId: currentRecord.deviceId,
        vaultId: currentRecord.vaultId,
        activeKeyVersion: newKeyVersion,
        revoked: false,
        entries: updatedEntries.map((e) => e.fingerprint),
    });
    const updatedRecord = deepFreezeVault({
        ...currentRecord,
        entries: Object.freeze(updatedEntries),
        activeKeyVersion: newKeyVersion,
        trustRecordFingerprint: newTrustFingerprint,
        updatedAt: now,
    });
    return {
        success: true,
        updatedRecord,
        oldKeyVersion,
        newKeyVersion,
        rotatedAt: now,
    };
}
