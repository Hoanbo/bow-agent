/**
 * EN: Centralized decision confidence thresholds.
 * VI: Các ngưỡng độ tin cậy quyết định tập trung.
 */
export declare const DECISION_THRESHOLDS: Readonly<{
    /** EN: Highly confident threshold (>= 0.95) | VI: Ngưỡng độ tin cậy rất cao */
    highlyConfident: 0.95;
    /** EN: Confident threshold (>= 0.80) | VI: Ngưỡng tự tin */
    confident: 0.8;
    /** EN: Uncertain threshold (0.60) | VI: Ngưỡng không chắc chắn */
    uncertain: 0.6;
    /** EN: Low confidence threshold (0.40) | VI: Ngưỡng độ tin cậy thấp */
    lowConfidence: 0.4;
    /** EN: Minimum confidence required to propose an action without clarification | VI: Ngưỡng tối thiểu để đề xuất action mà không cần làm rõ */
    clarification: 0.4;
    /** EN: Maximum score delta to consider two candidates tied | VI: Biên độ điểm tối đa để coi hai candidate là hòa điểm (tie) */
    tieDelta: 0.02;
}>;
/**
 * EN: Clamps a numeric confidence value strictly to the range [0.0, 1.0].
 * VI: Khống chế giá trị độ tin cậy một cách chặt chẽ trong khoảng [0.0, 1.0].
 */
export declare function bounded(value: number): number;
/**
 * EN: Qualitative classification of a numerical confidence score.
 * VI: Phân loại định tính cho điểm số tin cậy bằng số.
 */
export type ConfidenceTier = 'HIGHLY_CONFIDENT' | 'CONFIDENT' | 'UNCERTAIN' | 'LOW' | 'INSUFFICIENT';
/**
 * EN: Returns qualitative tier for a given confidence score.
 * VI: Trả về phân hạng định tính cho một điểm số tin cậy.
 */
export declare function classifyConfidence(confidence: number): ConfidenceTier;
