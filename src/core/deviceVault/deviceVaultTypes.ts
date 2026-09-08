// src/core/deviceVault/deviceVaultTypes.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Authoritative canonical contracts, data models, error codes, and operational results.
// Enforces:
// - Zero raw private key material exposure (opaque privateKeyRef only).
// - Zero username/password requirement for device recognition.
// - PERSISTENCE != BRAIN_MEMORY != AUTHORIZATION != EXECUTION.
// - Storage is infrastructure only; Brain is the sole cognitive authority.

import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';

export const VAULT_PROTOCOL_VERSION = '4.0.0';
export const CURRENT_VAULT_SCHEMA_VERSION = 2;

/**
 * 10 discrete canonical vault lifecycle states.
 */
export type VaultState =
  | 'UNINITIALIZED'
  | 'INITIALIZING'
  | 'READY'
  | 'LOCKED'
  | 'DEGRADED'
  | 'CORRUPTED'
  | 'RECOVERING'
  | 'MIGRATING'
  | 'REVOKED'
  | 'DESTROYED';

export const ALL_VAULT_STATES: readonly VaultState[] = Object.freeze([
  'UNINITIALIZED',
  'INITIALIZING',
  'READY',
  'LOCKED',
  'DEGRADED',
  'CORRUPTED',
  'RECOVERING',
  'MIGRATING',
  'REVOKED',
  'DESTROYED',
]);

/**
 * Lifecycle status of individual credential entries within the vault.
 */
export type VaultEntryStatus =
  | 'ACTIVE'
  | 'ROTATED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'PENDING_ROTATION';

export const ALL_VAULT_ENTRY_STATUSES: readonly VaultEntryStatus[] = Object.freeze([
  'ACTIVE',
  'ROTATED',
  'REVOKED',
  'EXPIRED',
  'PENDING_ROTATION',
]);

/**
 * Security reasons for locking the vault (internal security state, NOT a user password).
 */
export type VaultLockReason =
  | 'ADMIN_LOCK'
  | 'INTEGRITY_SUSPICION'
  | 'SESSION_TERMINATED'
  | 'MANUAL_LOCK'
  | 'TAMPER_DETECTED'
  | 'MIGRATION_IN_PROGRESS';

/**
 * Immutable credential entry model.
 * STRICT INVARIANT: Contains opaque `privateKeyRef`, NEVER raw private key material.
 */
