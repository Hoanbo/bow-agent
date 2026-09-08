export declare const VAULT_ID_REGEX: RegExp;
export declare const VAULT_ENTRY_ID_REGEX: RegExp;
export declare const VAULT_RECORD_ID_REGEX: RegExp;
/**
 * Generates deterministic vaultId: vault_<8-hex>
 */
export declare function generateVaultId(seed: unknown): string;
/**
 * Generates deterministic entryId: entry_<8-hex>
 */
export declare function generateVaultEntryId(deviceId: string, keyId: string, version: number): string;
/**
 * Generates deterministic recordId: vrecord_<8-hex>
 */
export declare function generateVaultRecordId(deviceId: string, scopeString: string): string;
/**
 * Validates format of vaultId.
 */
export declare function isValidVaultId(id: unknown): id is string;
/**
 * Validates format of vaultEntryId.
 */
export declare function isValidVaultEntryId(id: unknown): id is string;
/**
 * Validates format of vaultRecordId.
 */
export declare function isValidVaultRecordId(id: unknown): id is string;
