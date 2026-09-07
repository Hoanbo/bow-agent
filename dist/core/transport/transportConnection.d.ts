import type { TransportConnectionState } from './transportStates.js';
import type { ScopedTransportIdentity } from './transportIdentity.js';
export interface TransportConnectionRecord {
    readonly connectionId: string;
    readonly scopeKey: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly transportId: string;
    readonly state: TransportConnectionState;
    readonly reason?: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable TransportConnectionRecord.
 * VI: Khởi tạo một TransportConnectionRecord bất biến.
 */
export declare function createTransportConnection(params: ScopedTransportIdentity, initialState?: TransportConnectionState, timestamp?: number): Readonly<TransportConnectionRecord>;
/**
 * EN: Transitions connection state following strict transition matrix.
 * VI: Chuyển đổi trạng thái kết nối tuân theo ma trận chuyển đổi nghiêm ngặt.
 */
export declare function transitionConnection(conn: Readonly<TransportConnectionRecord>, newState: TransportConnectionState, reason?: string, timestamp?: number): Readonly<TransportConnectionRecord>;
