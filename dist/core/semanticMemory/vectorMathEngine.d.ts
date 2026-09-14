export declare class VectorMathEngine {
    /**
     * Computes the Euclidean norm (L2 norm) of a vector.
     */
    static norm(v: readonly number[]): number;
    /**
     * Alias for norm(v) to satisfy L2 norm contract.
     */
    static l2Norm(v: readonly number[]): number;
    /**
     * Computes the dot product of two vectors of equal dimension.
     */
    static dotProduct(a: readonly number[], b: readonly number[]): number;
    /**
     * Normalizes a vector to unit length (L2 norm = 1.0).
     * If vector magnitude is zero or negligible, returns a zero vector safely.
     */
    static normalize(v: readonly number[]): readonly number[];
    /**
     * Computes mathematical Cosine Similarity between two vectors:
     * (A · B) / (||A|| * ||B||)
     * Handles zero vectors safely by returning 0.0 (no divide-by-zero).
     * Result is mathematically bounded in [-1.0, 1.0].
     */
    static cosineSimilarity(a: readonly number[], b: readonly number[]): number;
    /**
     * Computes normalized cosine similarity mapped to [0.0, 1.0] range.
     */
    static normalizedCosineSimilarity(a: readonly number[], b: readonly number[]): number;
}
