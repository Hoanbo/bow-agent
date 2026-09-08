// src/core/deviceVault/deviceVaultTypes.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Authoritative canonical contracts, data models, error codes, and operational results.
// Enforces:
// - Zero raw private key material exposure (opaque privateKeyRef only).
// - Zero username/password requirement for device recognition.
// - PERSISTENCE != BRAIN_MEMORY != AUTHORIZATION != EXECUTION.
// - Storage is infrastructure only; Brain is the sole cognitive authority.
export const VAULT_PROTOCOL_VERSION = '4.0.0';
export const CURRENT_VAULT_SCHEMA_VERSION = 2;
export const ALL_VAULT_STATES = Object.freeze([
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
export const ALL_VAULT_ENTRY_STATUSES = Object.freeze([
    'ACTIVE',
    'ROTATED',
    'REVOKED',
    'EXPIRED',
    'PENDING_ROTATION',
]);
export const ALL_VAULT_ERROR_CODES = Object.freeze([
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
