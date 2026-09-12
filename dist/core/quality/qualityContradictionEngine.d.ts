import { type QualityContradictionRecord, type BuildExecutionResult, type TestExecutionResult, type QualityGateEvaluation } from './qualityTypes.js';
export declare class QualityContradictionEngine {
    private readonly contradictionRecords;
    /**
     * Compares two or more build execution results for conflicting outcomes.
     * So sánh hai hoặc nhiều kết quả thực thi bản dựng để tìm kết quả xung đột.
     */
    detectBuildContradictions(results: readonly BuildExecutionResult[]): readonly QualityContradictionRecord[];
    /**
     * Compares two or more test execution results for conflicting outcomes.
     * So sánh hai hoặc nhiều kết quả thực thi kiểm thử để tìm kết quả xung đột.
     */
    detectTestContradictions(results: readonly TestExecutionResult[]): readonly QualityContradictionRecord[];
    /**
     * Compares two or more gate evaluations for conflicting overall outcomes.
     * So sánh hai hoặc nhiều đánh giá cổng để tìm kết quả tổng thể xung đột.
     */
    detectGateContradictions(evaluations: readonly QualityGateEvaluation[]): readonly QualityContradictionRecord[];
    /**
     * Returns all recorded contradiction records.
     * Trả về tất cả các bản ghi mâu thuẫn đã ghi nhận.
     */
    getRecordedContradictions(): readonly QualityContradictionRecord[];
}
