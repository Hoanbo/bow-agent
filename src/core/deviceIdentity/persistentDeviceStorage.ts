// src/core/deviceIdentity/persistentDeviceStorage.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION RUNTIME (MS-1.3.24)
//
// Authoritative storage abstraction and in-memory deterministic implementation
// for persistent device trust records.
//
// STRICT INVARIANTS:
// - PERSISTENCE != BRAIN_MEMORY
// - Storage implementation for MS-1.3.24 is strictly in-memory deterministic persistence.
// - Zero SQLite, PostgreSQL, MongoDB, Redis, or cloud dependencies.
// - Zero raw private key material persisted.
// - Copy-on-write / deep-freeze semantics ensure data isolation.

import type { PersistentDeviceTrustRecord } from './persistentDeviceTypes.js';
import { deepFreezeDevice } from './persistentDeviceFingerprint.js';

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

export class InMemoryPersistentDeviceStore implements PersistentDeviceStore {
  // Key: deviceId -> serialized JSON string (simulates true storage isolation & copy-on-write)
  private readonly storage = new Map<string, string>();

  public save(record: PersistentDeviceTrustRecord): void {
    const serialized = JSON.stringify(record);
    this.storage.set(record.deviceId, serialized);
  }

  public updateTrustState(record: PersistentDeviceTrustRecord): void {
    this.save(record);
  }

  public get(deviceId: string): PersistentDeviceTrustRecord | undefined {
    const serialized = this.storage.get(deviceId);
    if (!serialized) {
      return undefined;
    }
    const parsed = JSON.parse(serialized) as PersistentDeviceTrustRecord;
    return deepFreezeDevice(parsed);
  }

  public getByScope(deviceId: string, scopeString: string): PersistentDeviceTrustRecord | undefined {
    const record = this.get(deviceId);
    if (!record || record.scopeString !== scopeString) {
      return undefined;
    }
    return record;
  }

  public findByDeviceId(deviceId: string, scopeString?: string): PersistentDeviceTrustRecord | undefined {
    if (scopeString) {
      return this.getByScope(deviceId, scopeString);
    }
    return this.get(deviceId);
  }

  public delete(deviceId: string): boolean {
    return this.storage.delete(deviceId);
  }

  public list(): readonly PersistentDeviceTrustRecord[] {
    const results: PersistentDeviceTrustRecord[] = [];
    for (const serialized of this.storage.values()) {
      results.push(deepFreezeDevice(JSON.parse(serialized) as PersistentDeviceTrustRecord));
    }
    return Object.freeze(results);
  }

  public listByScope(scopeString: string): readonly PersistentDeviceTrustRecord[] {
    const results: PersistentDeviceTrustRecord[] = [];
    for (const serialized of this.storage.values()) {
      const record = JSON.parse(serialized) as PersistentDeviceTrustRecord;
      if (record.scopeString === scopeString) {
        results.push(deepFreezeDevice(record));
      }
    }
    return Object.freeze(results);
  }

  public listByUser(userId: string): readonly PersistentDeviceTrustRecord[] {
    const results: PersistentDeviceTrustRecord[] = [];
    for (const serialized of this.storage.values()) {
      const record = JSON.parse(serialized) as PersistentDeviceTrustRecord;
      if (record.userId === userId) {
        results.push(deepFreezeDevice(record));
      }
    }
    return Object.freeze(results);
  }

  public count(): number {
    return this.storage.size;
  }

  public clear(): void {
    this.storage.clear();
  }
}
