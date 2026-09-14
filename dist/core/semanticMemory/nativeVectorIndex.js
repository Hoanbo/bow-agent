// src/core/semanticMemory/nativeVectorIndex.ts
// BOWCON V4.0 — MS-1.5.03: NATIVE LOCAL VECTOR INDEX
// Component 1002 — REAL
//
// Invariants:
// STRICT_TENANT_ISOLATION == TRUE
// ZERO_CROSS_MODEL_COMPARISON == TRUE
// IN_MEMORY_RETRIEVAL_ACCELERATION == TRUE
// FAIL_CLOSED_ON_DIMENSION_MISMATCH == TRUE
// CANONICAL_MEMORY_REMAINS_AUTHORITATIVE == TRUE
import { VectorIndexCapacityError, CrossTenantSemanticMemoryError, MAX_INDEX_ENTRIES, } from './semanticMemoryTypes.js';
import { EmbeddingVectorValidator } from './embeddingVectorValidator.js';
import { VectorMathEngine } from './vectorMathEngine.js';
export class NativeVectorIndex {
    tenantId;
    modelId = null;
    dimension = null;
    maxEntries;
    entries = new Map();
    constructor(options) {
        if (!options.tenantId || typeof options.tenantId !== 'string' || !options.tenantId.trim()) {
            throw new Error('NativeVectorIndex requires a valid, non-empty tenantId');
        }
        this.tenantId = options.tenantId.trim();
        this.modelId = options.modelId || null;
        this.dimension = options.dimension || null;
        this.maxEntries = options.maxEntries ?? MAX_INDEX_ENTRIES;
    }
    get size() {
        return this.entries.size;
    }
    /**
     * Inserts or replaces a SemanticMemoryRecord into the vector index.
     * Enforces tenant isolation, dimension consistency, vector bounds, and capacity limits.
     */
    insert(record, activeTenantId) {
        if (activeTenantId && record.tenantId !== activeTenantId) {
            throw new CrossTenantSemanticMemoryError(record.tenantId, activeTenantId);
        }
        if (record.tenantId !== this.tenantId) {
            throw new CrossTenantSemanticMemoryError(record.tenantId, this.tenantId);
        }
        // Validate vector descriptor
        EmbeddingVectorValidator.validateDescriptor(record.embedding);
        // Initialize or verify index vector space (model & dimension)
        if (this.modelId === null) {
            this.modelId = record.embedding.modelId;
            this.dimension = record.embedding.dimension;
        }
        else {
            if (this.modelId !== record.embedding.modelId || this.dimension !== record.embedding.dimension) {
                throw new Error(`Cannot insert vector from model ${record.embedding.modelId} (${record.embedding.dimension}d) ` +
                    `into index bound to ${this.modelId} (${this.dimension}d)`);
            }
        }
        if (this.entries.size >= this.maxEntries && !this.entries.has(record.memoryId)) {
            throw new VectorIndexCapacityError(this.entries.size, this.maxEntries);
        }
        this.entries.set(record.memoryId, Object.freeze({ ...record }));
    }
    /**
     * Retrieves a record by its memory ID.
     */
    get(memoryId, activeTenantId) {
        if (activeTenantId && activeTenantId !== this.tenantId) {
            throw new CrossTenantSemanticMemoryError(this.tenantId, activeTenantId);
        }
        return this.entries.get(memoryId);
    }
    /**
     * Removes a record from the index.
     */
    remove(memoryId, activeTenantId) {
        if (activeTenantId && activeTenantId !== this.tenantId) {
            throw new CrossTenantSemanticMemoryError(this.tenantId, activeTenantId);
        }
        return this.entries.delete(memoryId);
    }
    /**
     * Clears all records from the index.
     */
    clear() {
        this.entries.clear();
    }
    /**
     * Returns all indexed records as an array.
     */
    listEntries(activeTenantId) {
        if (activeTenantId && activeTenantId !== this.tenantId) {
            throw new CrossTenantSemanticMemoryError(this.tenantId, activeTenantId);
        }
        return Object.freeze(Array.from(this.entries.values()));
    }
    /**
     * Searches the native vector index using cosine similarity.
     * Filters by minimum similarity score and optional session scope.
     * Returns top-K candidates ranked in descending order of similarity score.
     */
    search(queryVector, options = {}) {
        if (options.activeTenantId && options.activeTenantId !== this.tenantId) {
            throw new CrossTenantSemanticMemoryError(this.tenantId, options.activeTenantId);
        }
        if (this.dimension !== null) {
            EmbeddingVectorValidator.validateRawVector(queryVector, this.dimension);
        }
        else {
            EmbeddingVectorValidator.validateRawVector(queryVector);
        }
        const topK = options.topK ?? 10;
        const minScore = options.minScore ?? 0.0;
        const candidates = [];
        for (const record of this.entries.values()) {
            // Optional session filtering
            if (options.sessionId && record.sessionId && record.sessionId !== options.sessionId) {
                continue;
            }
            const sim = VectorMathEngine.cosineSimilarity(queryVector, record.embedding.values);
            if (sim >= minScore) {
                candidates.push({
                    memoryId: record.memoryId,
                    tenantId: record.tenantId,
                    sessionId: record.sessionId,
                    sourceDomain: record.sourceDomain,
                    canonicalText: record.canonicalText,
                    semanticScore: sim,
                    modelId: record.embedding.modelId,
                    dimension: record.embedding.dimension,
                });
            }
        }
        // Deterministic ranking: sort by similarity descending, tie-break by memoryId
        candidates.sort((a, b) => {
            if (b.semanticScore !== a.semanticScore) {
                return b.semanticScore - a.semanticScore;
            }
            return a.memoryId.localeCompare(b.memoryId);
        });
        return Object.freeze(candidates.slice(0, topK));
    }
}
