import type { VaultRecoveryRecord } from './deviceVaultTypes.js';
export interface RecoverFileResult {
    readonly recovered: boolean;
    readonly record: VaultRecoveryRecord;
    readonly error?: string;
}
/**
 * Recovers a target file from any pending atomic write recovery marker.
 * Strictly verifies checksum of temporary file before completing rename.
 * Discards incomplete writes and fails closed on unrecoverable corruption.
 */
export declare function recoverInterruptedWriteSync(destPath: string): RecoverFileResult;
/**
 * Scans an entire storage directory and recovers all interrupted writes.
 */
export declare function recoverStorageDirectorySync(storageDir: string): readonly VaultRecoveryRecord[];
