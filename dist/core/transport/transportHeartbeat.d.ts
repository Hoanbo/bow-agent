export type HeartbeatHealthStatus = 'HEALTHY' | 'DEGRADED' | 'TIMEOUT';
export interface HeartbeatSignal {
    readonly heartbeatId: string;
    readonly connectionId: string;
    readonly heartbeatSequence: number;
    readonly healthStatus: HeartbeatHealthStatus;
    readonly timestamp: number;
    readonly fingerprint: string;
}
export interface HeartbeatAck {
    readonly ackId: string;
    readonly connectionId: string;
    readonly heartbeatSequence: number;
    readonly surfaceId: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable HeartbeatSignal.
 * VI: Khởi tạo một HeartbeatSignal bất biến.
 */
export declare function createHeartbeatSignal(params: {
    readonly connectionId: string;
    readonly heartbeatSequence: number;
    readonly healthStatus?: HeartbeatHealthStatus;
    readonly timestamp?: number;
}): Readonly<HeartbeatSignal>;
/**
 * EN: Creates an immutable HeartbeatAck in response to a HeartbeatSignal.
 * VI: Khởi tạo một HeartbeatAck bất biến đáp ứng một HeartbeatSignal.
 */
export declare function createHeartbeatAck(params: {
    readonly connectionId: string;
    readonly heartbeatSequence: number;
    readonly surfaceId: string;
    readonly timestamp?: number;
}): Readonly<HeartbeatAck>;
