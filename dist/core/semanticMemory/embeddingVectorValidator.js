// src/core/semanticMemory/embeddingVectorValidator.ts
// BOWCON V4.0 — MS-1.5.03: EMBEDDING VECTOR VALIDATOR
// Component 1000 — REAL
//
// Invariants:
// FAIL_CLOSED_ON_MALFORMED_VECTOR == TRUE
// ZERO_TOLERANCE_FOR_NAN_OR_INFINITY == TRUE
// STRICT_DIMENSION_VERIFICATION == TRUE
// MODEL_VECTOR_SPACE_ISOLATION == TRUE
import { MAX_VECTOR_DIMENSIONS, MIN_VECTOR_DIMENSIONS, EmbeddingValidationError, IncompatibleVectorSpaceError, } from './semanticMemoryTypes.js';
export class EmbeddingVectorValidator {
    /**
     * Validates that an array represents a well-formed dense numeric vector.
     * Checks for finite numbers, expected dimension, non-empty, and absence of NaN/Infinity.
     */
    static validateRawVector(values, expectedDimension) {
        if (!Array.isArray(values)) {
            throw new EmbeddingValidationError('Vector must be an array of numbers', ['INVALID_VECTOR_TYPE']);
        }
        if (values.length < MIN_VECTOR_DIMENSIONS || values.length > MAX_VECTOR_DIMENSIONS) {
            throw new EmbeddingValidationError(`Vector length ${values.length} violates bounds [${MIN_VECTOR_DIMENSIONS}, ${MAX_VECTOR_DIMENSIONS}]`, ['DIMENSION_OUT_OF_BOUNDS']);
        }
        if (expectedDimension !== undefined && values.length !== expectedDimension) {
            throw new EmbeddingValidationError(`Vector dimension mismatch: expected ${expectedDimension} but found ${values.length}`, ['DIMENSION_MISMATCH']);
        }
        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            if (typeof v !== 'number' || !Number.isFinite(v) || Number.isNaN(v)) {
                throw new EmbeddingValidationError(`Vector contains invalid numeric element at index ${i}: ${v}`, ['NON_FINITE_ELEMENT']);
            }
        }
    }
    /**
     * Validates a complete EmbeddingVectorDescriptor.
     */
    static validateDescriptor(descriptor) {
        if (!descriptor || typeof descriptor !== 'object') {
            throw new EmbeddingValidationError('Embedding descriptor must be an object', ['NULL_DESCRIPTOR']);
        }
        if (!descriptor.vectorId || typeof descriptor.vectorId !== 'string') {
            throw new EmbeddingValidationError('Descriptor must have a non-empty vectorId', ['INVALID_VECTOR_ID']);
        }
        if (!descriptor.providerId || typeof descriptor.providerId !== 'string') {
            throw new EmbeddingValidationError('Descriptor must have a non-empty providerId', ['INVALID_PROVIDER_ID']);
        }
        if (!descriptor.modelId || typeof descriptor.modelId !== 'string') {
            throw new EmbeddingValidationError('Descriptor must have a non-empty modelId', ['INVALID_MODEL_ID']);
        }
        if (typeof descriptor.dimension !== 'number' || descriptor.dimension <= 0) {
            throw new EmbeddingValidationError('Descriptor must specify positive numeric dimension', ['INVALID_DIMENSION']);
        }
        if (!descriptor.contentHash || typeof descriptor.contentHash !== 'string' || descriptor.contentHash.length !== 64) {
            throw new EmbeddingValidationError('Descriptor must contain a 64-character SHA-256 contentHash', ['INVALID_CONTENT_HASH']);
        }
        this.validateRawVector(descriptor.values, descriptor.dimension);
    }
    /**
     * Asserts that two vector descriptors belong to compatible vector spaces
     * (same model identity and same dimensions).
     */
    static assertCompatibleVectorSpaces(a, b) {
        if (a.dimension !== b.dimension || a.modelId !== b.modelId) {
            throw new IncompatibleVectorSpaceError(a.modelId, a.dimension, b.modelId, b.dimension);
        }
    }
}
