import type { TransportBackpressureState } from './transportStates.js';
export interface TransportBackpressureMetrics {
    readonly queueDepth: number;
    readonly maxQueueDepth: number;
    readonly pressureLevel: TransportBackpressureState;
    readonly rejectedCount: number;
    readonly deferredCount: number;
    readonly deliveryCapacity: number;
    readonly fingerprint: string;
}
/**
 * EN: Determines the backpressure level based on current depth vs maximum capacity.
 * VI: Xác định mức độ áp lực ngược dựa trên độ sâu hiện tại so với dung lượng tối đa.
 */
export declare function classifyBackpressure(queueDepth: number, maxQueueDepth?: number): TransportBackpressureState;
/**
 * EN: Computes an immutable TransportBackpressureMetrics snapshot.
 * VI: Tính toán snapshot chỉ số áp lực ngược bất biến.
 */
export declare function computeBackpressureMetrics(params: {
    readonly queueDepth: number;
    readonly maxQueueDepth?: number;
    readonly rejectedCount?: number;
    readonly deferredCount?: number;
}): Readonly<TransportBackpressureMetrics>;
/**
 * EN: Checks whether a new message can be enqueued without violating flow control.
 * VI: Kiểm tra xem thông điệp mới có thể xếp vào hàng đợi mà không vi phạm kiểm soát lưu lượng hay không.
 */
export declare function canEnqueueMessage(metrics: TransportBackpressureMetrics): boolean;
