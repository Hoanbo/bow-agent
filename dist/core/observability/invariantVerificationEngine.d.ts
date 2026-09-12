import { type ObservabilitySessionId, type InvariantCheck, type InvariantCategory } from './observabilityTypes.js';
export interface InvariantEvaluationInput {
    readonly sessionId: ObservabilitySessionId;
    readonly targetId: string;
    readonly category: InvariantCategory;
    readonly name: string;
    readonly expectedValue: string;
    readonly observedValue: string;
    readonly targetPath?: string;
    readonly isUserStopActive?: boolean;
    readonly isRevoked?: boolean;
}
export declare class InvariantVerificationEngine {
    private checks;
    /**
     * Asserts and verifies that a path does not breach protected workspace isolation boundaries.
     * Xác nhận và kiểm tra rằng một đường dẫn không vi phạm ranh giới cách ly không gian làm việc được bảo vệ.
     */
    verifyWorkspaceIsolation(targetPath?: string): {
        readonly valid: boolean;
        readonly reason?: string;
    };
    /**
     * Evaluates a single system invariant against observed state.
     * Đánh giá một bất biến hệ thống duy nhất so với trạng thái quan sát được.
     */
    evaluateInvariant(input: InvariantEvaluationInput): InvariantCheck;
    /**
     * Retrieves all invariant checks performed in a given session.
     * Lấy tất cả các kiểm tra bất biến đã thực hiện trong một phiên đã cho.
     */
    getChecks(sessionId: ObservabilitySessionId): readonly InvariantCheck[];
    /**
     * Clears in-memory invariant checks.
     * Xóa các kiểm tra bất biến trong bộ nhớ.
     */
    clear(sessionId?: ObservabilitySessionId): void;
}
