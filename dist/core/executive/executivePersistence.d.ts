import type { ExecutiveCheckpoint, GoalId } from './executiveTypes.js';
export declare class ExecutivePersistenceEngine {
    private _storageDir;
    private _customFilePath?;
    constructor(storageDir?: string);
    setPersistencePath(filePath: string): void;
    get storageDir(): string;
    get persistencePath(): string;
    saveToDisk(): string;
    loadFromDisk(): {
        version: string;
        timestamp: number;
        goals: any[];
        tasks: any[];
    } | null;
    computeChecksum(payload: string): string;
    /**
     * Saves a checkpoint atomically to disk with SHA-256 integrity hash.
     */
    saveCheckpoint(checkpoint: ExecutiveCheckpoint): string;
    /**
     * Loads and validates a checkpoint from disk. Fails closed if checksum mismatch.
     */
    loadCheckpoint(goalId: GoalId): ExecutiveCheckpoint | undefined;
    deleteCheckpoint(goalId: GoalId): void;
}
export declare const globalExecutivePersistence: ExecutivePersistenceEngine;
