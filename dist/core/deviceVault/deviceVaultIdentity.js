// src/core/deviceVault/deviceVaultIdentity.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Deterministic identifier generation for vaults, entries, and records.
// Invariant: ZERO Math.random or crypto.randomUUID. Pure deterministic hashes.
import { computeVaultDigest } from './deviceVaultFingerprint.js';
export const VAULT_ID_REGEX = /^vault_[0-9a-f]{8}$/;
export const VAULT_ENTRY_ID_REGEX = /^entry_[0-9a-f]{8}$/;
export const VAULT_RECORD_ID_REGEX = /^vrecord_[0-9a-f]{8}$/;
/**
 * Generates deterministic vaultId: vault_<8-hex>
 */
export function generateVaultId(seed) {
    const digest = computeVaultDigest({ prefix: 'vault', seed });
    return `vault_${digest}`;
}
/**
 * Generates deterministic entryId: entry_<8-hex>
 */
export function generateVaultEntryId(deviceId, keyId, version) {
    const digest = computeVaultDigest({ prefix: 'entry', deviceId, keyId, version });
    return `entry_${digest}`;
}
/**
 * Generates deterministic recordId: vrecord_<8-hex>
 */
export function generateVaultRecordId(deviceId, scopeString) {
    const digest = computeVaultDigest({ prefix: 'vrecord', deviceId, scopeString });
    return `vrecord_${digest}`;
}
/**
 * Validates format of vaultId.
 */
export function isValidVaultId(id) {
    return typeof id === 'string' && VAULT_ID_REGEX.test(id);
}
/**
 * Validates format of vaultEntryId.
 */
export function isValidVaultEntryId(id) {
    return typeof id === 'string' && VAULT_ENTRY_ID_REGEX.test(id);
}
/**
 * Validates format of vaultRecordId.
 */
export function isValidVaultRecordId(id) {
    return typeof id === 'string' && VAULT_RECORD_ID_REGEX.test(id);
}
