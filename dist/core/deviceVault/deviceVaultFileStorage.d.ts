import type { DeviceVaultStorage, VaultTransaction } from './deviceVaultTypes.js';
export interface DeviceVaultFileStorageOptions {
    readonly rootDir?: string;
    readonly autoRecover?: boolean;
}
export declare class DeviceVaultFileStorage implements DeviceVaultStorage {
    private readonly resolvedRootDir;
    constructor(options?: DeviceVaultFileStorageOptions);
    getRootDir(): string;
    private resolveKeyPath;
    load(key: string): string | null;
    save(key: string, data: string): void;
    replace(key: string, data: string): void;
    delete(key: string): boolean;
    exists(key: string): boolean;
    list(prefix?: string): readonly string[];
    beginTransaction(): VaultTransaction;
}
