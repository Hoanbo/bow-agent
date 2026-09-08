// src/core/deviceVault/deviceVaultResult.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Standardized result envelope factories enforcing fail-closed invariants.
// Invariant: Persistence success does NOT imply authorization or execution success.
import { deepFreezeVault } from './deviceVaultFingerprint.js';
import { scrubVaultSecrets } from './deviceVaultAudit.js';
/**
 * Creates a successful VaultOperationResult.
 */
export function createSuccessVaultResult(data, state = 'READY', metadata) {
    const scrubbed = metadata ? scrubVaultSecrets(metadata) : undefined;
    const result = {
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
export function createFailureVaultResult(failureCode, failureReason, state = 'DEGRADED', metadata) {
    const scrubbed = metadata ? scrubVaultSecrets(metadata) : undefined;
    const result = {
        success: false,
        state,
        failureCode,
        failureReason,
        timestamp: Date.now(),
        metadata: scrubbed ? Object.freeze(scrubbed) : undefined,
    };
    return deepFreezeVault(result);
}
