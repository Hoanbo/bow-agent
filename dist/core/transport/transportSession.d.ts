import type { TransportConnectionState, TransportBackpressureState } from './transportStates.js';
import type { TransportConnectionRecord } from './transportConnection.js';
export interface TransportSessionSnapshot {
    readonly sessionId: string;
    readonly connectionId: string;
    readonly scopeKey: string;
    readonly userId: string;
    readonly brainSessionId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly transportId: string;
    readonly connectionState: TransportConnectionState;
    readonly lastAcceptedSequence: number;
    readonly lastAcknowledgedSequence: number;
    readonly pendingCount: number;
    readonly backpressureState: TransportBackpressureState;
    readonly reconnectCount: number;
    readonly lastHeartbeatSequence: number;
    readonly disconnectReason?: string;
    readonly fingerprint: string;
    readonly updatedAt: number;
}
export interface CreateTransportSessionParams {
    readonly connection: Readonly<TransportConnectionRecord>;
    readonly initialSequence?: number;
    readonly timestamp?: number;
}
/**
 * EN: Creates an immutable TransportSessionSnapshot.
 * VI: Khởi tạo một TransportSessionSnapshot bất biến.
 */
export declare function createTransportSessionSnapshot(params: CreateTransportSessionParams): Readonly<TransportSessionSnapshot>;
/**
 * EN: Updates a session snapshot with new sequence, pending count, or health metrics.
 * VI: Cập nhật snapshot phiên với số thứ tự mới, số lượng chờ xử lý hoặc chỉ số sức khỏe.
 */
export declare function updateTransportSessionSnapshot(current: Readonly<TransportSessionSnapshot>, updates: {
    readonly connectionState?: TransportConnectionState;
    readonly lastAcceptedSequence?: number;
    readonly lastAcknowledgedSequence?: number;
    readonly pendingCount?: number;
    readonly backpressureState?: TransportBackpressureState;
    readonly reconnectCount?: number;
    readonly lastHeartbeatSequence?: number;
    readonly disconnectReason?: string;
    readonly timestamp?: number;
}): Readonly<TransportSessionSnapshot>;
