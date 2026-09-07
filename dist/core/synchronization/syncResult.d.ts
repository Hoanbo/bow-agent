import type { SyncRecord, SyncFailureCode } from './syncTypes.js';
export interface SyncFailureDescriptor {
    readonly code: SyncFailureCode;
    readonly message: string;
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence?: number;
    readonly surfaceId?: string;
    readonly eventId?: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable audit record for synchronization events.
 * VI: Tạo một bản ghi kiểm toán bất biến cho các sự kiện đồng bộ hóa.
 */
export declare function createSyncRecord(params: {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence: number;
    readonly action: string;
    readonly surfaceId?: string;
    readonly eventId?: string;
    readonly timestamp?: number;
}): SyncRecord;
/**
 * EN: Creates an immutable, secret-scrubbed synchronization failure descriptor.
 * VI: Tạo một bộ mô tả lỗi đồng bộ hóa bất biến, đã được lọc sạch bí mật.
 */
export declare function createSyncFailureDescriptor(params: {
    readonly code: SyncFailureCode;
    readonly message: string;
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence?: number;
    readonly surfaceId?: string;
    readonly eventId?: string;
    readonly timestamp?: number;
}): SyncFailureDescriptor;
