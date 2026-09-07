import type { NetworkHeartbeatSignal, NetworkHeartbeatAck } from './networkTypes.js';
import type { NetworkHeartbeatState } from './networkStates.js';
export interface HeartbeatEvaluationResult {
    readonly success: boolean;
    readonly heartbeatState: NetworkHeartbeatState;
    readonly roundTripTimeMs?: number;
    readonly error?: string;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable NetworkHeartbeatSignal.
 * VI: Khởi tạo một NetworkHeartbeatSignal bất biến.
 */
export declare function createNetworkHeartbeatSignal(params: {
    readonly networkConnectionId: string;
    readonly sequence: number;
    readonly timestamp?: number;
}): Readonly<NetworkHeartbeatSignal>;
/**
 * EN: Creates an immutable NetworkHeartbeatAck in response to a signal.
 * VI: Khởi tạo một NetworkHeartbeatAck bất biến để phản hồi tín hiệu.
 */
export declare function createNetworkHeartbeatAck(params: {
    readonly signal: Readonly<NetworkHeartbeatSignal>;
    readonly currentTimestamp?: number;
}): Readonly<NetworkHeartbeatAck>;
/**
 * EN: Evaluates heartbeat acknowledgment against sent signal.
 * Fails closed on connection mismatch or negative sequence.
 *
 * VI: Đánh giá xác nhận nhịp tim so với tín hiệu đã gửi.
 * Thất bại đóng khi lệch kết nối hoặc số thứ tự âm.
 */
export declare function evaluateNetworkHeartbeat(signal: Readonly<NetworkHeartbeatSignal>, ack: Readonly<NetworkHeartbeatAck>, maxAllowedRttMs?: number): Readonly<HeartbeatEvaluationResult>;
