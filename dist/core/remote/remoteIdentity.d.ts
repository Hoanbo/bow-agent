import type { RemoteGatewayIdentity, RemotePeerIdentity, RemoteSessionIdentity, ScopedRemoteIdentity } from './remoteTypes.js';
/**
 * EN: Constructs a deterministic RemoteGatewayIdentity.
 * VI: Khởi tạo một RemoteGatewayIdentity tất định.
 */
export declare function createRemoteGatewayIdentity(params: {
    readonly name: string;
    readonly version: string;
    readonly supportedProtocols: readonly string[];
}): Readonly<RemoteGatewayIdentity>;
/**
 * EN: Constructs a deterministic RemotePeerIdentity.
 * VI: Khởi tạo một RemotePeerIdentity tất định.
 */
export declare function createRemotePeerIdentity(params: {
    readonly surfaceId: string;
    readonly surfaceType: 'MOBILE' | 'ROBOT' | 'DESKTOP' | 'WEB' | 'VOICE' | 'GENERIC';
    readonly clientVersion: string;
}): Readonly<RemotePeerIdentity>;
/**
 * EN: Constructs a deterministic RemoteSessionIdentity.
 * VI: Khởi tạo một RemoteSessionIdentity tất định.
 */
export declare function createRemoteSessionIdentity(params: {
    readonly gatewayId: string;
    readonly peerId: string;
    readonly scope: ScopedRemoteIdentity;
    readonly initialSequence?: number;
}): Readonly<RemoteSessionIdentity>;
/**
 * EN: Asserts that an incoming scope key strictly matches the expected scope key. Fails closed.
 * VI: Khẳng định khóa phạm vi đến phải khớp chính xác với khóa phạm vi dự kiến. Thất bại đóng an toàn.
 */
export declare function assertRemoteScopeMatches(expectedScopeKey: string, actualScopeKey: string): void;
