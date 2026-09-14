import { type SemanticIndexDocument } from './semanticMemoryTypes.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { NativeVectorIndex } from './nativeVectorIndex.js';
export interface SemanticPersistenceOptions {
    readonly baseDir?: string;
    readonly partitionBaseDir?: string;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class SemanticMemoryPersistenceEngine {
    readonly baseDir: string;
    private readonly sanitizer;
    constructor(options?: SemanticPersistenceOptions);
    private ensureBaseDir;
    /**
     * Resolves safe partition file path for tenant semantic memory index.
     */
    resolvePartitionFilePath(tenantId: string): string;
    /**
     * Atomically saves a NativeVectorIndex partition to disk.
     */
    saveIndex(index: NativeVectorIndex, indexVersion?: number, activeTenantId?: string): {
        readonly filePath: string;
        readonly bytesWritten: number;
    };
    /**
     * Loads and validates a persisted vector index document from disk.
     */
    loadIndexDocument(tenantId: string, activeTenantId?: string): SemanticIndexDocument | null;
    private parseAndValidateFile;
}
