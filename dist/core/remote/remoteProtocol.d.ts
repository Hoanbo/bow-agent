export declare const REMOTE_PROTOCOL_NAME = "BOW_REMOTE_PROTOCOL";
export interface RemoteProtocolDescriptor {
    readonly protocolName: string;
    readonly currentVersion: string;
    readonly supportedVersions: readonly string[];
}
export declare const CANONICAL_REMOTE_PROTOCOL: Readonly<RemoteProtocolDescriptor>;
/**
 * EN: Checks if a requested protocol version is supported.
 * VI: Kiểm tra xem phiên bản giao thức được yêu cầu có được hỗ trợ hay không.
 */
export declare function isProtocolVersionSupported(version: string): boolean;
/**
 * EN: Negotiates protocol version with a remote peer. Fails closed on mismatch.
 * VI: Đàm phán phiên bản giao thức với máy khách từ xa. Thất bại đóng an toàn khi không khớp.
 */
export declare function negotiateProtocolVersion(requestedVersion: string): string;
