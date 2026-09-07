import type { NetworkConnectionSnapshot } from './networkConnection.js';
import type { ScopedNetworkIdentity } from './networkTypes.js';
export interface NetworkReconnectRequest {
    readonly reconnectId: string;
    readonly previousConnectionId: string;
    readonly scope: ScopedNetworkIdentity;
    readonly lastAcknowledgedSequence: number;
    readonly timestamp: number;
    readonly fingerprint: string;
}
export interface NetworkReconnectResult {
    readonly success: boolean;
    readonly connection?: Readonly<NetworkConnectionSnapshot>;
    readonly resumedSequence: number;
    readonly status: 'RECONNECTED' | 'RECONNECT_REJECTED';
    readonly reason?: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable reconnection request.
 * VI: Khởi tạo một yêu cầu kết nối lại bất biến.
 */
export declare function createNetworkReconnectRequest(params: {
    readonly previousConnectionId: string;
    readonly scope: ScopedNetworkIdentity;
    readonly lastAcknowledgedSequence: number;
    readonly timestamp?: number;
}): Readonly<NetworkReconnectRequest>;
/**
 * EN: Evaluates a reconnect request against previous connection snapshot.
 * Reconnect cannot reset sequence to 0 or mutate scope boundaries.
 *
 * VI: Đánh giá yêu cầu kết nối lại so với snapshot kết nối trước đó.
 * Kết nối lại không thể đặt lại chuỗi về 0 hoặc biến đổi ranh giới phạm vi.
 */
export declare function evaluateNetworkReconnect(previous: Readonly<NetworkConnectionSnapshot>, request: Readonly<NetworkReconnectRequest>): Readonly<NetworkReconnectResult>;
