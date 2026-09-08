// src/core/deviceVault/deviceVaultStorage.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Storage interface abstraction and transaction contracts.

export type { DeviceVaultStorage, VaultTransaction } from './deviceVaultTypes.js';

export interface StorageReadOptions {
  readonly consistent?: boolean;
}

export interface StorageWriteOptions {
  readonly sync?: boolean;
  readonly atomic?: boolean;
}
