import type { TransportMessageType, TransportDirection } from './transportTypes.js';
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
 * EN: Computes deterministic fingerprint for a message envelope.
 * VI: Tính toán fingerprint tất định cho một phong bì thông điệp.
 */
export declare function computeMessageFingerprint(params: {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly surfaceId: string;
    readonly transportId: string;
    readonly connectionId: string;
    readonly correlationId: string;
    readonly causationId: string;
    readonly eventId?: string;
    readonly messageType: TransportMessageType;
    readonly direction: TransportDirection;
    readonly sequence: number;
    readonly payload?: Readonly<Record<string, unknown>>;
}): string;
/**
 * EN: Computes deterministic connection fingerprint and connectionId.
 * VI: Tính toán fingerprint kết nối và connectionId tất định.
 */
export declare function computeConnectionFingerprint(params: {
    readonly userId: string;
    readonly sessionId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly transportId: string;
}): string;
/**
 * EN: Computes deterministic transport session fingerprint.
 * VI: Tính toán fingerprint phiên truyền tải tất định.
 */
export declare function computeSessionFingerprint(params: {
    readonly connectionId: string;
    readonly scopeKey: string;
    readonly initialSequence: number;
}): string;
/**
 * EN: Computes deterministic ACK / NACK fingerprint.
 * VI: Tính toán fingerprint ACK / NACK tất định.
 */
export declare function computeAckFingerprint(params: {
    readonly messageId: string;
    readonly connectionId: string;
    readonly surfaceId: string;
    readonly sequence: number;
    readonly correlationId: string;
    readonly ackType: string;
}): string;
/**
 * EN: Computes deterministic heartbeat fingerprint.
 * VI: Tính toán fingerprint heartbeat tất định.
 */
export declare function computeHeartbeatFingerprint(params: {
    readonly connectionId: string;
    readonly heartbeatSequence: number;
    readonly state: string;
}): string;
/**
 * EN: Computes deterministic reconnect / resume fingerprint.
 * VI: Tính toán fingerprint tái kết nối / phục hồi tất định.
 */
export declare function computeResumeFingerprint(params: {
    readonly connectionId: string;
    readonly lastAckSequence: number;
    readonly resumeAttempt: number;
}): string;
/**
 * EN: Computes deterministic checkpoint fingerprint.
 * VI: Tính toán fingerprint checkpoint tất định.
 */
export declare function computeTransportCheckpointFingerprint(params: {
    readonly connectionId: string;
    readonly lastSequence: number;
    readonly sessionFingerprint: string;
}): string;
