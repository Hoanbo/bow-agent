import { type PromotionProposal, type PromotionApprovalRecord, type PromotionExecutionResult, type PromotionRollbackBackup } from './promotionTypes.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { PromotionAuthorizationEngine } from './promotionAuthorizationEngine.js';
import { AuditLedger } from '../auditLedger.js';
export interface ExecutePromotionInput {
    readonly proposal: PromotionProposal;
    readonly approval: PromotionApprovalRecord;
    readonly authorizationToken: AuthorizationToken;
    readonly sandbox: SandboxDescriptor;
    readonly executedBy: string;
    readonly isUserStopActive?: boolean;
}
export declare class ControlledPromotionEngine {
    private readonly authEngine;
    private readonly auditLedger;
    private rollbackBackups;
    private completedPromotions;
    constructor(authEngine: PromotionAuthorizationEngine, auditLedger?: AuditLedger);
    /**
     * Applies approved changes to the authorized target project directory with backup capture.
     * Áp dụng các thay đổi đã phê duyệt vào thư mục dự án mục tiêu được phép kèm theo việc sao lưu.
     */
    executePromotion(input: ExecutePromotionInput): PromotionExecutionResult;
    /**
     * Retrieves backups stored for a promotion execution.
     * Lấy các bản sao lưu được lưu trữ cho một đợt thực thi xúc tiến.
     */
    getBackups(promotionId: string): readonly PromotionRollbackBackup[] | undefined;
    /**
     * Retrieves a completed promotion result by promotionId.
     * Lấy kết quả xúc tiến đã hoàn thành theo promotionId.
     */
    getCompletedPromotion(promotionId: string): PromotionExecutionResult | undefined;
    /**
     * Records a canonical audit ledger event.
     * Ghi lại một sự kiện nhật ký kiểm toán chuẩn tắc.
     */
    private logAudit;
    /**
     * Clears in-memory promotion records.
     * Xóa sạch các bản ghi xúc tiến trong bộ nhớ.
     */
    clear(): void;
}
