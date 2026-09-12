import { type ArchivedIncidentRecord, type StratifiedRemediationKey, type RemediationReliabilityRecord } from './crossIncidentTypes.js';
export declare class RemediationReliabilityTracker {
    private readonly stratifiedData;
    /**
     * Serializes the mandatory stratification key tuple: (targetId, failureCategory, actionClass).
     * Chuỗi hóa bộ ba khóa phân tầng bắt buộc: (targetId, failureCategory, actionClass).
     */
    serializeKey(key: StratifiedRemediationKey): string;
    /**
     * Deserializes key back into structured tuple.
     * Giải chuỗi khóa trở lại thành bộ ba có cấu trúc.
     */
    deserializeKey(serialized: string): StratifiedRemediationKey;
    /**
     * Ingests an archived incident record and updates the strictly stratified metrics.
     * Nhập một bản ghi sự cố đã lưu trữ và cập nhật các chỉ số phân tầng nghiêm ngặt.
     */
    recordOutcome(record: ArchivedIncidentRecord): void;
    /**
     * Ingests multiple archived records in bulk.
     * Nhập hàng loạt nhiều bản ghi sự cố đã lưu trữ.
     */
    ingestRecords(records: readonly ArchivedIncidentRecord[]): void;
    /**
     * Retrieves the stratified reliability metrics for a specific (targetId, failureCategory, actionClass) tuple.
     * Returns null if no observations exist for this exact stratum.
     * Lấy các chỉ số độ tin cậy phân tầng cho một bộ ba cụ thể (targetId, failureCategory, actionClass).
     * Trả về null nếu không có quan sát nào cho phân tầng chính xác này.
     */
    getStratifiedReliability(key: StratifiedRemediationKey): RemediationReliabilityRecord | null;
    /**
     * Retrieves all evaluated stratified records.
     * Every record is strictly stratified; global unstratified collapsing is forbidden.
     * Lấy tất cả các bản ghi phân tầng đã đánh giá.
     * Mọi bản ghi đều được phân tầng nghiêm ngặt; nghiêm cấm việc gộp chung toàn cầu.
     */
    getAllStratifiedRecords(): readonly RemediationReliabilityRecord[];
    /**
     * Explicitly forbidden method guard: prevent global aggregation.
     * Phản hồi ngăn chặn phương thức bị cấm: ngăn chặn việc tổng hợp toàn cầu.
     */
    getGlobalEffectivenessScore(): never;
    /**
     * Resets internal tracker.
     * Đặt lại bộ theo dõi nội bộ.
     */
    reset(): void;
}
