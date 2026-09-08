// src/core/deviceVault/deviceVaultIntegrity.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Integrity verification: tamper detection, schema validation, truncation detection,
// fingerprint validation, and scope verification.
// STRICT INVARIANT: Always fails closed. Never silently promotes corrupted records.
import { areDeviceScopesEqual } from '../pairing/pairingScope.js';
import { computeVaultDigest } from './deviceVaultFingerprint.js';
import { containsRawPrivateKey } from './deviceVaultKeyRef.js';
/**
 * Computes canonical checksum of a vault envelope payload (excluding the integrity block itself).
 */
export function computeEnvelopeChecksum(envelope) {
    return computeVaultDigest({
        schemaVersion: envelope.schemaVersion,
        vaultId: envelope.vaultId,
        deviceId: envelope.deviceId,
        scope: envelope.scope,
        scopeString: envelope.scopeString,
        records: envelope.records,
        metadata: envelope.metadata,
    });
}
/**
 * Validates a single VaultEntry's fingerprint and invariants.
 */
export function validateVaultEntryIntegrity(entry) {
    if (containsRawPrivateKey(entry)) {
        return { valid: false, reason: 'Raw private key material detected in VaultEntry' };
    }
    const expectedFp = computeVaultDigest({
        entryId: entry.entryId,
        deviceId: entry.deviceId,
        keyId: entry.keyId,
        keyVersion: entry.keyVersion,
        publicKey: entry.publicKey,
        algorithm: entry.algorithm,
        status: entry.status,
        scopeString: entry.scopeString,
        privateKeyRef: entry.privateKeyRef,
    });
    if (entry.fingerprint !== expectedFp) {
        return {
            valid: false,
            reason: `Entry fingerprint mismatch (expected: ${expectedFp}, found: ${entry.fingerprint})`,
        };
    }
    return { valid: true };
}
/**
 * Validates a DeviceCredentialRecord's internal integrity.
 */
export function validateDeviceCredentialRecordIntegrity(record, options) {
    if (containsRawPrivateKey(record)) {
        return { valid: false, reason: 'Raw private key material detected in DeviceCredentialRecord' };
    }
    if (options?.expectedScope && !areDeviceScopesEqual(record.scope, options.expectedScope)) {
        return { valid: false, reason: 'Scope mismatch between record and expected scope' };
    }
    if (options?.expectedVaultId && record.vaultId !== options.expectedVaultId) {
        return { valid: false, reason: `VaultId mismatch (expected: ${options.expectedVaultId}, found: ${record.vaultId})` };
    }
    // Validate each entry
    for (const entry of record.entries) {
        const entryCheck = validateVaultEntryIntegrity(entry);
        if (!entryCheck.valid) {
            return { valid: false, reason: `Entry ${entry.entryId} corrupted: ${entryCheck.reason}` };
        }
    }
    return { valid: true };
}
/**
 * Authoritatively validates raw serialized vault payload or parsed envelope.
 * Fails closed on malformed JSON, truncation, checksum mismatch, or scope mismatch.
 */
export function verifyVaultEnvelopeIntegrity(rawOrParsed, options) {
    const now = Date.now();
    let envelope;
    if (typeof rawOrParsed === 'string') {
        try {
            envelope = JSON.parse(rawOrParsed);
        }
        catch (err) {
            return {
                checkedAt: now,
                valid: false,
                checksum: 'none',
                totalRecords: 0,
                corruptedRecords: 0,
                failureCode: 'VAULT_CORRUPTED',
                failureReason: `Payload truncation or invalid JSON format: ${err.message}`,
            };
        }
    }
    else {
        envelope = rawOrParsed;
    }
    // Check required envelope fields
    if (!envelope.vaultId || !envelope.schemaVersion || !envelope.records || !envelope.integrity) {
        return {
            checkedAt: now,
            valid: false,
            checksum: envelope.integrity?.checksum ?? 'none',
            totalRecords: envelope.records?.length ?? 0,
            corruptedRecords: 1,
            failureCode: 'VAULT_SCHEMA_INVALID',
            failureReason: 'Missing mandatory envelope fields',
        };
    }
    // Check raw private key leakage
    if (containsRawPrivateKey(envelope)) {
        return {
            checkedAt: now,
            valid: false,
            checksum: envelope.integrity.checksum,
            totalRecords: envelope.records.length,
            corruptedRecords: envelope.records.length,
            failureCode: 'VAULT_SECRET_LEAKAGE_PREVENTED',
            failureReason: 'Raw private key material detected in vault envelope payload',
        };
    }
    // Verify schema version
    if (options?.expectedSchemaVersion && envelope.schemaVersion !== options.expectedSchemaVersion) {
        return {
            checkedAt: now,
            valid: false,
            checksum: envelope.integrity.checksum,
            totalRecords: envelope.records.length,
            corruptedRecords: 0,
            failureCode: 'VAULT_VERSION_MISMATCH',
            failureReason: `Envelope schemaVersion (${envelope.schemaVersion}) does not match expected (${options.expectedSchemaVersion})`,
        };
    }
    // Verify vault ID
    if (options?.expectedVaultId && envelope.vaultId !== options.expectedVaultId) {
        return {
            checkedAt: now,
            valid: false,
            checksum: envelope.integrity.checksum,
            totalRecords: envelope.records.length,
            corruptedRecords: 0,
            failureCode: 'VAULT_INTEGRITY_MISMATCH',
            failureReason: `Envelope vaultId (${envelope.vaultId}) does not match expected (${options.expectedVaultId})`,
        };
    }
    // Verify scope
    if (options?.expectedScope && !areDeviceScopesEqual(envelope.scope, options.expectedScope)) {
        return {
            checkedAt: now,
            valid: false,
            checksum: envelope.integrity.checksum,
            totalRecords: envelope.records.length,
            corruptedRecords: 0,
            failureCode: 'VAULT_SCOPE_MISMATCH',
            failureReason: 'Envelope scope does not match expected target scope',
        };
    }
    // Verify checksum
    const expectedChecksum = computeEnvelopeChecksum(envelope);
    if (envelope.integrity.checksum !== expectedChecksum) {
        return {
            checkedAt: now,
            valid: false,
            checksum: envelope.integrity.checksum,
            totalRecords: envelope.records.length,
            corruptedRecords: 1,
            failureCode: 'VAULT_FINGERPRINT_MISMATCH',
            failureReason: `Envelope checksum mismatch (expected: ${expectedChecksum}, found: ${envelope.integrity.checksum})`,
        };
    }
    // Verify each individual record
    let corruptedCount = 0;
    for (const record of envelope.records) {
        const recordCheck = validateDeviceCredentialRecordIntegrity(record, options);
        if (!recordCheck.valid) {
            corruptedCount++;
            return {
                checkedAt: now,
                valid: false,
                checksum: envelope.integrity.checksum,
                totalRecords: envelope.records.length,
                corruptedRecords: corruptedCount,
                failureCode: 'VAULT_CORRUPTED',
                failureReason: `Record ${record.recordId} integrity failed: ${recordCheck.reason}`,
            };
        }
    }
    return {
        checkedAt: now,
        valid: true,
        checksum: envelope.integrity.checksum,
        totalRecords: envelope.records.length,
        corruptedRecords: 0,
    };
}
