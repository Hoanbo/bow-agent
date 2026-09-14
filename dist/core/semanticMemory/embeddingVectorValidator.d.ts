import { type EmbeddingVectorDescriptor } from './semanticMemoryTypes.js';
export declare class EmbeddingVectorValidator {
    /**
     * Validates that an array represents a well-formed dense numeric vector.
     * Checks for finite numbers, expected dimension, non-empty, and absence of NaN/Infinity.
     */
    static validateRawVector(values: readonly number[], expectedDimension?: number): void;
    /**
     * Validates a complete EmbeddingVectorDescriptor.
     */
    static validateDescriptor(descriptor: EmbeddingVectorDescriptor): void;
    /**
     * Asserts that two vector descriptors belong to compatible vector spaces
     * (same model identity and same dimensions).
     */
    static assertCompatibleVectorSpaces(a: EmbeddingVectorDescriptor, b: EmbeddingVectorDescriptor): void;
}
