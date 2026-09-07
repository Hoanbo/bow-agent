import type { ScopedNetworkIdentity, NetworkAdapterType } from './networkTypes.js';
import type { NetworkConnectionState } from './networkStates.js';
export interface NetworkConnectionSnapshot {
    readonly networkConnectionId: string;
    readonly scope: ScopedNetworkIdentity;
    readonly scopeKey: string;
    readonly adapterType: NetworkAdapterType;
    readonly state: NetworkConnectionState;
    readonly lastSentSequence: number;
    readonly lastReceivedSequence: number;
    readonly pendingFrameCount: number;
    readonly health: 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE';
    readonly reconnectCount: number;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly fingerprint: string;
}
export interface CreateNetworkConnectionParams {
    readonly scope: ScopedNetworkIdentity;
    readonly adapterType: NetworkAdapterType;
    readonly initialState?: NetworkConnectionState;
    readonly initialSequence?: number;
    readonly timestamp?: number;
}
/**
 * EN: Creates an immutable NetworkConnectionSnapshot.
 * VI: Khởi tạo một NetworkConnectionSnapshot bất biến.
 */
export declare function createNetworkConnectionSnapshot(params: CreateNetworkConnectionParams): Readonly<NetworkConnectionSnapshot>;
/**
 * EN: Transitions a connection snapshot to a new state and updates metrics.
 * VI: Chuyển đổi một snapshot kết nối sang trạng thái mới và cập nhật các chỉ số.
 */
export declare function updateNetworkConnectionSnapshot(current: Readonly<NetworkConnectionSnapshot>, updates: {
    readonly state?: NetworkConnectionState;
    readonly lastSentSequence?: number;
    readonly lastReceivedSequence?: number;
    readonly pendingFrameCount?: number;
    readonly health?: 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE';
    readonly reconnectCount?: number;
    readonly timestamp?: number;
}): Readonly<NetworkConnectionSnapshot>;
