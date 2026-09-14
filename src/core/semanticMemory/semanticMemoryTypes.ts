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
  public readonly code: string;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = 'SemanticMemoryError';
    this.code = code;
    this.details = details ? Object.freeze({ ...details }) : undefined;
  }
}

export class EmbeddingValidationError extends SemanticMemoryError {
  public readonly validationErrors: readonly string[];
  constructor(message: string, errors: string[] = [], details?: Record<string, unknown>) {
    super('EMBEDDING_VALIDATION_ERROR', `${message}: ${errors.join('; ')}`, { errors, ...details });
    this.name = 'EmbeddingValidationError';
    this.validationErrors = Object.freeze([...errors]);
  }
}

export class VectorMathError extends SemanticMemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VECTOR_MATH_ERROR', message, details);
    this.name = 'VectorMathError';
  }
}

export class VectorIndexCapacityError extends SemanticMemoryError {
  constructor(currentCount: number, maxCount: number) {
    super(
      'VECTOR_INDEX_CAPACITY_ERROR',
      `Vector index capacity exceeded: current ${currentCount} entries, maximum allowed is ${maxCount}`,
      { currentCount, maxCount }
    );
    this.name = 'VectorIndexCapacityError';
  }
}

export class IncompatibleVectorSpaceError extends SemanticMemoryError {
  constructor(modelA: string, dimA: number, modelB: string, dimB: number) {
    super(
      'INCOMPATIBLE_VECTOR_SPACE_ERROR',
      `Cannot compare vectors across incompatible vector spaces: [${modelA} (${dimA}d)] vs [${modelB} (${dimB}d)]`,
      { modelA, dimA, modelB, dimB }
    );
    this.name = 'IncompatibleVectorSpaceError';
  }
}

export class CrossTenantSemanticMemoryError extends SemanticMemoryError {
  constructor(requestedTenant: string, activeTenant: string) {
    super(
      'CROSS_TENANT_SEMANTIC_MEMORY_ERROR',
      `Security violation: cross-tenant access blocked between requested '${requestedTenant}' and active '${activeTenant}'`,
      { requestedTenant, activeTenant }
    );
    this.name = 'CrossTenantSemanticMemoryError';
  }
}

export class SemanticMemoryUserStopError extends SemanticMemoryError {
  constructor(checkpoint: string) {
    super(
      'SEMANTIC_MEMORY_USER_STOP_ERROR',
      `Semantic memory mutation preempted at checkpoint '${checkpoint}' because USER_STOP is active`,
      { checkpoint }
    );
    this.name = 'SemanticMemoryUserStopError';
  }
}

export class SemanticMemoryPersistenceError extends SemanticMemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('SEMANTIC_MEMORY_PERSISTENCE_ERROR', message, details);
    this.name = 'SemanticMemoryPersistenceError';
  }
}

export class SemanticMemoryIntegrityError extends SemanticMemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('SEMANTIC_MEMORY_INTEGRITY_ERROR', message, details);
    this.name = 'SemanticMemoryIntegrityError';
  }
}

export class SemanticMemoryValidationError extends SemanticMemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('SEMANTIC_MEMORY_VALIDATION_ERROR', message, details);
    this.name = 'SemanticMemoryValidationError';
  }
}

export class SemanticMemoryCoTProhibitedError extends SemanticMemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('SEMANTIC_MEMORY_COT_PROHIBITED_ERROR', message, details);
    this.name = 'SemanticMemoryCoTProhibitedError';
  }
}

export class SemanticMemorySecurityError extends SemanticMemoryError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('SEMANTIC_MEMORY_SECURITY_ERROR', message, details);
    this.name = 'SemanticMemorySecurityError';
  }
}

// ============================================================================
// 2. VECTOR & RECORD CONTRACTS
// ============================================================================

export type RetrievalMode = 'HYBRID' | 'SEMANTIC_ONLY' | 'LEXICAL_ONLY' | 'DEGRADED_LEXICAL';

