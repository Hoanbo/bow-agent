import { type ObservabilitySessionId, type ObservabilityAgentAssertion, type ObservabilityContradictionRecord } from './observabilityTypes.js';
export declare class ObservabilityContradictionEngine {
    private contradictions;
    /**
     * Analyzes multiple observational agent assertions for conflicting health states, scores, or drift classifications.
     * Phân tích nhiều khẳng định của tác nhân quan sát để tìm trạng thái sức khỏe, điểm số hoặc phân loại sai lệch xung đột.
     */
    detectContradictions(sessionId: ObservabilitySessionId, targetId: string, assertions: readonly ObservabilityAgentAssertion[]): ObservabilityContradictionRecord | null;
    /**
     * Retrieves all contradiction records for an observability session.
     * Lấy tất cả các bản ghi mâu thuẫn cho một phiên quan sát.
     */
    getContradictions(sessionId: ObservabilitySessionId): readonly ObservabilityContradictionRecord[];
    /**
     * Clears in-memory contradictions.
     * Xóa các mâu thuẫn trong bộ nhớ.
     */
    clear(sessionId?: ObservabilitySessionId): void;
}
