// src/core/crossIncident/remediationReliabilityTracker.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Governed stratified remediation reliability tracker.
// Strictly enforces stratification by (targetId, failureCategory, actionClass)
// to eliminate Simpson's paradox risk across heterogeneous operational environments.
// GLOBAL UNSTRATIFIED EFFECTIVENESS IS STRICTLY FORBIDDEN.
// Trình theo dõi độ tin cậy khắc phục được phân tầng có quản trị.
// Thực thi nghiêm ngặt phân tầng theo (targetId, failureCategory, actionClass)
// để loại trừ rủi ro nghịch lý Simpson giữa các môi trường vận hành không đồng nhất.
// TUYỆT ĐỐI CẤM HIỆU QUẢ TOÀN CẦU CHƯA PHÂN TẦNG.
export class RemediationReliabilityTracker {
    // Stratified storage: serializedKey -> StratifiedAccumulator
    stratifiedData = new Map();
    /**
     * Serializes the mandatory stratification key tuple: (targetId, failureCategory, actionClass).
     * Chuỗi hóa bộ ba khóa phân tầng bắt buộc: (targetId, failureCategory, actionClass).
     */
    serializeKey(key) {
        return `${key.targetId}::${key.failureCategory}::${key.actionClass}`;
    }
    /**
     * Deserializes key back into structured tuple.
     * Giải chuỗi khóa trở lại thành bộ ba có cấu trúc.
     */
    deserializeKey(serialized) {
        const parts = serialized.split('::');
        return {
            targetId: parts[0],
            failureCategory: parts[1],
            actionClass: parts[2],
        };
    }
    /**
     * Ingests an archived incident record and updates the strictly stratified metrics.
     * Nhập một bản ghi sự cố đã lưu trữ và cập nhật các chỉ số phân tầng nghiêm ngặt.
     */
    recordOutcome(record) {
        if (!record.targetId || !record.failureCategory || !record.actionClass) {
            throw new Error('STRATIFICATION_VIOLATION: targetId, failureCategory, and actionClass are mandatory');
        }
        const key = {
            targetId: record.targetId,
            failureCategory: record.failureCategory,
            actionClass: record.actionClass,
        };
        const serialized = this.serializeKey(key);
        const current = this.stratifiedData.get(serialized) ?? {
            sampleCount: 0,
            successfulOutcomes: 0,
            rollbackOutcomes: 0,
            totalRecoveryTimeMs: 0,
        };
        current.sampleCount++;
        if (record.closureRecord.status === 'CLOSED_RESOLVED') {
            current.successfulOutcomes++;
        }
        else if (record.closureRecord.status === 'CLOSED_ROLLED_BACK') {
            current.rollbackOutcomes++;
        }
        const mttr = record.effectivenessMetrics.meanTimeToRecoveryMs || record.effectivenessMetrics.timeToSteadyStateMs || 0;
        current.totalRecoveryTimeMs += mttr;
        this.stratifiedData.set(serialized, current);
    }
    /**
     * Ingests multiple archived records in bulk.
     * Nhập hàng loạt nhiều bản ghi sự cố đã lưu trữ.
     */
    ingestRecords(records) {
        for (const record of records) {
            this.recordOutcome(record);
        }
    }
    /**
     * Retrieves the stratified reliability metrics for a specific (targetId, failureCategory, actionClass) tuple.
     * Returns null if no observations exist for this exact stratum.
     * Lấy các chỉ số độ tin cậy phân tầng cho một bộ ba cụ thể (targetId, failureCategory, actionClass).
     * Trả về null nếu không có quan sát nào cho phân tầng chính xác này.
     */
    getStratifiedReliability(key) {
        const serialized = this.serializeKey(key);
        const accum = this.stratifiedData.get(serialized);
        if (!accum || accum.sampleCount === 0) {
            return null;
        }
        const successRate = Math.round((accum.successfulOutcomes / accum.sampleCount) * 1000) / 1000;
        const rollbackRate = Math.round((accum.rollbackOutcomes / accum.sampleCount) * 1000) / 1000;
        const mttr = Math.round(accum.totalRecoveryTimeMs / accum.sampleCount);
        return {
            key: Object.freeze({ ...key }),
            sampleCount: accum.sampleCount,
            successfulOutcomes: accum.successfulOutcomes,
            rollbackOutcomes: accum.rollbackOutcomes,
            successRate,
            rollbackRate,
            meanTimeToRecoveryMs: mttr,
            evaluatedAt: Date.now(),
        };
    }
    /**
     * Retrieves all evaluated stratified records.
     * Every record is strictly stratified; global unstratified collapsing is forbidden.
     * Lấy tất cả các bản ghi phân tầng đã đánh giá.
     * Mọi bản ghi đều được phân tầng nghiêm ngặt; nghiêm cấm việc gộp chung toàn cầu.
     */
    getAllStratifiedRecords() {
        const results = [];
        for (const serialized of this.stratifiedData.keys()) {
            const key = this.deserializeKey(serialized);
            const record = this.getStratifiedReliability(key);
            if (record) {
                results.push(record);
            }
        }
        return Object.freeze(results);
    }
    /**
     * Explicitly forbidden method guard: prevent global aggregation.
     * Phản hồi ngăn chặn phương thức bị cấm: ngăn chặn việc tổng hợp toàn cầu.
     */
    getGlobalEffectivenessScore() {
        throw new Error('FORBIDDEN_UNSTRATIFIED_QUERY: Global unstratified effectiveness is strictly forbidden to prevent Simpsons paradox.');
    }
    /**
     * Resets internal tracker.
     * Đặt lại bộ theo dõi nội bộ.
     */
    reset() {
        this.stratifiedData.clear();
    }
}
