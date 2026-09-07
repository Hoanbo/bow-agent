import type { BrainEventType, EventSource } from './eventTypes.js';
/**
 * EN: Computes standard 32-bit FNV-1a hash formatted as 8-character hex.
 * VI: Tính toán mã băm FNV-1a 32-bit tiêu chuẩn dưới dạng hex 8 ký tự.
 */
export declare function fnv1aHex(input: string): string;
/**
 * EN: Deterministically stringifies payload with sorted keys to avoid object key order jitter.
 * VI: Chuyển đổi payload thành chuỗi tất định với các key được sắp xếp để tránh rung giật thứ tự key.
 */
export declare function canonicalStringify(value: unknown): string;
/**
 * EN: Computes deterministic fingerprint for a BrainEvent.
 * VI: Tính toán fingerprint tất định cho một BrainEvent.
 */
export declare function computeEventFingerprint(params: {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence: number;
    readonly previousSequence: number;
    readonly eventType: BrainEventType;
    readonly correlationId: string;
    readonly causationId: string;
    readonly source: EventSource;
    readonly payload?: Readonly<Record<string, unknown>>;
    readonly riskLevel?: string;
    readonly targetSurfaceId?: string;
}): string;
/**
 * EN: Derives deterministic event identifier: evt_<fingerprint>.
 * VI: Suy xuất định danh sự kiện tất định: evt_<fingerprint>.
 */
export declare function computeEventIdentity(params: {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence: number;
    readonly previousSequence: number;
    readonly eventType: BrainEventType;
    readonly correlationId: string;
    readonly causationId: string;
    readonly source: EventSource;
    readonly payload?: Readonly<Record<string, unknown>>;
    readonly riskLevel?: string;
    readonly targetSurfaceId?: string;
}): string;
/**
 * EN: Computes deterministic fingerprint for a synchronization checkpoint.
 * VI: Tính toán fingerprint tất định cho checkpoint đồng bộ hóa.
 */
export declare function computeSyncCheckpointFingerprint(params: {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence: number;
    readonly latestEventId: string;
    readonly latestEventFingerprint: string;
    readonly activeSurfaces: readonly string[];
    readonly acknowledgedSurfaces: readonly string[];
}): string;
/**
 * EN: Computes fingerprint for a surface observation record.
 * VI: Tính toán fingerprint cho bản ghi quan sát của bề mặt.
 */
export declare function computeObservationFingerprint(params: {
    readonly surfaceId: string;
    readonly eventId: string;
    readonly sequence: number;
}): string;
/**
 * EN: Computes fingerprint for a surface acknowledgement record.
 * VI: Tính toán fingerprint cho bản ghi xác nhận của bề mặt.
 */
export declare function computeAcknowledgementFingerprint(params: {
    readonly surfaceId: string;
    readonly eventId: string;
    readonly sequence: number;
}): string;
/**
 * EN: Computes fingerprint for a synchronization conflict descriptor.
 * VI: Tính toán fingerprint cho bộ mô tả xung đột đồng bộ hóa.
 */
export declare function computeConflictFingerprint(params: {
    readonly brainId: string;
    readonly sequence: number;
    readonly existingEventId: string;
    readonly incomingEventId: string;
    readonly reason: string;
}): string;
