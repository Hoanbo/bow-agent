/**
 * EN: Computes standard 32-bit FNV-1a hash formatted as 8-character hex string.
 * VI: Tính toán mã băm FNV-1a 32-bit tiêu chuẩn dưới dạng chuỗi hex 8 ký tự.
 */
export declare function fnv1aHex(input: string): string;
/**
 * EN: Deterministically stringifies payload with sorted keys to avoid object key order jitter.
 * VI: Chuyển đổi payload thành chuỗi tất định với các key được sắp xếp để tránh rung giật thứ tự key.
 */
export declare function canonicalStringify(value: unknown): string;
/**
 * EN: Computes deterministic fingerprint for a RemoteGatewayIdentity.
 * VI: Tính toán fingerprint tất định cho một RemoteGatewayIdentity.
 */
export declare function computeGatewayFingerprint(params: {
    readonly name: string;
    readonly version: string;
    readonly supportedProtocols: readonly string[];
}): string;
/**
 * EN: Computes deterministic fingerprint for a RemotePeerIdentity.
 * VI: Tính toán fingerprint tất định cho một RemotePeerIdentity.
 */
export declare function computePeerFingerprint(params: {
    readonly surfaceId: string;
    readonly surfaceType: string;
    readonly clientVersion: string;
}): string;
/**
 * EN: Computes deterministic fingerprint for a RemoteHandshake.
 * VI: Tính toán fingerprint tất định cho một RemoteHandshake.
 */
export declare function computeHandshakeFingerprint(params: {
    readonly gatewayId: string;
    readonly peerId: string;
    readonly scopeKey: string;
    readonly protocolVersion: string;
    readonly requestedCapabilities: readonly string[];
    readonly riskLevel: string;
}): string;
/**
 * EN: Computes deterministic fingerprint for a RemoteSession.
 * VI: Tính toán fingerprint tất định cho một RemoteSession.
 */
export declare function computeRemoteSessionFingerprint(params: {
    readonly gatewayId: string;
    readonly peerId: string;
    readonly scopeKey: string;
    readonly initialSequence?: number;
}): string;
/**
 * EN: Computes deterministic fingerprint for a RemoteAuthorizationContext.
 * VI: Tính toán fingerprint tất định cho một RemoteAuthorizationContext.
 */
export declare function computeRemoteAuthFingerprint(params: {
    readonly peerId: string;
    readonly remoteSessionId: string;
    readonly scopeKey: string;
    readonly isAuthorized: boolean;
    readonly capabilities: readonly string[];
    readonly riskLevel: string;
}): string;
/**
 * EN: Computes deterministic fingerprint for a RemoteRequest.
 * VI: Tính toán fingerprint tất định cho một RemoteRequest.
 */
export declare function computeRemoteRequestFingerprint(params: {
    readonly remoteSessionId: string;
    readonly sequence: number;
    readonly action: string;
    readonly payload?: unknown;
}): string;
/**
 * EN: Computes deterministic fingerprint for a RemoteResponse.
 * VI: Tính toán fingerprint tất định cho một RemoteResponse.
 */
export declare function computeRemoteResponseFingerprint(params: {
    readonly requestId: string;
    readonly remoteSessionId: string;
    readonly status: string;
    readonly payload?: unknown;
    readonly error?: string;
}): string;
/**
 * EN: Computes deterministic fingerprint for a RemoteAuditRecord.
 * VI: Tính toán fingerprint tất định cho một RemoteAuditRecord.
 */
export declare function computeRemoteAuditFingerprint(params: {
    readonly eventType: string;
    readonly gatewayId: string;
    readonly peerId?: string;
    readonly remoteSessionId?: string;
    readonly outcome: string;
    readonly details?: string;
}): string;
