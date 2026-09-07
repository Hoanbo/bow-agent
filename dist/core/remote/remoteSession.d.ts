import type { RemoteSessionState, RemoteAuthenticationState } from './remoteStates.js';
import type { ScopedRemoteIdentity, AllowedRemoteCapability, RemoteAuthorizationContext } from './remoteTypes.js';
export interface RemoteSessionSnapshot {
    readonly remoteSessionId: string;
    readonly gatewayId: string;
    readonly peerId: string;
    readonly scopeKey: string;
    readonly userId: string;
    readonly brainSessionId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly transportId: string;
    readonly protocolVersion: string;
    readonly sessionState: RemoteSessionState;
    readonly authState: RemoteAuthenticationState;
    readonly authContext?: Readonly<RemoteAuthorizationContext>;
    readonly capabilities: readonly AllowedRemoteCapability[];
    readonly lastSequence: number;
    readonly lastAcknowledgedSequence: number;
    readonly pendingCount: number;
    readonly health: 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE';
    readonly reconnectCount: number;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly fingerprint: string;
}
export interface CreateRemoteSessionParams {
    readonly gatewayId: string;
    readonly peerId: string;
    readonly scope: ScopedRemoteIdentity;
    readonly protocolVersion: string;
    readonly capabilities: readonly AllowedRemoteCapability[];
    readonly initialState?: RemoteSessionState;
    readonly authState?: RemoteAuthenticationState;
    readonly authContext?: Readonly<RemoteAuthorizationContext>;
    readonly initialSequence?: number;
    readonly timestamp?: number;
}
/**
 * EN: Creates an immutable RemoteSessionSnapshot.
 * VI: Khởi tạo một RemoteSessionSnapshot bất biến.
 */
export declare function createRemoteSessionSnapshot(params: CreateRemoteSessionParams): Readonly<RemoteSessionSnapshot>;
/**
 * EN: Updates an immutable remote session snapshot with new sequence, state, or metrics.
 * VI: Cập nhật một remote session snapshot bất biến với trạng thái, số thứ tự hoặc chỉ số mới.
 */
export declare function updateRemoteSessionSnapshot(current: Readonly<RemoteSessionSnapshot>, updates: {
    readonly sessionState?: RemoteSessionState;
    readonly authState?: RemoteAuthenticationState;
    readonly authContext?: Readonly<RemoteAuthorizationContext>;
    readonly lastSequence?: number;
    readonly lastAcknowledgedSequence?: number;
    readonly pendingCount?: number;
    readonly health?: 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE';
    readonly reconnectCount?: number;
    readonly timestamp?: number;
}): Readonly<RemoteSessionSnapshot>;
