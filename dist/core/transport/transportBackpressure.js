// src/core/transport/transportBackpressure.ts
// BOWCON V4.0 — MILESTONE 1.3.19: TRANSPORT BACKPRESSURE & FLOW CONTROL
//
// EN:
// Authoritative data-only flow-control model.
// Tracks queue depth, classifies backpressure states (NORMAL, ELEVATED, HIGH, SATURATED, BLOCKED),
// and guarantees no silent dropping of messages. Fails explicitly on saturation.
//
// VI:
// Mô hình kiểm soát lưu lượng chỉ chứa dữ liệu có thẩm quyền.
// Theo dõi độ sâu hàng đợi, phân loại trạng thái áp lực ngược,
// và đảm bảo không bao giờ âm thầm loại bỏ thông điệp. Báo lỗi tường minh khi bão hòa.
import { MAX_QUEUE_DEPTH, deepFreeze } from './transportValidator.js';
import { fnv1aHex } from './transportFingerprint.js';
/**
 * EN: Determines the backpressure level based on current depth vs maximum capacity.
 * VI: Xác định mức độ áp lực ngược dựa trên độ sâu hiện tại so với dung lượng tối đa.
 */
export function classifyBackpressure(queueDepth, maxQueueDepth = MAX_QUEUE_DEPTH) {
    if (maxQueueDepth <= 0 || queueDepth >= maxQueueDepth) {
        return 'BLOCKED';
    }
    const ratio = queueDepth / maxQueueDepth;
    if (ratio >= 0.9)
        return 'SATURATED';
    if (ratio >= 0.75)
        return 'HIGH';
    if (ratio >= 0.5)
        return 'ELEVATED';
    return 'NORMAL';
}
/**
 * EN: Computes an immutable TransportBackpressureMetrics snapshot.
 * VI: Tính toán snapshot chỉ số áp lực ngược bất biến.
 */
export function computeBackpressureMetrics(params) {
    const max = params.maxQueueDepth ?? MAX_QUEUE_DEPTH;
    const depth = Math.max(0, params.queueDepth);
    const rejected = params.rejectedCount ?? 0;
    const deferred = params.deferredCount ?? 0;
    const pressureLevel = classifyBackpressure(depth, max);
    const deliveryCapacity = Math.max(0, max - depth);
    const fp = fnv1aHex(`${depth}::${max}::${pressureLevel}::${rejected}::${deferred}`);
    const metrics = {
        queueDepth: depth,
        maxQueueDepth: max,
        pressureLevel,
        rejectedCount: rejected,
        deferredCount: deferred,
        deliveryCapacity,
        fingerprint: fp,
    };
    return deepFreeze(metrics);
}
/**
 * EN: Checks whether a new message can be enqueued without violating flow control.
 * VI: Kiểm tra xem thông điệp mới có thể xếp vào hàng đợi mà không vi phạm kiểm soát lưu lượng hay không.
 */
export function canEnqueueMessage(metrics) {
    return metrics.pressureLevel !== 'BLOCKED' && metrics.pressureLevel !== 'SATURATED';
}
