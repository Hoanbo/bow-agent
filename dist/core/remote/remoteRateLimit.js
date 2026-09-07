// src/core/remote/remoteRateLimit.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE RATE LIMIT & QUOTA CLASSIFIER
//
// EN:
// Authoritative data-only rate and quota classification model.
// Classifies requests into NORMAL, ELEVATED, HIGH, SATURATED, BLOCKED.
// Fails closed on saturation; zero silent dropping of protocol messages.
//
// VI:
// Mô hình phân loại hạn mức và giới hạn tốc độ thuần dữ liệu có thẩm quyền.
// Phân loại các yêu cầu thành NORMAL, ELEVATED, HIGH, SATURATED, BLOCKED.
// Thất bại đóng an toàn khi bão hòa; không bao giờ âm thầm loại bỏ thông điệp.
import { fnv1aHex } from './remoteFingerprint.js';
import { deepFreeze } from './remoteValidator.js';
export const DEFAULT_MAX_REMOTE_CAPACITY = 1000;
/**
 * EN: Determines rate limit state based on request count vs maximum capacity.
 * VI: Xác định trạng thái giới hạn tốc độ dựa trên số lượng yêu cầu so với dung lượng tối đa.
 */
export function classifyRemoteRateLimit(requestCount, maxCapacity = DEFAULT_MAX_REMOTE_CAPACITY) {
    if (maxCapacity <= 0 || requestCount >= maxCapacity) {
        return 'BLOCKED';
    }
    const ratio = requestCount / maxCapacity;
    if (ratio >= 0.9)
        return 'SATURATED';
    if (ratio >= 0.75)
        return 'HIGH';
    if (ratio >= 0.5)
        return 'ELEVATED';
    return 'NORMAL';
}
/**
 * EN: Computes immutable rate metrics snapshot.
 * VI: Tính toán snapshot chỉ số tốc độ bất biến.
 */
export function computeRemoteRateMetrics(params) {
    const max = params.maxCapacity ?? DEFAULT_MAX_REMOTE_CAPACITY;
    const count = Math.max(0, params.requestCount);
    const pressureLevel = classifyRemoteRateLimit(count, max);
    const remaining = Math.max(0, max - count);
    const fp = fnv1aHex(`${count}::${max}::${pressureLevel}`);
    const metrics = {
        requestCount: count,
        maxCapacity: max,
        pressureLevel,
        remainingCapacity: remaining,
        fingerprint: fp,
    };
    return deepFreeze(metrics);
}
/**
 * EN: Checks whether a new remote request can be accepted under rate limit policy.
 * VI: Kiểm tra xem yêu cầu từ xa mới có thể được chấp nhận theo chính sách giới hạn tốc độ hay không.
 */
export function canAcceptRemoteRequest(metrics) {
    return metrics.pressureLevel !== 'BLOCKED' && metrics.pressureLevel !== 'SATURATED';
}
