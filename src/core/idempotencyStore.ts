// src/core/idempotencyStore.ts
// BOWCON V4.0 — ATOMIC IDEMPOTENCY KEY STORE WITH MULTI-TENANT DURABLE PERSISTENCE
// Compliant with ISO/IEC 42001 & NIST AI RMF
// Guarantees zero duplicate side effects across all tool executions with identity-scoped physical storage.

// EN:
// Idempotency (safe retry behavior) reserves a key before an action starts. A matching
// concurrent request observes IN_PROGRESS; a completed request receives its cached result.
// The key is partitioned by ownerUserId, so identical keys cannot cross user boundaries.
//
// VI:
// Idempotency (tính bất biến khi lặp lại) đặt trước một khóa trước khi hành động bắt đầu.
// Request đồng thời có cùng khóa sẽ thấy IN_PROGRESS; request hoàn tất nhận lại kết quả đã lưu.
// Khóa được phân vùng theo ownerUserId, vì vậy các khóa giống nhau không thể vượt qua ranh giới người dùng.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DurableJsonStore } from './persistence/durableJsonStore.js';
import { resolveUserPartition, DEFAULT_PRIMARY_USER_ID } from './persistence/userPartitionResolver.js';
import { validateIdempotencyEntries } from './persistence/governanceSchemas.js';
import type { IdempotencyEntry, IdempotencyStatus } from './persistence/governanceSchemas.js';

export type { IdempotencyEntry, IdempotencyStatus };

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_PARTITIONS_DIR = path.join(DEFAULT_DATA_DIR, 'idempotency');
const LEGACY_IDEMPOTENCY_FILE_PATH = path.join(DEFAULT_DATA_DIR, 'idempotency_store.json');

export class IdempotencyStore {
  public readonly baseDir: string;
  public readonly legacyFilePath: string;
  public readonly defaultTtlMs: number;
  private singleFileOverride?: string;
  private stores = new Map<string, DurableJsonStore<IdempotencyEntry[]>>();

  constructor(
    defaultTtlMs: number = 24 * 60 * 60 * 1000,
    customBaseDirOrFilePath?: string,
    customLegacyFilePathOrAllowedDir?: string
  ) {
    this.defaultTtlMs = defaultTtlMs;

    if (customBaseDirOrFilePath && customBaseDirOrFilePath.endsWith('.json')) {
      // EN: Preserve the legacy single-file test seam without weakening production partitioning.
      // VI: Giữ điểm mở rộng kiểm thử file đơn cũ mà không làm suy yếu phân vùng production.
      this.baseDir = path.dirname(customBaseDirOrFilePath);
      this.singleFileOverride = customBaseDirOrFilePath;
      this.legacyFilePath =
        customLegacyFilePathOrAllowedDir && customLegacyFilePathOrAllowedDir.endsWith('.json')
          ? customLegacyFilePathOrAllowedDir
          : LEGACY_IDEMPOTENCY_FILE_PATH;
    } else {
      this.baseDir = customBaseDirOrFilePath || DEFAULT_PARTITIONS_DIR;
      this.legacyFilePath = customLegacyFilePathOrAllowedDir || LEGACY_IDEMPOTENCY_FILE_PATH;
    }

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    if (this.singleFileOverride) {
      // Fail closed immediately on corrupt single-file override
      this.getStore();
    }
  }

  /**
   * Resolve or initialize the isolated DurableJsonStore for the specified user.
   */
  public getStore(userId?: string): DurableJsonStore<IdempotencyEntry[]> {
    const targetUserId = userId || DEFAULT_PRIMARY_USER_ID;
    const partition = resolveUserPartition(targetUserId, this.baseDir);
    const targetFilePath = this.singleFileOverride || partition.filePath;
    const cacheKey = this.singleFileOverride ? '__single_file__' : partition.partitionKey;

    if (this.stores.has(cacheKey)) {
      return this.stores.get(cacheKey)!;
    }

    // EN: Migrate legacy data once and only to the configured primary owner's partition.
    // VI: Chuyển dữ liệu cũ đúng một lần và chỉ vào phân vùng của chủ sở hữu chính đã cấu hình.
    if (
      !this.singleFileOverride &&
      partition.userId === DEFAULT_PRIMARY_USER_ID &&
      !fs.existsSync(partition.filePath)
    ) {
      if (fs.existsSync(this.legacyFilePath) && fs.statSync(this.legacyFilePath).isFile()) {
        try {
          const migrationStore = new DurableJsonStore<IdempotencyEntry[]>({
            filePath: this.legacyFilePath,
            validator: validateIdempotencyEntries,
            defaultFactory: () => [],
            allowedBaseDir: path.dirname(this.legacyFilePath),
            quarantineCorrupted: false,
          });
          const legacyEntries = migrationStore.read();
          const targetStore = new DurableJsonStore<IdempotencyEntry[]>({
            filePath: partition.filePath,
            validator: validateIdempotencyEntries,
            defaultFactory: () => legacyEntries,
            allowedBaseDir: this.baseDir,
            quarantineCorrupted: true,
          });
          targetStore.write(legacyEntries);
        } catch (err) {
          console.warn('[IdempotencyStore] Legacy idempotency migration skipped or failed:', err);
        }
      }
    }

    const store = new DurableJsonStore<IdempotencyEntry[]>({
      filePath: targetFilePath,
      validator: validateIdempotencyEntries,
      defaultFactory: () => [],
      allowedBaseDir: this.baseDir,
      quarantineCorrupted: true,
    });

    this.stores.set(cacheKey, store);
    return store;
  }

