import { type PromotionId, type PromotionRollbackResult } from './promotionTypes.js';
import { ControlledPromotionEngine } from './controlledPromotionEngine.js';
import { AuditLedger } from '../auditLedger.js';
export interface ExecuteRollbackInput {
    readonly promotionId: PromotionId;
    readonly rolledBackBy: string;
    readonly reason: string;
    readonly isUserStopActive?: boolean;
}
export declare class PromotionRollbackEngine {
    private readonly promotionEngine;
    private readonly auditLedger;
    private completedRollbacks;
    constructor(promotionEngine: ControlledPromotionEngine, auditLedger?: AuditLedger);
    /**
     * Executes a governed rollback of a previously promoted change set.
     * Thực thi việc hoàn tác có quản trị của một tập hợp thay đổi đã xúc tiến trước đó.
     */
    executeRollback(input: ExecuteRollbackInput): PromotionRollbackResult;
    /**
     * Records a canonical audit ledger event.
     * Ghi lại một sự kiện nhật ký kiểm toán chuẩn tắc.
     */
    private logAudit;
    /**
     * Retrieves an existing rollback result by promotionId.
     * Lấy kết quả hoàn tác hiện có theo promotionId.
     */
    getRollbackResult(promotionId: string): PromotionRollbackResult | undefined;
    /**
     * Clears in-memory rollback records.
     * Xóa sạch các bản ghi hoàn tác trong bộ nhớ.
     */
    clear(): void;
}
