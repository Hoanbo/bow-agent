// src/core/semanticMemory/semanticMemoryTypes.ts
// BOWCON V4.0 — MS-1.5.03: SEMANTIC MEMORY & DENSE VECTOR TYPES
// Component 998 — REAL
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
import crypto from 'node:crypto';
export const SEMANTIC_MEMORY_SCHEMA_VERSION = 1;
export const MAX_VECTOR_DIMENSIONS = 4096;
export const MIN_VECTOR_DIMENSIONS = 16;
export const MAX_INDEX_ENTRIES = 10000;
export const MAX_SEMANTIC_PAYLOAD_BYTES = 512 * 1024; // 512 KB per partition
// ============================================================================
// 1. ERROR TAXONOMY
// ============================================================================
export class SemanticMemoryError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.name = 'SemanticMemoryError';
        this.code = code;
        this.details = details ? Object.freeze({ ...details }) : undefined;
    }
}
export class EmbeddingValidationError extends SemanticMemoryError {
    validationErrors;
    constructor(message, errors = [], details) {
        super('EMBEDDING_VALIDATION_ERROR', `${message}: ${errors.join('; ')}`, { errors, ...details });
        this.name = 'EmbeddingValidationError';
        this.validationErrors = Object.freeze([...errors]);
    }
}
export class VectorMathError extends SemanticMemoryError {
    constructor(message, details) {
        super('VECTOR_MATH_ERROR', message, details);
        this.name = 'VectorMathError';
    }
}
export class VectorIndexCapacityError extends SemanticMemoryError {
    constructor(currentCount, maxCount) {
        super('VECTOR_INDEX_CAPACITY_ERROR', `Vector index capacity exceeded: current ${currentCount} entries, maximum allowed is ${maxCount}`, { currentCount, maxCount });
        this.name = 'VectorIndexCapacityError';
    }
}
export class IncompatibleVectorSpaceError extends SemanticMemoryError {
    constructor(modelA, dimA, modelB, dimB) {
        super('INCOMPATIBLE_VECTOR_SPACE_ERROR', `Cannot compare vectors across incompatible vector spaces: [${modelA} (${dimA}d)] vs [${modelB} (${dimB}d)]`, { modelA, dimA, modelB, dimB });
        this.name = 'IncompatibleVectorSpaceError';
    }
}
export class CrossTenantSemanticMemoryError extends SemanticMemoryError {
    constructor(requestedTenant, activeTenant) {
        super('CROSS_TENANT_SEMANTIC_MEMORY_ERROR', `Security violation: cross-tenant access blocked between requested '${requestedTenant}' and active '${activeTenant}'`, { requestedTenant, activeTenant });
        this.name = 'CrossTenantSemanticMemoryError';
    }
}
export class SemanticMemoryUserStopError extends SemanticMemoryError {
    constructor(checkpoint) {
        super('SEMANTIC_MEMORY_USER_STOP_ERROR', `Semantic memory mutation preempted at checkpoint '${checkpoint}' because USER_STOP is active`, { checkpoint });
        this.name = 'SemanticMemoryUserStopError';
    }
}
export class SemanticMemoryPersistenceError extends SemanticMemoryError {
    constructor(message, details) {
        super('SEMANTIC_MEMORY_PERSISTENCE_ERROR', message, details);
        this.name = 'SemanticMemoryPersistenceError';
    }
}
export class SemanticMemoryIntegrityError extends SemanticMemoryError {
    constructor(message, details) {
        super('SEMANTIC_MEMORY_INTEGRITY_ERROR', message, details);
        this.name = 'SemanticMemoryIntegrityError';
    }
}
export class SemanticMemoryValidationError extends SemanticMemoryError {
    constructor(message, details) {
        super('SEMANTIC_MEMORY_VALIDATION_ERROR', message, details);
        this.name = 'SemanticMemoryValidationError';
    }
}
export class SemanticMemoryCoTProhibitedError extends SemanticMemoryError {
    constructor(message, details) {
        super('SEMANTIC_MEMORY_COT_PROHIBITED_ERROR', message, details);
        this.name = 'SemanticMemoryCoTProhibitedError';
    }
}
export class SemanticMemorySecurityError extends SemanticMemoryError {
    constructor(message, details) {
        super('SEMANTIC_MEMORY_SECURITY_ERROR', message, details);
        this.name = 'SemanticMemorySecurityError';
    }
}
// ============================================================================
// 3. CANONICALIZATION & PROVENANCE UTILITIES
// ============================================================================
const PROHIBITED_COT_KEYS = new Set([
    'internalreasoning',
    'chainofthought',
    'scratchpad',
    'scratchpadtokens',
    'privatedeliberation',
    'hiddenthoughts',
    'thoughtlog',
    'internalmonologue',
    'modelthinking',
]);
/**
 * Validates that an object key is safe against prototype pollution.
 */
