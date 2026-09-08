// src/core/deviceVault/index.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Canonical barrel export for Device Credential Vault.
export * from './deviceVaultTypes.js';
export * from './deviceVaultStates.js';
export * from './deviceVaultTransitions.js';
export { generateVaultId, generateVaultEntryId, generateVaultRecordId, isValidVaultId, isValidVaultEntryId, isValidVaultRecordId, VAULT_ID_REGEX, VAULT_ENTRY_ID_REGEX, VAULT_RECORD_ID_REGEX, } from './deviceVaultIdentity.js';
export { fnv1a32Vault, computeVaultDigest, deepFreezeVault, } from './deviceVaultFingerprint.js';
export { formatPrivateKeyRef, parsePrivateKeyRef, isValidPrivateKeyRef, assertValidPrivateKeyRef, containsRawPrivateKey, assertNoRawPrivateKey, PRIVATE_KEY_REF_REGEX, } from './deviceVaultKeyRef.js';
export { createVaultEntry, updateVaultEntryStatus, } from './deviceVaultEntry.js';
export * from './deviceVaultStorage.js';
export * from './deviceVaultFileStorage.js';
export * from './deviceVaultMemoryStorage.js';
export { computeEnvelopeChecksum, validateVaultEntryIntegrity, validateDeviceCredentialRecordIntegrity, verifyVaultEnvelopeIntegrity, } from './deviceVaultIntegrity.js';
export { atomicWriteFileSync, readRecoveryMarkerSync, cleanupAtomicArtifactsSync, } from './deviceVaultAtomicWrite.js';
export { recoverInterruptedWriteSync, recoverStorageDirectorySync, } from './deviceVaultRecovery.js';
export { migrateVaultSchema, } from './deviceVaultMigration.js';
export { rotateVaultKey, } from './deviceVaultRotation.js';
export { revokeDeviceCredentialRecord, } from './deviceVaultRevocation.js';
export { VaultLockController, } from './deviceVaultLock.js';
export { DeviceVaultAuditLedger, scrubVaultSecrets, ALL_VAULT_AUDIT_EVENT_TYPES, } from './deviceVaultAudit.js';
export { DeviceVaultError, createDeviceVaultError, isDeviceVaultError, } from './deviceVaultError.js';
export { createSuccessVaultResult, createFailureVaultResult, } from './deviceVaultResult.js';
export { DeviceVaultRegistry } from './deviceVaultRegistry.js';
export { DeviceVaultRuntime, } from './deviceVaultRuntime.js';
