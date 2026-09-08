import type { VaultEnvelope, VaultMigrationRecord } from './deviceVaultTypes.js';
export interface MigrationResult {
    readonly success: boolean;
    readonly envelope?: VaultEnvelope;
    readonly record: VaultMigrationRecord;
}
/**
 * Migrates a legacy schema v1 envelope or record to schemaVersion 2.
 */
export declare function migrateVaultSchema(rawPayload: unknown): MigrationResult;
