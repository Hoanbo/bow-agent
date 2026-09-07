import type { NetworkBackpressureMetrics } from './networkTypes.js';
import type { NetworkBackpressureState } from './networkStates.js';
export declare const DEFAULT_MAX_NETWORK_CAPACITY = 1000;
/**
 * EN: Classifies backpressure pressure state given pending frames and capacity limit.
 * VI: Phân loại trạng thái áp lực ngược dựa trên số khung chờ và giới hạn dung lượng.
 */
export declare function classifyNetworkBackpressure(pendingFrames: number, maxCapacity?: number): NetworkBackpressureState;
/**
 * EN: Computes an immutable NetworkBackpressureMetrics snapshot.
 * VI: Tính toán snapshot chỉ số áp lực ngược NetworkBackpressureMetrics bất biến.
 */
export declare function computeNetworkBackpressure(params: {
    readonly pendingFrames: number;
    readonly maxCapacity?: number;
}): Readonly<NetworkBackpressureMetrics>;
/**
 * EN: Determines whether the network layer can accept a new frame without dropping.
 * VI: Xác định xem tầng mạng có thể tiếp nhận khung mới mà không bị drop hay không.
 */
export declare function canAcceptNetworkFrame(metrics: NetworkBackpressureMetrics): boolean;
