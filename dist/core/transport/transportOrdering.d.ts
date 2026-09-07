export type SequenceAnalysisResult = {
    readonly status: 'NEXT_IN_ORDER';
    readonly expectedSequence: number;
    readonly actualSequence: number;
} | {
    readonly status: 'DUPLICATE_SEQUENCE';
    readonly expectedSequence: number;
    readonly actualSequence: number;
} | {
    readonly status: 'SEQUENCE_GAP';
    readonly expectedSequence: number;
    readonly actualSequence: number;
    readonly missingCount: number;
} | {
    readonly status: 'STALE_SEQUENCE';
    readonly expectedSequence: number;
    readonly actualSequence: number;
} | {
    readonly status: 'INVALID_SEQUENCE';
    readonly expectedSequence: number;
    readonly actualSequence: number;
    readonly reason: string;
};
/**
 * EN: Analyzes incoming message sequence against the last accepted sequence of the connection.
 * VI: Phân tích số thứ tự thông điệp đến so với số thứ tự được chấp nhận gần nhất của kết nối.
 */
export declare function analyzeMessageSequence(lastAcceptedSequence: number, incomingSequence: number): Readonly<SequenceAnalysisResult>;
/**
 * EN: Validates that an incoming sequence progresses monotonically.
 * Never silently rewinds sequence or accepts stale sequence as new state.
 *
 * VI: Xác thực rằng số thứ tự đến tiến triển đơn điệu.
 * Không bao giờ âm thầm tua lại số thứ tự hoặc chấp nhận số thứ tự cũ làm trạng thái mới.
 */
export declare function assertSequenceProgression(lastAcceptedSequence: number, incomingSequence: number): void;
