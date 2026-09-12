import { type ReleaseExecutionId, type ReleaseExecutionRequest, type ReleaseExecutionApprovalBinding, type ReleaseExecutionAuthorizationBinding, type ReleaseExecutionResult, type ReleaseExecutionContradiction, type ReleaseExecutionState } from './releaseExecutionTypes.js';
import type { ReleaseCandidate, ReleaseVerificationRecord } from '../release/releaseTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { ReleaseExecutionAuthorizationBridge } from './releaseExecutionAuthorizationBridge.js';
import { ReleaseExecutionReviewBridge, type RecordReviewInput } from './releaseExecutionReviewBridge.js';
import { GovernedReleaseExecutionEngine } from './governedReleaseExecutionEngine.js';
import { AuditLedger } from '../auditLedger.js';
import type { HumanGateRequest } from '../supervisor/supervisorTypes.js';
export interface ExecuteReleaseOptions {
    readonly sourceFiles?: readonly {
        readonly relativePath: string;
        readonly content: string | Buffer;
    }[];
    readonly sourceDirectory?: string;
    readonly expectedFiles?: readonly string[];
}
export declare class ReleaseExecutionRuntime {
    private readonly authBridge;
    private readonly reviewBridge;
    private readonly executionEngine;
    private readonly auditLedger;
    private requests;
    private candidates;
    private verifications;
    private approvals;
    private authBindings;
    private results;
    private states;
    private isUserStopActive;
    private isRevoked;
    constructor(authBridge?: ReleaseExecutionAuthorizationBridge, reviewBridge?: ReleaseExecutionReviewBridge, executionEngine?: GovernedReleaseExecutionEngine, auditLedger?: AuditLedger);
    /**
     * Helper to log an immutable audit event to the canonical AuditLedger.
     * Hàm hỗ trợ ghi sự kiện kiểm toán bất biến vào AuditLedger chuẩn tắc.
     */
    private logAudit;
    /**
     * Sets USER_STOP emergency state.
     * Thiết lập trạng thái khẩn cấp USER_STOP.
     */
    setUserStop(active: boolean): void;
    /**
     * Sets revocation state for authority leases or delegations.
     * Thiết lập trạng thái thu hồi cho các hợp đồng thuê quyền hạn hoặc ủy quyền.
     */
    setRevoked(revoked: boolean): void;
    /**
     * Submits and validates a new release execution request.
     * Gửi và xác thực yêu cầu thực thi phát hành mới.
     */
    requestExecution(request: ReleaseExecutionRequest, candidate: ReleaseCandidate, verification: ReleaseVerificationRecord): ReleaseExecutionRequest;
    /**
     * Records human supervisory or Master Owner review.
     * Ghi nhận xem xét của người giám sát hoặc Master Owner.
     */
    recordReview(input: Omit<RecordReviewInput, 'request' | 'candidate' | 'verification'> & {
        readonly executionId: ReleaseExecutionId;
    }): ReleaseExecutionApprovalBinding;
    /**
     * Dispatches human gate approval request through canonical SupervisorHumanGate.
     * Gửi yêu cầu phê duyệt cổng con người thông qua SupervisorHumanGate chuẩn tắc.
     */
    requestHumanGate(executionId: ReleaseExecutionId): HumanGateRequest;
    /**
     * Issues execution authorization token via canonical WorldActionAuthorizationEngine.
     * Cấp mã ủy quyền thực thi thông qua WorldActionAuthorizationEngine chuẩn tắc.
     */
    issueAuthorizationToken(executionId: ReleaseExecutionId, ttlMs?: number): {
        readonly token: AuthorizationToken;
        readonly binding: ReleaseExecutionAuthorizationBinding;
    };
    /**
     * Executes the authorized release mutation, performs post-verification, and handles rollback.
     * Thực thi đột biến phát hành được ủy quyền, thực hiện xác minh sau thực thi và xử lý hoàn tác.
     */
    executeRelease(executionId: ReleaseExecutionId, token: AuthorizationToken, options?: ExecuteReleaseOptions): ReleaseExecutionResult;
    /**
     * Detects multi-agent contradictions across release execution results.
     * Rejects majority voting; any conflict yields CONTRADICTED state.
     *
     * Phát hiện mâu thuẫn đa tác nhân giữa các kết quả thực thi phát hành.
     * Từ chối bỏ phiếu đa số; bất kỳ xung đột nào đều dẫn đến trạng thái CONTRADICTED.
     */
    detectContradictions(executionId: ReleaseExecutionId, agentReports: readonly {
        readonly agentId: string;
        readonly state: ReleaseExecutionState;
        readonly resultHash: string;
    }[]): ReleaseExecutionContradiction | undefined;
    /**
     * Retrieves an execution result by executionId.
     * Lấy kết quả thực thi theo executionId.
     */
    getResult(executionId: ReleaseExecutionId): ReleaseExecutionResult | undefined;
    /**
     * Retrieves the current execution state by executionId.
     * Lấy trạng thái thực thi hiện tại theo executionId.
     */
    getState(executionId: ReleaseExecutionId): ReleaseExecutionState | undefined;
    /**
     * Clears in-memory runtime records (useful for test resets).
     * Xóa các bản ghi runtime trong bộ nhớ (hữu ích cho việc đặt lại kiểm thử).
     */
    clear(): void;
}
