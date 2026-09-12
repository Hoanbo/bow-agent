import type { ObservabilityContradictionRecord } from '../observability/observabilityTypes.js';
import type { AgentDiagnosticAssertion, DiagnosisContradictionResult } from './diagnosisTypes.js';
export declare class DiagnosisContradictionEngine {
    static readonly CONTRADICTION_CONFIDENCE_CAP = 0.4;
    /**
     * Evaluates a set of multi-agent diagnostic assertions and existing observability contradictions.
     * Preserves all dissenting views without majority filtering.
     * Đánh giá tập hợp các khẳng định chẩn đoán đa tác nhân và các mâu thuẫn quan sát hiện có.
     * Bảo toàn mọi quan điểm dị ý mà không lọc theo đa số.
     */
    evaluateAssertions(assertions: readonly AgentDiagnosticAssertion[], observabilityContradictions?: readonly ObservabilityContradictionRecord[]): DiagnosisContradictionResult;
}
export declare const globalDiagnosisContradictionEngine: DiagnosisContradictionEngine;
