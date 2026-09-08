// src/core/deviceVault/deviceVaultMemoryStorage.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// In-memory implementation of DeviceVaultStorage for deterministic testing.
// Enforces copy-on-write isolation and atomic transaction semantics.

import type { DeviceVaultStorage, VaultTransaction } from './deviceVaultTypes.js';

export class DeviceVaultMemoryStorage implements DeviceVaultStorage {
  private readonly data = new Map<string, string>();

  public load(key: string): string | null {
    const value = this.data.get(key);
    return value !== undefined ? value : null;
  }

  public save(key: string, data: string): void {
    this.data.set(key, data);
  }

  public replace(key: string, data: string): void {
    this.data.set(key, data);
  }

  public delete(key: string): boolean {
    return this.data.delete(key);
  }

  public exists(key: string): boolean {
    return this.data.has(key);
  }

  public list(prefix?: string): readonly string[] {
    const keys: string[] = [];
    for (const key of this.data.keys()) {
      if (!prefix || key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return Object.freeze(keys.sort());
  }

  public clear(): void {
    this.data.clear();
  }

  public size(): number {
    return this.data.size;
  }

  public beginTransaction(): VaultTransaction {
    const staged = new Map<string, string | null>();
    const txId = `tx_${Date.now()}_${Math.imul(this.data.size + 1, 16777619) >>> 0}`;

    return {
      id: txId,
      stageWrite: (key: string, data: string): void => {
        staged.set(key, data);
      },
      commit: (): void => {
        for (const [key, value] of staged.entries()) {
          if (value === null) {
            this.data.delete(key);
          } else {
            this.data.set(key, value);
          }
        }
        staged.clear();
      },
      rollback: (): void => {
        staged.clear();
      },
    };
  }
}
