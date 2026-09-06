import { DurableJsonStore } from './persistence/durableJsonStore.js';
import type { IdempotencyEntry, IdempotencyStatus } from './persistence/governanceSchemas.js';
export type { IdempotencyEntry, IdempotencyStatus };
export declare class IdempotencyStore {
    readonly baseDir: string;
    readonly legacyFilePath: string;
    readonly defaultTtlMs: number;
    private singleFileOverride?;
    private stores;
    constructor(defaultTtlMs?: number, customBaseDirOrFilePath?: string, customLegacyFilePathOrAllowedDir?: string);
    /**
     * Resolve or initialize the isolated DurableJsonStore for the specified user.
     */
    getStore(userId?: string): DurableJsonStore<IdempotencyEntry[]>;
    /**
     * Check whether an idempotency key has already been executed or is in progress for the specified user.
     */
    check(key?: string, payload?: any, userId?: string): {
        isDuplicate: boolean;
        cachedResult?: any;
        reason?: string;
        conflict?: boolean;
        inProgress?: boolean;
    };
    /**
     * Atomically reserve execution for an idempotency key.
     * If the key is already reserved (IN_PROGRESS) or completed, reservation fails.
     */
    reserve(key: string, payload?: any, ttlMs?: number, userId?: string): {
        reserved: boolean;
        isDuplicate: boolean;
        cachedResult?: any;
        reason?: string;
        conflict?: boolean;
        inProgress?: boolean;
    };
    /**
     * Record a completed execution with its result
     */
    record(key: string, result: any, payload?: any, ttlMs?: number, userId?: string): void;
    /**
     * Remove expired keys
     */
    purgeExpired(userId?: string): number;
    size(userId?: string): number;
}
export declare const globalIdempotencyStore: IdempotencyStore;
