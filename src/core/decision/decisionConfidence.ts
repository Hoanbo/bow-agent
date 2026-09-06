// src/core/decision/decisionConfidence.ts
// BOWCON V4.0 — MILESTONE 1.3.10: DECISION CONFIDENCE MODEL
//
// EN:
// Centralized confidence thresholds and bounding functions.
// Guarantees all confidence values remain deterministically bounded within [0.0, 1.0]
// without pseudo-random numbers or artificial precision.
//
// VI:
// Các ngưỡng tin cậy tập trung và hàm giới hạn biên.
// Đảm bảo tất cả giá trị độ tin cậy được chặn tất định trong [0.0, 1.0]
// mà không dùng số ngẫu nhiên giả tạo hay độ chính xác giả mạo.

/**
 * EN: Centralized decision confidence thresholds.
 * VI: Các ngưỡng độ tin cậy quyết định tập trung.
 */
export const DECISION_THRESHOLDS = Object.freeze({
  /** EN: Highly confident threshold (>= 0.95) | VI: Ngưỡng độ tin cậy rất cao */
  highlyConfident: 0.95,
  /** EN: Confident threshold (>= 0.80) | VI: Ngưỡng tự tin */
  confident: 0.80,
  /** EN: Uncertain threshold (0.60) | VI: Ngưỡng không chắc chắn */
  uncertain: 0.60,
  /** EN: Low confidence threshold (0.40) | VI: Ngưỡng độ tin cậy thấp */
  lowConfidence: 0.40,
  /** EN: Minimum confidence required to propose an action without clarification | VI: Ngưỡng tối thiểu để đề xuất action mà không cần làm rõ */
  clarification: 0.40,
  /** EN: Maximum score delta to consider two candidates tied | VI: Biên độ điểm tối đa để coi hai candidate là hòa điểm (tie) */
  tieDelta: 0.02,
});

/**
 * EN: Clamps a numeric confidence value strictly to the range [0.0, 1.0].
 * VI: Khống chế giá trị độ tin cậy một cách chặt chẽ trong khoảng [0.0, 1.0].
 */
export function bounded(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return Math.round(value * 10000) / 10000;
}

/**
 * EN: Qualitative classification of a numerical confidence score.
 * VI: Phân loại định tính cho điểm số tin cậy bằng số.
 */
export type ConfidenceTier = 'HIGHLY_CONFIDENT' | 'CONFIDENT' | 'UNCERTAIN' | 'LOW' | 'INSUFFICIENT';

/**
 * EN: Returns qualitative tier for a given confidence score.
 * VI: Trả về phân hạng định tính cho một điểm số tin cậy.
 */
export function classifyConfidence(confidence: number): ConfidenceTier {
  const c = bounded(confidence);
  if (c >= DECISION_THRESHOLDS.highlyConfident) return 'HIGHLY_CONFIDENT';
  if (c >= DECISION_THRESHOLDS.confident) return 'CONFIDENT';
  if (c >= DECISION_THRESHOLDS.uncertain) return 'UNCERTAIN';
  if (c >= DECISION_THRESHOLDS.lowConfidence) return 'LOW';
  return 'INSUFFICIENT';
}
