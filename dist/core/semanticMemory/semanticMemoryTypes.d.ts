export declare const SEMANTIC_MEMORY_SCHEMA_VERSION = 1;
export declare const MAX_VECTOR_DIMENSIONS = 4096;
export declare const MIN_VECTOR_DIMENSIONS = 16;
export declare const MAX_INDEX_ENTRIES = 10000;
export declare const MAX_SEMANTIC_PAYLOAD_BYTES: number;
export declare class SemanticMemoryError extends Error {
    readonly code: string;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class EmbeddingValidationError extends SemanticMemoryError {
    readonly validationErrors: readonly string[];
    constructor(message: string, errors?: string[], details?: Record<string, unknown>);
}
export declare class VectorMathError extends SemanticMemoryError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class VectorIndexCapacityError extends SemanticMemoryError {
    constructor(currentCount: number, maxCount: number);
}
export declare class IncompatibleVectorSpaceError extends SemanticMemoryError {
    constructor(modelA: string, dimA: number, modelB: string, dimB: number);
}
export declare class CrossTenantSemanticMemoryError extends SemanticMemoryError {
    constructor(requestedTenant: string, activeTenant: string);
}
export declare class SemanticMemoryUserStopError extends SemanticMemoryError {
    constructor(checkpoint: string);
}
export declare class SemanticMemoryPersistenceError extends SemanticMemoryError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class SemanticMemoryIntegrityError extends SemanticMemoryError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class SemanticMemoryValidationError extends SemanticMemoryError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class SemanticMemoryCoTProhibitedError extends SemanticMemoryError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class SemanticMemorySecurityError extends SemanticMemoryError {
    constructor(message: string, details?: Record<string, unknown>);
}
export type RetrievalMode = 'HYBRID' | 'SEMANTIC_ONLY' | 'LEXICAL_ONLY' | 'DEGRADED_LEXICAL';
export interface EmbeddingVectorDescriptor {
    readonly vectorId: string;
    readonly providerId: string;
    readonly modelId: string;
    readonly modelVersion: string;
    readonly dimension: number;
    readonly values: readonly number[];
    readonly contentHash: string;
    readonly createdAt: string;
}
export interface SemanticMemoryRecord {
    readonly memoryId: string;
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly sourceDomain: 'EPISODIC' | 'KNOWLEDGE_GRAPH' | 'WORKING_REGISTER' | 'USER_PREFERENCE';
    readonly canonicalText: string;
    readonly contentHash: string;
    readonly embedding: EmbeddingVectorDescriptor;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly indexedAt: string;
}
export interface SemanticSearchResult {
    readonly memoryId: string;
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly sourceDomain: string;
    readonly canonicalText: string;
    readonly semanticScore: number;
    readonly modelId: string;
    readonly dimension: number;
}
export interface HybridSearchResult {
    readonly memoryId: string;
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly sourceDomain: string;
    readonly canonicalText: string;
    readonly lexicalScore: number;
    readonly semanticScore: number;
    readonly hybridScore: number;
    readonly retrievalMode: RetrievalMode;
    readonly matchReasons: readonly string[];
}
export interface HybridRetrievalWeights {
    readonly lexicalWeight: number;
    readonly semanticWeight: number;
}
export interface SemanticIndexDocument {
    readonly schemaVersion: number;
    readonly tenantId: string;
    readonly modelId: string;
    readonly dimension: number;
    readonly indexVersion: number;
    readonly entries: readonly SemanticMemoryRecord[];
    readonly provenanceHash: string;
    readonly lastUpdatedAt: string;
}
/**
 * Validates that an object key is safe against prototype pollution.
 */
export declare function isSafeObjectKey(key: string): boolean;
/**
 * Validates that an object or text contains no raw chain-of-thought tokens or keys.
 * Throws SemanticMemoryCoTProhibitedError if prohibited reasoning traces are detected,
 * or SemanticMemorySecurityError if prototype pollution keys are encountered.
 */
export declare function assertNoChainOfThought(val: unknown, path?: string): void;
export declare const assertNoProhibitedReasoning: typeof assertNoChainOfThought;
/**
 * Computes deterministic SHA-256 content hash of sanitized canonical text.
 */
export declare function computeContentHash(canonicalText: string): string;
/**
 * Computes deterministic provenance hash for an individual semantic memory projection.
 */
export declare function computeProvenanceHash(memoryId: string, tenantId: string, modelId: string, contentHash: string): string;
/**
 * Computes deterministic provenance hash for a semantic index partition.
 */
export declare function computeIndexProvenanceHash(doc: Omit<SemanticIndexDocument, 'provenanceHash'>): string;