export function isSafeObjectKey(key) {
    if (typeof key !== 'string')
        return false;
    const k = key.trim().toLowerCase();
    return k !== '__proto__' && k !== 'constructor' && k !== 'prototype';
}
/**
 * Validates that an object or text contains no raw chain-of-thought tokens or keys.
 * Throws SemanticMemoryCoTProhibitedError if prohibited reasoning traces are detected,
 * or SemanticMemorySecurityError if prototype pollution keys are encountered.
 */
export function assertNoChainOfThought(val, path = '') {
    if (val === null || val === undefined)
        return;
    if (typeof val === 'string') {
        const lower = val.toLowerCase();
        if (lower.includes('<thought>') ||
            lower.includes('</thought>') ||
            lower.includes('[internal deliberation]') ||
            lower.includes('[scratchpad]') ||
            lower.includes('internal reason')) {
            throw new SemanticMemoryCoTProhibitedError(`Raw chain-of-thought tokens detected in text at '${path}'`, { path });
        }
        return;
    }
    if (Array.isArray(val)) {
        val.forEach((item, idx) => assertNoChainOfThought(item, `${path}[${idx}]`));
        return;
    }
    if (typeof val === 'object') {
        for (const key of Object.getOwnPropertyNames(val)) {
            if (!isSafeObjectKey(key)) {
                throw new SemanticMemorySecurityError(`Prototype pollution key detected: '${key}' at '${path}'`, { key, path });
            }
            const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
            if (PROHIBITED_COT_KEYS.has(lowerKey)) {
                throw new SemanticMemoryCoTProhibitedError(`Prohibited reasoning key detected at '${path}.${key}'`, { key, path });
            }
            assertNoChainOfThought(val[key], `${path}.${key}`);
        }
    }
}
export const assertNoProhibitedReasoning = assertNoChainOfThought;
/**
 * Computes deterministic SHA-256 content hash of sanitized canonical text.
 */
export function computeContentHash(canonicalText) {
    return crypto.createHash('sha256').update((canonicalText || '').trim(), 'utf8').digest('hex');
}
/**
 * Computes deterministic provenance hash for an individual semantic memory projection.
 */
export function computeProvenanceHash(memoryId, tenantId, modelId, contentHash) {
    return crypto
        .createHash('sha256')
        .update(`${memoryId}:${tenantId}:${modelId}:${contentHash}`, 'utf8')
        .digest('hex');
}
/**
 * Computes deterministic provenance hash for a semantic index partition.
 */
export function computeIndexProvenanceHash(doc) {
    const material = {
        schemaVersion: doc.schemaVersion,
        tenantId: doc.tenantId,
        modelId: doc.modelId,
        dimension: doc.dimension,
        indexVersion: doc.indexVersion,
        recordIds: doc.entries.map((e) => `${e.memoryId}:${e.contentHash}`).sort(),
        lastUpdatedAt: doc.lastUpdatedAt,
    };
    return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}
