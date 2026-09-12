import { type ArchivedIncidentRecord, type HypothesisOutcomeSource, type HypothesisReliabilityScore } from './crossIncidentTypes.js';
export interface HypothesisOutcomeCounts {
    supported: number;
    partiallySupported: number;
    refuted: number;
    inconclusive: number;
}
export declare class HypothesisReliabilityLedger {
    static readonly MINIMUM_PUBLICATION_SAMPLE_SIZE = 3;
    private readonly ledger;
    /**
     * Records a single hypothesis outcome into the historical ledger.
     * Ghi nhận một kết quả giả thuyết vào sổ cái lịch sử.
     */
    recordOutcome(hypothesisType: string, outcome: HypothesisOutcomeSource): void;
    /**
     * Ingests hypothesis accuracy records from a collection of archived incidents dynamically.
     * Nhập các bản ghi độ chính xác giả thuyết từ tập hợp các sự cố đã lưu trữ một cách linh hoạt.
     */
    ingestFromArchivedRecords(records: readonly ArchivedIncidentRecord[]): void;
    /**
     * Computes the reliability score for a given hypothesis type.
     * Enforces N >= 3 publication rule; N < 3 returns status INSUFFICIENT_SAMPLE_SIZE.
     * Tính toán điểm độ tin cậy cho một loại giả thuyết nhất định.
     * Thực thi quy tắc công bố N >= 3; N < 3 trả về trạng thái INSUFFICIENT_SAMPLE_SIZE.
     */
    getReliability(hypothesisType: string): HypothesisReliabilityScore | null;
    /**
     * Returns all evaluated reliability scores across registered hypothesis types.
     * Trả về tất cả các điểm độ tin cậy đã đánh giá qua các loại giả thuyết đã đăng ký.
     */
    getAllScores(): readonly HypothesisReliabilityScore[];
    /**
     * Resets in-memory accumulation.
     * Đặt lại sự tích lũy trong bộ nhớ.
     */
    reset(): void;
}
