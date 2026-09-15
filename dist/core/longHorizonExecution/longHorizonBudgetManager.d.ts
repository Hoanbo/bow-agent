import { type LongHorizonAutonomyBudget, type LongHorizonResourceUsage } from './longHorizonExecutionTypes.js';
export interface BudgetLedger {
    budget: LongHorizonAutonomyBudget;
    generationsConsumed: number;
    stepsConsumed: number;
    replanningAttempts: number;
    executionAttempts: number;
    consecutiveFailures: number;
    stagnationCycles: number;
    startedAt: string;
}
export declare class LongHorizonBudgetManager {
    /**
     * EN: Initializes a fresh resource usage tracker for a session.
     * VI: Khởi tạo một bộ theo dõi sử dụng tài nguyên mới cho một phiên.
     */
    initializeUsage(): LongHorizonResourceUsage;
    /**
     * EN: Checks current resource consumption against the immutable budget and throws if exhausted.
     * VI: Kiểm tra mức tiêu thụ tài nguyên hiện tại so với ngân sách bất biến và ném lỗi nếu cạn kiệt.
     */
    assertBudgetWithinLimits(budget: LongHorizonAutonomyBudget, usage: LongHorizonResourceUsage): void;
    /**
     * EN: Records incremental resource usage returning an updated immutable usage record.
     * VI: Ghi lại việc sử dụng tài nguyên tăng dần, trả về bản ghi sử dụng bất biến đã cập nhật.
     */
    recordUsage(current: LongHorizonResourceUsage, delta: Partial<LongHorizonResourceUsage>): LongHorizonResourceUsage;
    initializeBudgetLedger(budget: LongHorizonAutonomyBudget): BudgetLedger;
    consumeGeneration(ledger: BudgetLedger): void;
    consumeStep(ledger: BudgetLedger): void;
    consumeReplan(ledger: BudgetLedger): void;
    recordFailure(ledger: BudgetLedger): void;
    recordSuccess(ledger: BudgetLedger): void;
    recordStagnation(ledger: BudgetLedger): void;
    enforceBudget(ledger: BudgetLedger): void;
}
