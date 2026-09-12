import { type PromotionProposal, type PromotionApprovalRecord } from './promotionTypes.js';
import { SupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
export interface PromotionReviewInput {
    readonly proposal: PromotionProposal;
    readonly reviewerId: string;
    readonly reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
    readonly decision: 'APPROVED' | 'REJECTED';
    readonly rationale: string;
}
export declare class PromotionReviewEngine {
    private readonly humanGate;
    private approvals;
    constructor(humanGate?: SupervisorHumanGate);
    /**
     * Evaluates and records a supervisory or Master Owner review decision on a proposal.
     * Đánh giá và ghi nhận quyết định xem xét của người giám sát hoặc Master Owner trên đề xuất.
     */
    reviewProposal(input: PromotionReviewInput): PromotionApprovalRecord;
    /**
     * Creates a formal HumanGate request through the canonical SupervisorHumanGate.
     * Tạo yêu cầu HumanGate chính thức thông qua SupervisorHumanGate chuẩn tắc.
     */
    requestHumanGateApproval(proposal: PromotionProposal, gateId?: string): Promise<boolean>;
    /**
     * Retrieves an existing approval record for a promotion.
     * Lấy bản ghi phê duyệt hiện có cho một đợt xúc tiến.
     */
    getApproval(promotionId: string): PromotionApprovalRecord | undefined;
    /**
     * Clears in-memory approval records.
     * Xóa sạch các bản ghi phê duyệt trong bộ nhớ.
     */
    clear(): void;
}
