// src/core/network/networkFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.21: DETERMINISTIC NETWORK FINGERPRINTS
//
// EN:
// Deterministic FNV-1a 32-bit hex fingerprints for network connections, frames,
// heartbeats, and audit records. Zero dependency on Math.random, crypto.randomUUID,
// process IDs, or system time for primary identity.
//
// VI:
// Băm FNV-1a 32-bit tất định cho kết nối mạng, khung mạng, nhịp tim và bản ghi kiểm toán.
// Hoàn toàn không phụ thuộc vào Math.random, crypto.randomUUID, PID, hoặc thời gian hệ thống cho định danh chính.
const FNV1A_PRIME = 0x01000193;
const FNV1A_OFFSET_BASIS = 0x811c9dc5;
/**
 * EN: Computes standard 32-bit FNV-1a hash formatted as 8-character lowercase hex.
 * VI: Tính toán băm FNV-1a 32-bit chuẩn được định dạng dưới dạng chuỗi hex thường 8 ký tự.
 */
export function fnv1aHex(input) {
    let hash = FNV1A_OFFSET_BASIS;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, FNV1A_PRIME);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
/**
 * EN: Canonical canonical key representation of a 7-tuple ScopedNetworkIdentity.
 * VI: Biểu diễn khóa chuẩn tắc của ScopedNetworkIdentity bộ 7.
 */
export function computeNetworkScopeKey(scope) {
    return `${scope.userId}::${scope.sessionId}::${scope.brainId}::${scope.surfaceId}::${scope.transportId}::${scope.gatewayId}::${scope.networkAdapterId}`;
}
/**
 * EN: Computes deterministic fingerprint for a network connection identity.
 * VI: Tính toán chữ ký băm tất định cho định danh kết nối mạng.
 */
export function computeNetworkConnectionFingerprint(params) {
    const scopeKey = computeNetworkScopeKey(params.scope);
    return fnv1aHex(`NET_CONN::${scopeKey}::${params.adapterType}`);
}
/**
 * EN: Computes deterministic fingerprint for a network frame.
 * VI: Tính toán chữ ký băm tất định cho khung mạng.
 */
export function computeNetworkFrameFingerprint(params) {
    return fnv1aHex(`NET_FRAME::${params.networkConnectionId}::${params.sequence}::${params.direction}::${params.messageType}::${params.payloadChecksum}`);
}
/**
 * EN: Computes deterministic payload checksum using canonical key sorting.
 * VI: Tính toán checksum payload tất định sử dụng sắp xếp khóa chuẩn tắc.
 */
export function computePayloadChecksum(payload) {
    const sortedKeys = Object.keys(payload).sort();
    const pairs = sortedKeys.map((k) => `${k}=${JSON.stringify(payload[k])}`);
    return fnv1aHex(pairs.join(';'));
}
/**
 * EN: Computes deterministic fingerprint for a heartbeat signal.
 * VI: Tính toán chữ ký băm tất định cho tín hiệu nhịp tim mạng.
 */
export function computeNetworkHeartbeatFingerprint(params) {
    return fnv1aHex(`NET_HB::${params.networkConnectionId}::${params.sequence}::${params.timestamp}`);
}
/**
 * EN: Computes deterministic fingerprint for an audit record.
 * VI: Tính toán chữ ký băm tất định cho bản ghi kiểm toán mạng.
 */
export function computeNetworkAuditFingerprint(params) {
    return fnv1aHex(`NET_AUDIT::${params.eventType}::${params.networkConnectionId ?? 'NONE'}::${params.sequence ?? 0}::${params.outcome}::${params.timestamp}`);
}
/**
 * EN: Computes deterministic fingerprint for a failure descriptor.
 * VI: Tính toán chữ ký băm tất định cho bộ mô tả lỗi mạng.
 */
export function computeNetworkFailureFingerprint(params) {
    return fnv1aHex(`NET_FAIL::${params.code}::${params.networkConnectionId ?? 'NONE'}::${params.message}::${params.timestamp}`);
}
