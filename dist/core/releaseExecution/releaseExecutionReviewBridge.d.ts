import { type ReleaseExecutionRequest, type ReleaseExecutionApprovalBinding } from './releaseExecutionTypes.js';
import type { ReleaseCandidate, ReleaseVerificationRecord } from '../release/releaseTypes.js';
import { SupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import type { HumanGateRequest } from '../supervisor/supervisorTypes.js';
export interface RecordReviewInput {
    readonly request: ReleaseExecutionRequest;
    readonly candidate: ReleaseCandidate;
    readonly verification: ReleaseVerificationRecord;
    readonly reviewerId: string;
    readonly reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
    readonly decision: 'APPROVED' | 'REJECTED';
    readonly rationale: string;
}
export declare class ReleaseExecutionReviewBridge {
    private readonly humanGate;
    private approvals;
    constructor(humanGate?: SupervisorHumanGate);
    /**
     * Records a human supervisory or Master Owner review decision on a release execution request.
     * Ghi nhận quyết định xem xét của người giám sát hoặc Master Owner trên yêu cầu thực thi phát hành.
     */
    recordReview(input: RecordReviewInput): ReleaseExecutionApprovalBinding;
    /**
     * Dispatches a formal gate request to the canonical SupervisorHumanGate.
     * Gửi yêu cầu cổng chính thức đến SupervisorHumanGate chuẩn tắc.
     */
    requestHumanGate(request: ReleaseExecutionRequest, candidate: ReleaseCandidate): HumanGateRequest;
    /**
     * Retrieves an existing approval record by executionId.
     * Lấy bản ghi phê duyệt hiện có theo executionId.
     */
    getApproval(executionId: string): ReleaseExecutionApprovalBinding | undefined;
}
