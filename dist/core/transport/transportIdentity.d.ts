import type { BrainTransportMessage } from './transportTypes.js';
export interface ScopedTransportIdentity {
    readonly userId: string;
    readonly sessionId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly transportId: string;
}
export interface ConnectionIdentityRecord {
    readonly connectionId: string;
    readonly scopeKey: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly transportId: string;
    readonly fingerprint: string;
}
/**
 * EN: Computes a deterministic ConnectionIdentityRecord from a 5-tuple scope.
 * VI: Tính toán một ConnectionIdentityRecord tất định từ phạm vi bộ 5.
 */
export declare function createConnectionIdentity(params: ScopedTransportIdentity): ConnectionIdentityRecord;
/**
 * EN: Computes a deterministic transport session ID.
 * VI: Tính toán định danh phiên truyền tải tất định.
 */
export declare function computeTransportSessionId(connectionId: string, scopeKey: string, initialSequence?: number): string;
/**
 * EN: Asserts that a transport message belongs strictly to the expected connection scope.
 * VI: Khẳng định rằng thông điệp truyền tải hoàn toàn thuộc về phạm vi kết nối dự kiến.
 */
export declare function assertScopeMatches(expectedScopeKey: string, message: BrainTransportMessage): void;
