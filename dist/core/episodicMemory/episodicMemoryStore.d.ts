import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type EpisodicMemoryRecord } from './episodicMemoryTypes.js';
export interface EpisodicMemoryStoreOptions {
    readonly baseDir?: string;
    readonly sanitizer?: DiagnosisSanitizer;
}
export interface MemoryIdentityInput {
    readonly tenantId: string;
    readonly taskId: string;
    readonly stepId: string;
    readonly executionId: string;
    readonly commitId: string;
    readonly taskVersion: number;
}
export declare class EpisodicMemoryStore {
    private readonly baseDir;
    private readonly sanitizer;
    constructor(options?: EpisodicMemoryStoreOptions);
    /**
     * EN: Computes a deterministic memory ID from the authoritative identity tuple.
     */
    computeMemoryId(input: MemoryIdentityInput): string;
    /**
     * EN: Resolves the tenant memory directory, ensuring it exists.
     */
    getTenantMemoryDir(tenantId: string): string;
    /**
     * EN: Returns the file path for an episodic memory record.
     */
    getMemoryFilePath(tenantId: string, memoryId: string): string;
    /**
     * EN: Checks whether a memory record already exists for a tenant.
     */
    hasMemory(tenantId: string, memoryId: string): boolean;
    /**
     * EN: Saves an EpisodicMemoryRecord to disk using atomic temporary file replacement.
     * Fails closed if the record already exists (DuplicateMemoryError).
     */
    saveMemory(record: EpisodicMemoryRecord): void;
    /**
     * EN: Retrieves an EpisodicMemoryRecord from disk, enforcing tenant isolation.
     */
    getMemory(tenantId: string, memoryId: string): EpisodicMemoryRecord | undefined;
    /**
     * EN: Lists all episodic memory records for a tenant, optionally filtered by taskId.
     */
    listMemories(tenantId: string, taskId?: string): readonly EpisodicMemoryRecord[];
}
export declare const globalEpisodicMemoryStore: EpisodicMemoryStore;
