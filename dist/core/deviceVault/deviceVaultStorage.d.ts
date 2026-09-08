export type { DeviceVaultStorage, VaultTransaction } from './deviceVaultTypes.js';
export interface StorageReadOptions {
    readonly consistent?: boolean;
}
export interface StorageWriteOptions {
    readonly sync?: boolean;
    readonly atomic?: boolean;
}
