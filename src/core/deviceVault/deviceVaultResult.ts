// src/core/deviceVault/deviceVaultResult.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Standardized result envelope factories enforcing fail-closed invariants.
// Invariant: Persistence success does NOT imply authorization or execution success.

import type {
  VaultOperationResult,
  VaultState,
  DeviceVaultErrorCode,
} from './deviceVaultTypes.js';
import { deepFreezeVault } from './deviceVaultFingerprint.js';
import { scrubVaultSecrets } from './deviceVaultAudit.js';

/**
 * Creates a successful VaultOperationResult.
 */
export function createSuccessVaultResult<T>(
  data: T,
  state: VaultState = 'READY',
  metadata?: Record<string, unknown>
): VaultOperationResult<T> {
  const scrubbed = metadata ? (scrubVaultSecrets(metadata) as Record<string, unknown>) : undefined;
  const result: VaultOperationResult<T> = {
    success: true,
    data,
    state,
    timestamp: Date.now(),
    metadata: scrubbed ? Object.freeze(scrubbed) : undefined,
  };
  return deepFreezeVault(result);
}

/**
 * Creates a failed VaultOperationResult.
 */
export function createFailureVaultResult<T = void>(
  failureCode: DeviceVaultErrorCode,
  failureReason: string,
  state: VaultState = 'DEGRADED',
  metadata?: Record<string, unknown>
): VaultOperationResult<T> {
  const scrubbed = metadata ? (scrubVaultSecrets(metadata) as Record<string, unknown>) : undefined;
  const result: VaultOperationResult<T> = {
    success: false,
    state,
    failureCode,
    failureReason,
    timestamp: Date.now(),
    metadata: scrubbed ? Object.freeze(scrubbed) : undefined,
  };
  return deepFreezeVault(result);
}
