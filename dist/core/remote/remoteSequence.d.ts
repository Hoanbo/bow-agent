export type RemoteSequenceStatus = 'NEXT_IN_ORDER' | 'DUPLICATE_SEQUENCE' | 'SEQUENCE_GAP' | 'STALE_SEQUENCE' | 'INVALID_SEQUENCE';
export interface RemoteSequenceResult {
    readonly status: RemoteSequenceStatus;
    readonly expectedSequence: number;
    readonly actualSequence: number;
    readonly missingCount?: number;
    readonly reason?: string;
}
/**
 * EN: Analyzes incoming sequence against the last accepted sequence.
 * VI: Phân tích số thứ tự đến so với số thứ tự được chấp nhận gần nhất.
 */
export declare function analyzeRemoteSequence(lastAcceptedSequence: number, incomingSequence: number): Readonly<RemoteSequenceResult>;
/**
 * EN: Asserts valid monotonic progression or throws descriptive error.
 * VI: Khẳng định tiến trình đơn điệu hợp lệ hoặc ném lỗi mô tả.
 */
export declare function assertRemoteSequenceProgression(lastAcceptedSequence: number, incomingSequence: number): void;
