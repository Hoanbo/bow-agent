import type { NetworkTimeoutConfig, NetworkFailureCode } from './networkTypes.js';
export type NetworkTimeoutType = 'CONNECT_TIMEOUT' | 'FRAME_TIMEOUT' | 'HEARTBEAT_TIMEOUT' | 'RESPONSE_TIMEOUT' | 'RECONNECT_TIMEOUT';
export declare const DEFAULT_NETWORK_TIMEOUT_CONFIG: Readonly<NetworkTimeoutConfig>;
export interface TimeoutEvaluationResult {
    readonly timedOut: boolean;
    readonly timeoutType?: NetworkTimeoutType;
    readonly failureCode?: NetworkFailureCode;
    readonly elapsedMs: number;
    readonly allowedMs: number;
    readonly reason?: string;
    readonly fingerprint: string;
}
/**
 * EN: Evaluates elapsed duration against timeout thresholds.
 * VI: Đánh giá khoảng thời gian đã trôi qua so với ngưỡng timeout.
 */
export declare function evaluateNetworkTimeout(params: {
    readonly timeoutType: NetworkTimeoutType;
    readonly startTimestamp: number;
    readonly currentTimestamp: number;
    readonly config?: Partial<NetworkTimeoutConfig>;
}): Readonly<TimeoutEvaluationResult>;
