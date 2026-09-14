// src/core/semanticMemory/vectorMathEngine.ts
// BOWCON V4.0 — MS-1.5.03: VECTOR MATHEMATICS ENGINE
// Component 1001 — REAL
//
// Invariants:
// MATHEMATICAL_PRECISION == TRUE
// ZERO_VECTOR_SAFETY == TRUE
// FINITE_NUMERIC_VALUES_ONLY == TRUE
// COSINE_RANGE_BOUNDED == TRUE

import { VectorMathError } from './semanticMemoryTypes.js';

export class VectorMathEngine {
  /**
   * Computes the Euclidean norm (L2 norm) of a vector.
   */
  public static norm(v: readonly number[]): number {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
      const val = v[i];
      if (!Number.isFinite(val)) {
        throw new VectorMathError(`Vector contains non-finite element at index ${i}: ${val}`);
      }
      sum += val * val;
    }
    return Math.sqrt(sum);
  }

  /**
   * Alias for norm(v) to satisfy L2 norm contract.
   */
  public static l2Norm(v: readonly number[]): number {
    return this.norm(v);
  }

  /**
   * Computes the dot product of two vectors of equal dimension.
   */
  public static dotProduct(a: readonly number[], b: readonly number[]): number {
    if (a.length !== b.length) {
      throw new VectorMathError(`Dimension mismatch in dot product: ${a.length} vs ${b.length}`);
    }

    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      const valA = a[i];
      const valB = b[i];
      if (!Number.isFinite(valA) || !Number.isFinite(valB)) {
        throw new VectorMathError(`Non-finite element detected in dot product at index ${i}`);
      }
      dot += valA * valB;
    }
    return dot;
  }

  /**
   * Normalizes a vector to unit length (L2 norm = 1.0).
   * If vector magnitude is zero or negligible, returns a zero vector safely.
   */
  public static normalize(v: readonly number[]): readonly number[] {
    const mag = this.norm(v);
    if (mag <= 1e-12) {
      return Object.freeze(new Array(v.length).fill(0));
    }

    const normalized = new Array<number>(v.length);
    for (let i = 0; i < v.length; i++) {
      normalized[i] = v[i] / mag;
    }
    return Object.freeze(normalized);
  }

  /**
   * Computes mathematical Cosine Similarity between two vectors:
   * (A · B) / (||A|| * ||B||)
   * Handles zero vectors safely by returning 0.0 (no divide-by-zero).
   * Result is mathematically bounded in [-1.0, 1.0].
   */
  public static cosineSimilarity(a: readonly number[], b: readonly number[]): number {
    if (a.length !== b.length) {
      throw new VectorMathError(`Dimension mismatch in cosine similarity: ${a.length} vs ${b.length}`);
    }

    const normA = this.norm(a);
    const normB = this.norm(b);

    // Zero-vector safety: if either vector has zero magnitude, similarity is 0.0
    if (normA <= 1e-12 || normB <= 1e-12) {
      return 0.0;
    }

    const dot = this.dotProduct(a, b);
    const rawCosine = dot / (normA * normB);

    if (!Number.isFinite(rawCosine)) {
      return 0.0;
    }

    // Clamp to valid mathematical range [-1.0, 1.0]
    const clamped = Math.max(-1.0, Math.min(1.0, rawCosine));
    return Math.round(clamped * 100000) / 100000;
  }

  /**
   * Computes normalized cosine similarity mapped to [0.0, 1.0] range.
   */
  public static normalizedCosineSimilarity(a: readonly number[], b: readonly number[]): number {
    const cos = this.cosineSimilarity(a, b);
    return Math.max(0.0, Math.min(1.0, (cos + 1.0) / 2.0));
  }
}
