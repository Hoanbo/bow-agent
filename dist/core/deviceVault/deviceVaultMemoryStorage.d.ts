import type { DeviceVaultStorage, VaultTransaction } from './deviceVaultTypes.js';
export declare class DeviceVaultMemoryStorage implements DeviceVaultStorage {
    private readonly data;
    load(key: string): string | null;
    save(key: string, data: string): void;
    replace(key: string, data: string): void;
    delete(key: string): boolean;
    exists(key: string): boolean;
    list(prefix?: string): readonly string[];
    clear(): void;
    size(): number;
    beginTransaction(): VaultTransaction;
}
