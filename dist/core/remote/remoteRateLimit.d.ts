import type { RemoteRateLimitState } from './remoteStates.js';
export declare const DEFAULT_MAX_REMOTE_CAPACITY = 1000;
export interface RemoteRateMetrics {
    readonly requestCount: number;
    readonly maxCapacity: number;
    readonly pressureLevel: RemoteRateLimitState;
    readonly remainingCapacity: number;
    readonly fingerprint: string;
}
/**
 * EN: Determines rate limit state based on request count vs maximum capacity.
 * VI: Xác định trạng thái giới hạn tốc độ dựa trên số lượng yêu cầu so với dung lượng tối đa.
 */
export declare function classifyRemoteRateLimit(requestCount: number, maxCapacity?: number): RemoteRateLimitState;
/**
 * EN: Computes immutable rate metrics snapshot.
 * VI: Tính toán snapshot chỉ số tốc độ bất biến.
 */
export declare function computeRemoteRateMetrics(params: {
    readonly requestCount: number;
    readonly maxCapacity?: number;
}): Readonly<RemoteRateMetrics>;
/**
 * EN: Checks whether a new remote request can be accepted under rate limit policy.
 * VI: Kiểm tra xem yêu cầu từ xa mới có thể được chấp nhận theo chính sách giới hạn tốc độ hay không.
 */
export declare function canAcceptRemoteRequest(metrics: RemoteRateMetrics): boolean;
