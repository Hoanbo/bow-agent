// src/core/deviceVault/deviceVaultFileStorage.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Filesystem-backed storage implementation isolated within the BOW agent workspace.
// STRICT INVARIANTS:
// - ZERO access to C:\BOW\shopofbow.
// - Strict path traversal and Windows reserved name defense.
// - Atomic writes with recovery markers.

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DeviceVaultStorage, VaultTransaction } from './deviceVaultTypes.js';
import { atomicWriteFileSync } from './deviceVaultAtomicWrite.js';
import { recoverStorageDirectorySync } from './deviceVaultRecovery.js';

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

export interface DeviceVaultFileStorageOptions {
  readonly rootDir?: string;
  readonly autoRecover?: boolean;
}

export class DeviceVaultFileStorage implements DeviceVaultStorage {
  private readonly resolvedRootDir: string;

  constructor(options?: DeviceVaultFileStorageOptions) {
    const rawDir = options?.rootDir ?? path.join(process.cwd(), 'storage', 'deviceVault');
    this.resolvedRootDir = path.resolve(rawDir);

    // Strict invariant: NEVER touch shopofbow
    if (this.resolvedRootDir.toLowerCase().includes('shopofbow')) {
      throw new Error('[VAULT_IO_ERROR] Forbidden storage root: shopofbow is strictly protected');
    }

    if (!fs.existsSync(this.resolvedRootDir)) {
      fs.mkdirSync(this.resolvedRootDir, { recursive: true });
    }

    if (options?.autoRecover !== false) {
      recoverStorageDirectorySync(this.resolvedRootDir);
    }
  }

  public getRootDir(): string {
    return this.resolvedRootDir;
  }

  private resolveKeyPath(key: string): string {
    if (!key || typeof key !== 'string') {
      throw new Error('[VAULT_IO_ERROR] Storage key must be a non-empty string');
    }

    // Path traversal and null byte defense
    if (key.includes('\0') || key.includes('..')) {
      throw new Error(`[VAULT_IO_ERROR] Path traversal attempt detected in storage key: ${key}`);
    }

    const normalizedKey = key.replace(/\\/g, '/');
    const segments = normalizedKey.split('/').filter(Boolean);
    if (segments.length === 0) {
      throw new Error('[VAULT_IO_ERROR] Invalid empty storage key');
    }

    for (const segment of segments) {
      const baseName = segment.split('.')[0].toUpperCase();
      if (WINDOWS_RESERVED_NAMES.has(baseName)) {
        throw new Error(`[VAULT_IO_ERROR] Windows reserved device name in storage key: ${segment}`);
      }
    }

    const resolved = path.resolve(this.resolvedRootDir, ...segments);
    if (!resolved.startsWith(this.resolvedRootDir)) {
      throw new Error(`[VAULT_IO_ERROR] Key resolution escaped root directory: ${key}`);
    }

    if (resolved.toLowerCase().includes('shopofbow')) {
      throw new Error('[VAULT_IO_ERROR] Storage path violates shopofbow protection boundary');
    }

    return resolved;
  }

  public load(key: string): string | null {
    const filePath = this.resolveKeyPath(key);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      throw new Error(`[VAULT_IO_ERROR] Failed to read key ${key}: ${(err as Error).message}`);
    }
  }

  public save(key: string, data: string): void {
    const filePath = this.resolveKeyPath(key);
    atomicWriteFileSync(filePath, data);
  }

  public replace(key: string, data: string): void {
    const filePath = this.resolveKeyPath(key);
    atomicWriteFileSync(filePath, data);
  }

  public delete(key: string): boolean {
    const filePath = this.resolveKeyPath(key);
    if (!fs.existsSync(filePath)) {
      return false;
    }
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  public exists(key: string): boolean {
    const filePath = this.resolveKeyPath(key);
    return fs.existsSync(filePath);
  }

  public list(prefix?: string): readonly string[] {
    if (!fs.existsSync(this.resolvedRootDir)) {
      return [];
    }

    const results: string[] = [];
    const scanDir = (dir: string, relativeBase: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.endsWith('.tmp') || entry.name.endsWith('.marker') || entry.name.includes('.tmp.')) {
          continue; // Skip atomic temporary artifacts
        }

        const entryRel = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          scanDir(path.join(dir, entry.name), entryRel);
        } else if (entry.isFile()) {
          if (!prefix || entryRel.startsWith(prefix)) {
            results.push(entryRel);
          }
        }
      }
    };

    scanDir(this.resolvedRootDir, '');
    return Object.freeze(results.sort());
  }

  public beginTransaction(): VaultTransaction {
    const staged = new Map<string, string | null>();
    const txId = `tx_${Date.now()}_${Math.imul(Date.now(), 16777619) >>> 0}`;

    return {
      id: txId,
      stageWrite: (key: string, data: string): void => {
        staged.set(key, data);
      },
      commit: (): void => {
        for (const [key, value] of staged.entries()) {
          if (value === null) {
            this.delete(key);
          } else {
            this.save(key, value);
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