  /**
   * Check whether an idempotency key has already been executed or is in progress for the specified user.
   */
  public check(
    key?: string,
    payload?: any,
    userId?: string
  ): {
    isDuplicate: boolean;
    cachedResult?: any;
    reason?: string;
    conflict?: boolean;
    inProgress?: boolean;
  } {
    if (!key) return { isDuplicate: false };

    const store = this.getStore(userId);
    const entries = store.read();
    const entry = entries.find(e => e.key === key);

    if (!entry) return { isDuplicate: false };

    if (Date.now() > entry.expiresAt) {
      store.update(list => list.filter(e => e.key !== key));
      return { isDuplicate: false };
    }

    if (payload !== undefined) {
      const currentHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      if (entry.payloadHash && currentHash !== entry.payloadHash) {
        return {
          isDuplicate: true,
          conflict: true,
          reason: 'IDEMPOTENCY_CONFLICT: PAYLOAD_HASH_MISMATCH - Idempotency key reused with conflicting parameters',
        };
      }
    }

    if (entry.status === 'IN_PROGRESS') {
      return {
        isDuplicate: true,
        inProgress: true,
        reason: 'EXECUTION_IN_PROGRESS: Action is currently in progress under this idempotency key',
      };
    }

    return {
      isDuplicate: true,
      cachedResult: entry.result,
    };
  }

  /**
   * Atomically reserve execution for an idempotency key.
   * If the key is already reserved (IN_PROGRESS) or completed, reservation fails.
   */
  public reserve(
    key: string,
    payload?: any,
    ttlMs?: number,
    userId?: string
  ): {
    reserved: boolean;
    isDuplicate: boolean;
    cachedResult?: any;
    reason?: string;
    conflict?: boolean;
    inProgress?: boolean;
  } {
    if (!key) return { reserved: false, isDuplicate: false };

    const store = this.getStore(userId);
    const now = Date.now();
    const targetOwner = userId || DEFAULT_PRIMARY_USER_ID;
    let outcome: {
      reserved: boolean;
      isDuplicate: boolean;
      cachedResult?: any;
      reason?: string;
      conflict?: boolean;
      inProgress?: boolean;
    } = { reserved: false, isDuplicate: false };

    store.update(entries => {
      const existing = entries.find(e => e.key === key);

      if (existing && existing.expiresAt > now) {
        if (payload !== undefined) {
          const currentHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
          if (existing.payloadHash && currentHash !== existing.payloadHash) {
            outcome = {
              reserved: false,
              isDuplicate: true,
              conflict: true,
              reason: 'IDEMPOTENCY_CONFLICT: PAYLOAD_HASH_MISMATCH - Idempotency key reused with conflicting parameters',
            };
            return entries;
          }
        }

        if (existing.status === 'IN_PROGRESS') {
          outcome = {
            reserved: false,
            isDuplicate: true,
            inProgress: true,
            reason: 'EXECUTION_IN_PROGRESS: Action is already in progress',
          };
          return entries;
        }

        outcome = {
          reserved: false,
          isDuplicate: true,
          cachedResult: existing.result,
        };
        return entries;
      }

      // EN: Reserve before execution so a retry cannot create a second side effect.
      // VI: Đặt trước trước khi thực thi để request thử lại không thể tạo tác động phụ thứ hai.
      const payloadHash = payload !== undefined
        ? crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
        : '';

      const newEntry: IdempotencyEntry = {
        key,
        ownerUserId: targetOwner,
        status: 'IN_PROGRESS',
        payloadHash,
        result: undefined,
        recordedAt: now,
        expiresAt: now + (ttlMs || this.defaultTtlMs),
      };

      outcome = {
        reserved: true,
        isDuplicate: false,
        inProgress: true,
      };

      return [...entries.filter(e => e.key !== key), newEntry];
    });

    return outcome;
  }

  /**
   * Record a completed execution with its result
   */
  public record(key: string, result: any, payload?: any, ttlMs?: number, userId?: string): void {
    const store = this.getStore(userId);
    const now = Date.now();
    const payloadHash = payload !== undefined
      ? crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
      : '';
    const targetOwner = userId || DEFAULT_PRIMARY_USER_ID;

    store.update(entries => {
      const existing = entries.find(e => e.key === key);
      if (existing) {
        return entries.map(e =>
          e.key === key
            ? {
                ...e,
                status: 'COMPLETED' as IdempotencyStatus,
                result,
                payloadHash: payloadHash || e.payloadHash,
                updatedAt: now,
              }
            : e
        );
      }

      const newEntry: IdempotencyEntry = {
        key,
        ownerUserId: targetOwner,
        status: 'COMPLETED',
        payloadHash,
        result,
        recordedAt: now,
        expiresAt: now + (ttlMs || this.defaultTtlMs),
      };
      return [...entries, newEntry];
    });
  }

  /**
   * Remove expired keys
   */
  public purgeExpired(userId?: string): number {
    const store = this.getStore(userId);
    const now = Date.now();
    let purged = 0;

    store.update(entries => {
      const valid = entries.filter(e => {
        if (e.expiresAt <= now) {
          purged++;
          return false;
        }
        return true;
      });
      return valid;
    });

    return purged;
  }

  public size(userId?: string): number {
    const store = this.getStore(userId);
    const now = Date.now();
    return store.read().filter(e => e.expiresAt > now).length;
  }
}

export const globalIdempotencyStore = new IdempotencyStore(
  24 * 60 * 60 * 1000
);
