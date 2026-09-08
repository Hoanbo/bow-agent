import type { PersistentDeviceTrustRecord } from './persistentDeviceTypes.js';
export interface PersistentDeviceStore {
    save(record: PersistentDeviceTrustRecord): Promise<void> | void;
    updateTrustState(record: PersistentDeviceTrustRecord): Promise<void> | void;
    get(deviceId: string): Promise<PersistentDeviceTrustRecord | undefined> | PersistentDeviceTrustRecord | undefined;
    getByScope(deviceId: string, scopeString: string): Promise<PersistentDeviceTrustRecord | undefined> | PersistentDeviceTrustRecord | undefined;
    findByDeviceId(deviceId: string, scopeString?: string): PersistentDeviceTrustRecord | undefined;
    delete(deviceId: string): Promise<boolean> | boolean;
    list(): Promise<readonly PersistentDeviceTrustRecord[]> | readonly PersistentDeviceTrustRecord[];
    listByScope(scopeString: string): Promise<readonly PersistentDeviceTrustRecord[]> | readonly PersistentDeviceTrustRecord[];
    listByUser(userId: string): Promise<readonly PersistentDeviceTrustRecord[]> | readonly PersistentDeviceTrustRecord[];
    count(): Promise<number> | number;
    clear(): Promise<void> | void;
}
export declare class InMemoryPersistentDeviceStore implements PersistentDeviceStore {
    private readonly storage;
    save(record: PersistentDeviceTrustRecord): void;
    updateTrustState(record: PersistentDeviceTrustRecord): void;
    get(deviceId: string): PersistentDeviceTrustRecord | undefined;
    getByScope(deviceId: string, scopeString: string): PersistentDeviceTrustRecord | undefined;
    findByDeviceId(deviceId: string, scopeString?: string): PersistentDeviceTrustRecord | undefined;
    delete(deviceId: string): boolean;
    list(): readonly PersistentDeviceTrustRecord[];
    listByScope(scopeString: string): readonly PersistentDeviceTrustRecord[];
    listByUser(userId: string): readonly PersistentDeviceTrustRecord[];
    count(): number;
    clear(): void;
}
