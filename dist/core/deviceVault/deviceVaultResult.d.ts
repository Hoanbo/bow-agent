import type { VaultOperationResult, VaultState, DeviceVaultErrorCode } from './deviceVaultTypes.js';
/**
 * Creates a successful VaultOperationResult.
 */
export declare function createSuccessVaultResult<T>(data: T, state?: VaultState, metadata?: Record<string, unknown>): VaultOperationResult<T>;
/**
 * Creates a failed VaultOperationResult.
 */
export declare function createFailureVaultResult<T = void>(failureCode: DeviceVaultErrorCode, failureReason: string, state?: VaultState, metadata?: Record<string, unknown>): VaultOperationResult<T>;
