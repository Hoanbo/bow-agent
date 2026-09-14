import { type CognitiveStateDocument } from './cognitiveStateTypes.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface CognitivePersistenceOptions {
    readonly baseDir?: string;
    readonly partitionBaseDir?: string;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class CognitiveStatePersistenceEngine {
    readonly baseDir: string;
    private readonly sanitizer;
    constructor(options?: CognitivePersistenceOptions);
    private ensureBaseDir;
    /**
     * Resolves the safe partition file path for a tenant and session.
     */
    resolvePartitionFilePath(tenantId: string, sessionId: string): string;
    /**
     * Atomically persists a CognitiveStateDocument to disk.
     * Runs secret sanitization, verifies size ceiling, validates provenance hash,
     * writes to temporary file, and performs atomic rename.
     */
    save(doc: CognitiveStateDocument, activeTenantId?: string): {
        readonly filePath: string;
        readonly bytesWritten: number;
    };
    /**
     * Reads a raw persisted partition from disk.
     */
    load(tenantId: string, sessionId: string, activeTenantId?: string): CognitiveStateDocument | null;
    /**
     * Checks if a partition exists for tenant and session.
     */
    exists(tenantId: string, sessionId: string): boolean;
    /**
     * Deletes a state partition safely.
     */
    delete(tenantId: string, sessionId: string, activeTenantId?: string): boolean;
}