export interface EmbeddingVectorDescriptor {
  readonly vectorId: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly modelVersion: string;
  readonly dimension: number;
  readonly values: readonly number[]; // Normalized dense vector
  readonly contentHash: string; // SHA-256 of canonical text
  readonly createdAt: string;
}

export interface SemanticMemoryRecord {
  readonly memoryId: string;
  readonly tenantId: string;
  readonly sessionId?: string;
  readonly sourceDomain: 'EPISODIC' | 'KNOWLEDGE_GRAPH' | 'WORKING_REGISTER' | 'USER_PREFERENCE';
  readonly canonicalText: string;
  readonly contentHash: string; // SHA-256 of canonical text
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
  readonly semanticScore: number; // 0.0 to 1.0
  readonly modelId: string;
  readonly dimension: number;
}

export interface HybridSearchResult {
  readonly memoryId: string;
  readonly tenantId: string;
  readonly sessionId?: string;
  readonly sourceDomain: string;
  readonly canonicalText: string;
  readonly lexicalScore: number; // Normalized 0.0 to 1.0
  readonly semanticScore: number; // Normalized 0.0 to 1.0
  readonly hybridScore: number; // Combined weighted score
  readonly retrievalMode: RetrievalMode;
  readonly matchReasons: readonly string[];
}

export interface HybridRetrievalWeights {
  readonly lexicalWeight: number; // 0.0 to 1.0
  readonly semanticWeight: number; // 0.0 to 1.0
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
export function isSafeObjectKey(key: string): boolean {
  if (typeof key !== 'string') return false;
  const k = key.trim().toLowerCase();
  return k !== '__proto__' && k !== 'constructor' && k !== 'prototype';
}

/**
 * Validates that an object or text contains no raw chain-of-thought tokens or keys.
 * Throws SemanticMemoryCoTProhibitedError if prohibited reasoning traces are detected,
 * or SemanticMemorySecurityError if prototype pollution keys are encountered.
 */
export function assertNoChainOfThought(val: unknown, path = ''): void {
  if (val === null || val === undefined) return;

  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    if (
      lower.includes('<thought>') ||
      lower.includes('</thought>') ||
      lower.includes('[internal deliberation]') ||
      lower.includes('[scratchpad]') ||
      lower.includes('internal reason')
    ) {
      throw new SemanticMemoryCoTProhibitedError(
        `Raw chain-of-thought tokens detected in text at '${path}'`,
        { path }
      );
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
        throw new SemanticMemorySecurityError(
          `Prototype pollution key detected: '${key}' at '${path}'`,
          { key, path }
        );
      }
      const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
      if (PROHIBITED_COT_KEYS.has(lowerKey)) {
        throw new SemanticMemoryCoTProhibitedError(
          `Prohibited reasoning key detected at '${path}.${key}'`,
          { key, path }
        );
      }
      assertNoChainOfThought((val as Record<string, unknown>)[key], `${path}.${key}`);
    }
  }
}

export const assertNoProhibitedReasoning = assertNoChainOfThought;

/**
 * Computes deterministic SHA-256 content hash of sanitized canonical text.
 */
export function computeContentHash(canonicalText: string): string {
  return crypto.createHash('sha256').update((canonicalText || '').trim(), 'utf8').digest('hex');
}

/**
 * Computes deterministic provenance hash for an individual semantic memory projection.
 */
export function computeProvenanceHash(
  memoryId: string,
  tenantId: string,
  modelId: string,
  contentHash: string
): string {
  return crypto
    .createHash('sha256')
    .update(`${memoryId}:${tenantId}:${modelId}:${contentHash}`, 'utf8')
    .digest('hex');
}

/**
 * Computes deterministic provenance hash for a semantic index partition.
 */
export function computeIndexProvenanceHash(doc: Omit<SemanticIndexDocument, 'provenanceHash'>): string {
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
