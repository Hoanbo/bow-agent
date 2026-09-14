import { type SemanticMemoryRecord, type SemanticSearchResult } from './semanticMemoryTypes.js';
export interface NativeVectorIndexOptions {
    readonly tenantId: string;
    readonly modelId?: string;
    readonly dimension?: number;
    readonly maxEntries?: number;
}
export declare class NativeVectorIndex {
    readonly tenantId: string;
    modelId: string | null;
    dimension: number | null;
    readonly maxEntries: number;
    private readonly entries;
    constructor(options: NativeVectorIndexOptions);
    get size(): number;
    /**
     * Inserts or replaces a SemanticMemoryRecord into the vector index.
     * Enforces tenant isolation, dimension consistency, vector bounds, and capacity limits.
     */
    insert(record: SemanticMemoryRecord, activeTenantId?: string): void;
    /**
     * Retrieves a record by its memory ID.
     */
    get(memoryId: string, activeTenantId?: string): SemanticMemoryRecord | undefined;
    /**
     * Removes a record from the index.
     */
    remove(memoryId: string, activeTenantId?: string): boolean;
    /**
     * Clears all records from the index.
     */
    clear(): void;
    /**
     * Returns all indexed records as an array.
     */
    listEntries(activeTenantId?: string): readonly SemanticMemoryRecord[];
    /**
     * Searches the native vector index using cosine similarity.
     * Filters by minimum similarity score and optional session scope.
     * Returns top-K candidates ranked in descending order of similarity score.
     */
    search(queryVector: readonly number[], options?: {
        readonly topK?: number;
        readonly minScore?: number;
        readonly sessionId?: string;
        readonly activeTenantId?: string;
    }): readonly SemanticSearchResult[];
}
