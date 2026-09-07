// src/core/remote/remoteFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.20: DETERMINISTIC REMOTE FINGERPRINTING
//
// EN:
// Deterministic non-cryptographic FNV-1a 32-bit hashing for remote gateway identities,
// peers, handshakes, sessions, requests, responses, and audit records.
// Zero randomness, zero timestamps in primary identity.
//
// VI:
// Giải thuật băm FNV-1a 32-bit phi mật mã tất định cho các định danh cổng từ xa,
// máy khách, bắt tay, phiên làm việc, yêu cầu, phản hồi và bản ghi kiểm tra.
// Không ngẫu nhiên, không dùng timestamp trong định danh chính.
/**
 * EN: Computes standard 32-bit FNV-1a hash formatted as 8-character hex string.
 * VI: Tính toán mã băm FNV-1a 32-bit tiêu chuẩn dưới dạng chuỗi hex 8 ký tự.
 */
export function fnv1aHex(input) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
/**
 * EN: Deterministically stringifies payload with sorted keys to avoid object key order jitter.
 * VI: Chuyển đổi payload thành chuỗi tất định với các key được sắp xếp để tránh rung giật thứ tự key.
 */
export function canonicalStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(canonicalStringify).join(',')}]`;
    }
    const obj = value;
    const sortedKeys = Object.keys(obj).sort();
    const entries = sortedKeys.map(key => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`);
    return `{${entries.join(',')}}`;
}
/**
 * EN: Computes deterministic fingerprint for a RemoteGatewayIdentity.
 * VI: Tính toán fingerprint tất định cho một RemoteGatewayIdentity.
 */
export function computeGatewayFingerprint(params) {
    const serialized = [
        params.name,
        params.version,
        [...params.supportedProtocols].sort().join(','),
    ].join('::');
    return fnv1aHex(serialized);
}
/**
 * EN: Computes deterministic fingerprint for a RemotePeerIdentity.
 * VI: Tính toán fingerprint tất định cho một RemotePeerIdentity.
 */
export function computePeerFingerprint(params) {
    const serialized = [params.surfaceId, params.surfaceType, params.clientVersion].join('::');
    return fnv1aHex(serialized);
}
/**
 * EN: Computes deterministic fingerprint for a RemoteHandshake.
 * VI: Tính toán fingerprint tất định cho một RemoteHandshake.
 */
export function computeHandshakeFingerprint(params) {
    const serialized = [
        params.gatewayId,
        params.peerId,
        params.scopeKey,
        params.protocolVersion,
        [...params.requestedCapabilities].sort().join(','),
        params.riskLevel,
    ].join('::');
    return fnv1aHex(serialized);
}
/**
 * EN: Computes deterministic fingerprint for a RemoteSession.
 * VI: Tính toán fingerprint tất định cho một RemoteSession.
 */
export function computeRemoteSessionFingerprint(params) {
    const serialized = [
        params.gatewayId,
        params.peerId,
        params.scopeKey,
        String(params.initialSequence ?? 0),
    ].join('::');
    return fnv1aHex(serialized);
}
/**
 * EN: Computes deterministic fingerprint for a RemoteAuthorizationContext.
 * VI: Tính toán fingerprint tất định cho một RemoteAuthorizationContext.
 */
export function computeRemoteAuthFingerprint(params) {
    const serialized = [
        params.peerId,
        params.remoteSessionId,
        params.scopeKey,
        String(params.isAuthorized),
        [...params.capabilities].sort().join(','),
        params.riskLevel,
    ].join('::');
    return fnv1aHex(serialized);
}
/**
 * EN: Computes deterministic fingerprint for a RemoteRequest.
 * VI: Tính toán fingerprint tất định cho một RemoteRequest.
 */
export function computeRemoteRequestFingerprint(params) {
    const serialized = [
        params.remoteSessionId,
        String(params.sequence),
        params.action,
        canonicalStringify(params.payload ?? {}),
    ].join('::');
    return fnv1aHex(serialized);
}
/**
 * EN: Computes deterministic fingerprint for a RemoteResponse.
 * VI: Tính toán fingerprint tất định cho một RemoteResponse.
 */
export function computeRemoteResponseFingerprint(params) {
    const serialized = [
        params.requestId,
        params.remoteSessionId,
        params.status,
        canonicalStringify(params.payload ?? {}),
        params.error ?? '',
    ].join('::');
    return fnv1aHex(serialized);
}
/**
 * EN: Computes deterministic fingerprint for a RemoteAuditRecord.
 * VI: Tính toán fingerprint tất định cho một RemoteAuditRecord.
 */
export function computeRemoteAuditFingerprint(params) {
    const serialized = [
        params.eventType,
        params.gatewayId,
        params.peerId ?? '',
        params.remoteSessionId ?? '',
        params.outcome,
        params.details ?? '',
    ].join('::');
    return fnv1aHex(serialized);
}
