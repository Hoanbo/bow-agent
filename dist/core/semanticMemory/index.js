// src/core/semanticMemory/index.ts
// BOWCON V4.0 — MS-1.5.03: LOCAL EMBEDDING ENGINE & NATIVE DENSE VECTOR SEMANTIC MEMORY
// Component 1007 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// SEMANTIC_SIMILARITY != FACTUAL_TRUTH
// EMBEDDING_SCORE != AUTHORIZATION
// VECTOR_MATCH != MEMORY_PROMOTION
// USER_STOP > ALL_MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// FAIL_CLOSED_ON_MALFORMED_VECTOR == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE
// LOCAL_EMBEDDING_PATH_HAS_ZERO_CLOUD_FALLBACK == TRUE
export * from './semanticMemoryTypes.js';
export * from './vectorMathEngine.js';
export * from './embeddingVectorValidator.js';
export * from './localEmbeddingProvider.js';
export * from './nativeVectorIndex.js';
export * from './semanticMemoryPersistence.js';
export * from './hybridMemoryRetrievalEngine.js';
export * from './semanticMemoryProjectionEngine.js';
export * from './semanticMemoryRecovery.js';