export interface VaultEntry {
  readonly entryId: string;
  readonly deviceId: string;
  readonly keyId: string;
  readonly keyVersion: number;
  readonly publicKey: string;
  readonly algorithm: string;
  readonly status: VaultEntryStatus;
  readonly scope: ScopedDeviceIdentity;
  readonly scopeString: string;
  readonly fingerprint: string;
  readonly privateKeyRef: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Vault-level metadata persisted alongside records.
 */
export interface VaultMetadata {
  readonly vaultId: string;
  readonly schemaVersion: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly totalEntries: number;
  readonly activeEntries: number;
  readonly lastIntegrityCheck?: number;
  readonly fingerprint: string;
}

/**
 * Authoritative persistent credential record for an enrolled device.
 */
export interface DeviceCredentialRecord {
  readonly recordId: string;
  readonly deviceId: string;
  readonly vaultId: string;
  readonly entries: readonly VaultEntry[];
  readonly activeKeyVersion: number;
  readonly trustRecordFingerprint: string;
  readonly scope: ScopedDeviceIdentity;
  readonly scopeString: string;
  readonly revoked: boolean;
  readonly revokedAt?: number;
  readonly revocationReason?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Canonical versioned envelope for durable storage persistence.
 */
export interface VaultEnvelope {
  readonly schemaVersion: number;
  readonly vaultId: string;
  readonly deviceId: string;
  readonly scope: ScopedDeviceIdentity;
  readonly scopeString: string;
  readonly records: readonly DeviceCredentialRecord[];
  readonly integrity: {
    readonly checksum: string;
    readonly algorithm: string;
    readonly calculatedAt: number;
  };
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Durable storage interface supporting atomic transaction semantics.
 */
export interface DeviceVaultStorage {
  load(key: string): string | null;
  save(key: string, data: string): void;
  replace(key: string, data: string): void;
  delete(key: string): boolean;
  exists(key: string): boolean;
  list(prefix?: string): readonly string[];
  beginTransaction(): VaultTransaction;
}

/**
 * Transaction interface for stage-commit-rollback semantics.
 */
export interface VaultTransaction {
  readonly id: string;
  stageWrite(key: string, data: string): void;
  commit(): void;
  rollback(): void;
}

/**
 * Integrity record evaluating vault and entry consistency.
 */
export interface VaultIntegrityRecord {
  readonly checkedAt: number;
  readonly valid: boolean;
  readonly checksum: string;
  readonly totalRecords: number;
  readonly corruptedRecords: number;
  readonly failureCode?: DeviceVaultErrorCode;
  readonly failureReason?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Recovery record generated when recovering from interrupted writes or crash markers.
 */
export interface VaultRecoveryRecord {
  readonly recoveredAt: number;
  readonly action: string;
  readonly restoredFrom: string;
  readonly recoveredEntries: number;
  readonly discardedFragments: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Migration record tracking schema version upgrades.
 */
export interface VaultMigrationRecord {
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly migratedAt: number;
  readonly migratedCount: number;
  readonly status: 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  readonly failureReason?: string;
}

/**
 * Authoritative typed error codes for DeviceVault operations.
 */
export type DeviceVaultErrorCode =
  | 'VAULT_UNINITIALIZED'
  | 'VAULT_LOCKED'
  | 'VAULT_CORRUPTED'
  | 'VAULT_DEGRADED'
  | 'VAULT_ENTRY_NOT_FOUND'
  | 'VAULT_DUPLICATE_ENTRY'
  | 'VAULT_INTEGRITY_MISMATCH'
  | 'VAULT_FINGERPRINT_MISMATCH'
  | 'VAULT_SCOPE_MISMATCH'
  | 'VAULT_VERSION_MISMATCH'
  | 'VAULT_SCHEMA_INVALID'
  | 'VAULT_TRANSACTION_FAILED'
  | 'VAULT_RECOVERY_FAILED'
  | 'VAULT_MIGRATION_FAILED'
  | 'VAULT_ROTATION_FAILED'
  | 'VAULT_DEVICE_REVOKED'
  | 'VAULT_KEY_REVOKED'
  | 'VAULT_KEY_EXPIRED'
  | 'VAULT_SECRET_LEAKAGE_PREVENTED'
  | 'VAULT_INVALID_TRANSITION'
  | 'VAULT_IO_ERROR';

export const ALL_VAULT_ERROR_CODES: readonly DeviceVaultErrorCode[] = Object.freeze([
  'VAULT_UNINITIALIZED',
  'VAULT_LOCKED',
  'VAULT_CORRUPTED',
  'VAULT_DEGRADED',
  'VAULT_ENTRY_NOT_FOUND',
  'VAULT_DUPLICATE_ENTRY',
  'VAULT_INTEGRITY_MISMATCH',
  'VAULT_FINGERPRINT_MISMATCH',
  'VAULT_SCOPE_MISMATCH',
  'VAULT_VERSION_MISMATCH',
  'VAULT_SCHEMA_INVALID',
  'VAULT_TRANSACTION_FAILED',
  'VAULT_RECOVERY_FAILED',
  'VAULT_MIGRATION_FAILED',
  'VAULT_ROTATION_FAILED',
  'VAULT_DEVICE_REVOKED',
  'VAULT_KEY_REVOKED',
  'VAULT_KEY_EXPIRED',
  'VAULT_SECRET_LEAKAGE_PREVENTED',
  'VAULT_INVALID_TRANSITION',
  'VAULT_IO_ERROR',
]);

/**
 * Standardized generic vault operation result.
 */
export interface VaultOperationResult<T = void> {
  readonly success: boolean;
  readonly data?: T;
  readonly state: VaultState;
  readonly failureCode?: DeviceVaultErrorCode;
  readonly failureReason?: string;
  readonly timestamp: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Observational snapshot of vault state for AgentLoop context.
 * STRICT INVARIANT: Observational only; zero private key material.
 */
export interface DeviceVaultSnapshot {
  readonly vaultId: string;
  readonly state: VaultState;
  readonly schemaVersion: number;
  readonly totalRecords: number;
  readonly activeKeyVersion: number;
  readonly isLocked: boolean;
  readonly lastIntegrityTimestamp?: number;
}

/**
 * Primary DeviceCredentialVault interface contract.
 */
export interface DeviceCredentialVault {
  readonly vaultId: string;
  readonly state: VaultState;
  readonly schemaVersion: number;
  initialize(): VaultOperationResult<void>;
  storeCredential(record: DeviceCredentialRecord): VaultOperationResult<DeviceCredentialRecord>;
  loadCredential(deviceId: string, scope: ScopedDeviceIdentity): VaultOperationResult<DeviceCredentialRecord>;
  rotateKey(deviceId: string, scope: ScopedDeviceIdentity, newKeyVersion: number, newPublicKey: string): VaultOperationResult<DeviceCredentialRecord>;
  revokeCredential(deviceId: string, scope: ScopedDeviceIdentity, reason: string): VaultOperationResult<DeviceCredentialRecord>;
  checkIntegrity(): VaultIntegrityRecord;
  lock(reason?: VaultLockReason): VaultOperationResult<void>;
  unlock(): VaultOperationResult<void>;
  getSnapshot(): DeviceVaultSnapshot;
}
