import { type PromotionId, type PromotionProposal, type PromotionApprovalRecord, type PromotionExecutionResult, type PromotionRollbackResult, type PromotionValidationResult, type PromotionConflict, type PromotionEvidenceBundle } from './promotionTypes.js';
import { PromotionProposalEngine, type CreateProposalInput } from './promotionProposalEngine.js';
import { PromotionValidationEngine, type ValidateProposalInput } from './promotionValidationEngine.js';
import { PromotionConflictEngine, type ConflictCheckInput } from './promotionConflictEngine.js';
import { PromotionReviewEngine, type PromotionReviewInput } from './promotionReviewEngine.js';
import { PromotionAuthorizationEngine, type IssuePromotionTokenInput } from './promotionAuthorizationEngine.js';
import { ControlledPromotionEngine, type ExecutePromotionInput } from './controlledPromotionEngine.js';
import { PromotionRollbackEngine, type ExecuteRollbackInput } from './promotionRollbackEngine.js';
import { PromotionProvenanceEngine } from './promotionProvenanceEngine.js';
import { AuditLedger } from '../auditLedger.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export declare class PromotionRuntime {
    private readonly auditLedger;
    readonly proposalEngine: PromotionProposalEngine;
    readonly validationEngine: PromotionValidationEngine;
    readonly conflictEngine: PromotionConflictEngine;
    readonly reviewEngine: PromotionReviewEngine;
    readonly authEngine: PromotionAuthorizationEngine;
    readonly promotionEngine: ControlledPromotionEngine;
    readonly rollbackEngine: PromotionRollbackEngine;
    readonly provenanceEngine: PromotionProvenanceEngine;
    private proposals;
    private evidenceBundles;
    private _isStopped;
    private _stopReason;
    constructor(auditLedger?: AuditLedger);
    /**
     * Asserts that emergency USER_STOP is not active.
     * Khẳng định rằng lệnh dừng khẩn cấp USER_STOP không đang kích hoạt.
     */
    private assertNotStopped;
    /**
     * Universal USER_STOP request for the promotion subsystem.
     * Yêu cầu dừng khẩn cấp USER_STOP toàn cục cho phân hệ xúc tiến.
     */
    requestUserStop(reason: string): void;
    /**
     * Resets USER_STOP under Master Owner authority.
     * Thiết lập lại USER_STOP dưới thẩm quyền của Master Owner.
     */
    resetUserStop(): void;
    /**
     * Checks whether USER_STOP is currently active.
     * Kiểm tra xem USER_STOP có đang kích hoạt hay không.
     */
    isUserStopped(): boolean;
    /**
     * Creates and stores a new promotion proposal.
     * Tạo và lưu trữ một đề xuất xúc tiến mới.
     */
    createProposal(input: CreateProposalInput): PromotionProposal;
    /**
     * Validates a promotion proposal against live context.
     * Xác thực đề xuất xúc tiến với ngữ cảnh trực tiếp.
     */
    validateProposal(input: ValidateProposalInput): PromotionValidationResult;
    /**
     * Detects conflicts for a proposal.
     * Phát hiện các xung đột cho đề xuất.
     */
    detectConflicts(input: ConflictCheckInput): PromotionConflict[];
    /**
     * Reviews and records supervisory or owner approval decision.
     * Đánh giá và ghi nhận quyết định phê duyệt của người giám sát hoặc Owner.
     */
    reviewProposal(input: PromotionReviewInput): PromotionApprovalRecord;
    /**
     * Issues a canonical authorization token for promotion execution.
     * Cấp mã ủy quyền chuẩn tắc để thực thi đợt xúc tiến.
     */
    issuePromotionToken(input: IssuePromotionTokenInput): AuthorizationToken;
    /**
     * Executes a controlled change promotion and creates the evidence bundle.
     * Thực thi đợt xúc tiến thay đổi có kiểm soát và tạo gói bằng chứng.
     */
    executePromotion(input: ExecutePromotionInput): {
        result: PromotionExecutionResult;
        evidence: PromotionEvidenceBundle;
    };
    /**
     * Rolls back a previously executed promotion.
     * Hoàn tác đợt xúc tiến đã thực thi trước đó.
     */
    executeRollback(input: ExecuteRollbackInput): PromotionRollbackResult;
    /**
     * Retrieves a stored proposal by promotionId.
     * Lấy đề xuất được lưu trữ theo promotionId.
     */
    getProposal(promotionId: PromotionId): PromotionProposal | undefined;
    /**
     * Retrieves an evidence bundle by promotionId.
     * Lấy gói bằng chứng theo promotionId.
     */
    getEvidenceBundle(promotionId: PromotionId): PromotionEvidenceBundle | undefined;
    /**
     * Records a canonical audit ledger event.
     * Ghi lại một sự kiện nhật ký kiểm toán chuẩn tắc.
     */
    private logAudit;
    /**
     * Clears in-memory runtime records.
     * Xóa sạch các bản ghi runtime trong bộ nhớ.
     */
    clear(): void;
}
export declare const globalPromotionRuntime: PromotionRuntime;
