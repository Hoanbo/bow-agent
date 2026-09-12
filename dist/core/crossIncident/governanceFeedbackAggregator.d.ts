import { type ArchivedIncidentRecord, type PolicyRefinementAdvisory } from './crossIncidentTypes.js';
export declare class GovernanceFeedbackAggregator {
    private readonly outcomeMap;
    /**
     * Records an observed supervisory interaction outcome.
     * Ghi nhận một kết quả tương tác giám sát đã quan sát.
     */
    recordSupervisoryOutcome(targetScope: string, outcome: 'APPROVAL' | 'DENIAL' | 'OVERRIDE'): void;
    /**
     * Ingests closure records and post-mortems from archived incidents.
     * Nhập các bản ghi đóng sự cố và hậu kiểm từ các sự cố đã lưu trữ.
     */
    ingestFromArchivedRecords(records: readonly ArchivedIncidentRecord[]): void;
    /**
     * Generates a non-mutating policy refinement advisory for a target scope.
     * STRICTLY ADVISORY: Emits invariant notice POLICY_RECOMMENDATION != POLICY_MUTATION.
     * Never mutates PDP rules, gate thresholds, or authorization engines.
     * Tạo khuyến nghị tư vấn tinh chỉnh chính sách không biến đổi cho một phạm vi mục tiêu.
     * NGHIÊM NGẶT TƯ VẤN: Phát cảnh báo bất biến POLICY_RECOMMENDATION != POLICY_MUTATION.
     * Tuyệt đối không biến đổi quy tắc PDP, ngưỡng cổng hay động cơ ủy quyền.
     */
    generateAdvisory(targetScope: string, actionClass: string): PolicyRefinementAdvisory;
    /**
     * Resets outcome aggregator state.
     * Đặt lại trạng thái bộ tổng hợp kết quả.
     */
    reset(): void;
}
