import type { ScopedNetworkIdentity, NetworkDirection } from './networkTypes.js';
/**
 * EN: Computes standard 32-bit FNV-1a hash formatted as 8-character lowercase hex.
 * VI: Tính toán băm FNV-1a 32-bit chuẩn được định dạng dưới dạng chuỗi hex thường 8 ký tự.
 */
export declare function fnv1aHex(input: string): string;
/**
 * EN: Canonical canonical key representation of a 7-tuple ScopedNetworkIdentity.
 * VI: Biểu diễn khóa chuẩn tắc của ScopedNetworkIdentity bộ 7.
 */
export declare function computeNetworkScopeKey(scope: ScopedNetworkIdentity): string;
/**
 * EN: Computes deterministic fingerprint for a network connection identity.
 * VI: Tính toán chữ ký băm tất định cho định danh kết nối mạng.
 */
export declare function computeNetworkConnectionFingerprint(params: {
    readonly scope: ScopedNetworkIdentity;
    readonly adapterType: string;
}): string;
/**
 * EN: Computes deterministic fingerprint for a network frame.
 * VI: Tính toán chữ ký băm tất định cho khung mạng.
 */
export declare function computeNetworkFrameFingerprint(params: {
    readonly networkConnectionId: string;
    readonly sequence: number;
    readonly direction: NetworkDirection;
    readonly messageType: string;
    readonly payloadChecksum: string;
}): string;
/**
 * EN: Computes deterministic payload checksum using canonical key sorting.
 * VI: Tính toán checksum payload tất định sử dụng sắp xếp khóa chuẩn tắc.
 */
export declare function computePayloadChecksum(payload: Readonly<Record<string, unknown>>): string;
/**
 * EN: Computes deterministic fingerprint for a heartbeat signal.
 * VI: Tính toán chữ ký băm tất định cho tín hiệu nhịp tim mạng.
 */
export declare function computeNetworkHeartbeatFingerprint(params: {
    readonly networkConnectionId: string;
    readonly sequence: number;
    readonly timestamp: number;
}): string;
/**
 * EN: Computes deterministic fingerprint for an audit record.
 * VI: Tính toán chữ ký băm tất định cho bản ghi kiểm toán mạng.
 */
export declare function computeNetworkAuditFingerprint(params: {
    readonly eventType: string;
    readonly networkConnectionId?: string;
    readonly sequence?: number;
    readonly outcome: string;
    readonly timestamp: number;
}): string;
/**
 * EN: Computes deterministic fingerprint for a failure descriptor.
 * VI: Tính toán chữ ký băm tất định cho bộ mô tả lỗi mạng.
 */
export declare function computeNetworkFailureFingerprint(params: {
    readonly code: string;
    readonly message: string;
    readonly networkConnectionId?: string;
    readonly timestamp: number;
}): string;
