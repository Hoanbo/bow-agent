import type { ScopedTransportIdentity } from './transportIdentity.js';
export interface ResumeRequest {
    readonly requestId: string;
    readonly connectionId: string;
    readonly scope: ScopedTransportIdentity;
    readonly lastAckSequence: number;
    readonly checkpointReference?: string;
    readonly resumeAttempt: number;
    readonly timestamp: number;
    readonly fingerprint: string;
}
export interface ResumeResult {
    readonly success: boolean;
    readonly connectionId: string;
    readonly resumedSequence: number;
    readonly error?: string;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable ResumeRequest.
 * VI: Khởi tạo một ResumeRequest bất biến.
 */
export declare function createResumeRequest(params: {
    readonly connectionId: string;
    readonly scope: ScopedTransportIdentity;
    readonly lastAckSequence: number;
    readonly checkpointReference?: string;
    readonly resumeAttempt?: number;
    readonly timestamp?: number;
}): Readonly<ResumeRequest>;
/**
 * EN: Validates a resume request against expected session context.
 * Strict check: scope MUST match exactly, sequence MUST NOT rewind.
 *
 * VI: Xác thực yêu cầu khôi phục so với ngữ cảnh phiên dự kiến.
 * Kiểm tra nghiêm ngặt: phạm vi PHẢI khớp chính xác, số thứ tự KHÔNG ĐƯỢC tua lại.
 */
export declare function validateResumeRequest(request: Readonly<ResumeRequest>, sessionContext: {
    readonly connectionId: string;
    readonly scopeKey: string;
    readonly lastAcceptedSequence: number;
    readonly lastAcknowledgedSequence: number;
}): Readonly<ResumeResult>;
