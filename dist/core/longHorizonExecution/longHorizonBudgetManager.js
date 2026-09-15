// src/core/longHorizonExecution/longHorizonBudgetManager.ts
// BOWCON V4.0 — MS-1.5.11: LONG-HORIZON BUDGET MANAGER
// Component 1082 — REAL
//
// EN: Tracks and enforces the immutable autonomy budget across generations and steps.
//     Fails closed into BUDGET_EXHAUSTED upon limit breach with zero self-expansion.
// VI: Theo dõi và thực thi ngân sách tự chủ bất biến qua các thế hệ và bước.
//     Thất bại-đóng vào BUDGET_EXHAUSTED khi vi phạm giới hạn và không tự mở rộng.
import { LongHorizonBudgetExhaustedError, LongHorizonStagnationError, } from './longHorizonExecutionTypes.js';
import { LongHorizonExecutionValidator } from './longHorizonExecutionValidator.js';
export class LongHorizonBudgetManager {
    /**
     * EN: Initializes a fresh resource usage tracker for a session.
     * VI: Khởi tạo một bộ theo dõi sử dụng tài nguyên mới cho một phiên.
     */
    initializeUsage() {
        return Object.freeze({
            generationsConsumed: 0,
            stepsConsumed: 0,
            executionAttempts: 0,
            replanningAttempts: 0,
            consecutiveFailures: 0,
            stagnationCycles: 0,
            approvalsRequested: 0,
            environmentChecks: 0,
            persistenceOperations: 0,
            wallClockStartTime: new Date().toISOString(),
            wallClockElapsedMs: 0,
        });
    }
    /**
     * EN: Checks current resource consumption against the immutable budget and throws if exhausted.
     * VI: Kiểm tra mức tiêu thụ tài nguyên hiện tại so với ngân sách bất biến và ném lỗi nếu cạn kiệt.
     */
    assertBudgetWithinLimits(budget, usage) {
        LongHorizonExecutionValidator.validateBudget(budget);
        const now = Date.now();
        const startMs = Date.parse(usage.wallClockStartTime);
        const elapsedMs = Number.isNaN(startMs) ? usage.wallClockElapsedMs : now - startMs;
        if (usage.generationsConsumed >= budget.maxGenerations) {
            throw new LongHorizonBudgetExhaustedError(`Generation budget exhausted: ${usage.generationsConsumed} / ${budget.maxGenerations} generations consumed`, { budget, usage, reason: 'GENERATIONS_EXHAUSTED' });
        }
        if (usage.stepsConsumed >= budget.maxSteps) {
            throw new LongHorizonBudgetExhaustedError(`Step budget exhausted: ${usage.stepsConsumed} / ${budget.maxSteps} steps consumed`, { budget, usage, reason: 'STEPS_EXHAUSTED' });
        }
        if (usage.replanningAttempts >= budget.maxReplanningAttempts) {
            throw new LongHorizonBudgetExhaustedError(`Replanning budget exhausted: ${usage.replanningAttempts} / ${budget.maxReplanningAttempts} replans consumed`, { budget, usage, reason: 'REPLANNING_EXHAUSTED' });
        }
        if (usage.consecutiveFailures >= budget.maxConsecutiveFailures) {
            throw new LongHorizonBudgetExhaustedError(`Consecutive failure limit reached: ${usage.consecutiveFailures} / ${budget.maxConsecutiveFailures} failures`, { budget, usage, reason: 'CONSECUTIVE_FAILURES_EXCEEDED' });
        }
        if (usage.stagnationCycles >= budget.maxStagnationCycles) {
            throw new LongHorizonBudgetExhaustedError(`Stagnation limit reached: ${usage.stagnationCycles} / ${budget.maxStagnationCycles} stagnation cycles`, { budget, usage, reason: 'STAGNATION_CYCLES_EXCEEDED' });
        }
        if (elapsedMs >= budget.maxWallClockMs) {
            throw new LongHorizonBudgetExhaustedError(`Wall-clock time limit exceeded: ${elapsedMs}ms >= ${budget.maxWallClockMs}ms`, { budget, usage, reason: 'WALL_CLOCK_EXCEEDED' });
        }
    }
    /**
     * EN: Records incremental resource usage returning an updated immutable usage record.
     * VI: Ghi lại việc sử dụng tài nguyên tăng dần, trả về bản ghi sử dụng bất biến đã cập nhật.
     */
    recordUsage(current, delta) {
        const now = Date.now();
        const startMs = Date.parse(current.wallClockStartTime);
        const elapsedMs = Number.isNaN(startMs) ? current.wallClockElapsedMs : now - startMs;
        const updated = Object.freeze({
            generationsConsumed: current.generationsConsumed + (delta.generationsConsumed ?? 0),
            stepsConsumed: current.stepsConsumed + (delta.stepsConsumed ?? 0),
            executionAttempts: current.executionAttempts + (delta.executionAttempts ?? 0),
            replanningAttempts: current.replanningAttempts + (delta.replanningAttempts ?? 0),
            consecutiveFailures: delta.consecutiveFailures !== undefined ? delta.consecutiveFailures : current.consecutiveFailures,
            stagnationCycles: delta.stagnationCycles !== undefined ? delta.stagnationCycles : current.stagnationCycles,
            approvalsRequested: current.approvalsRequested + (delta.approvalsRequested ?? 0),
            environmentChecks: current.environmentChecks + (delta.environmentChecks ?? 0),
            persistenceOperations: current.persistenceOperations + (delta.persistenceOperations ?? 0),
            wallClockStartTime: current.wallClockStartTime,
            wallClockElapsedMs: elapsedMs,
        });
        return updated;
    }
    // ==========================================================================
    // BudgetLedger Helper Methods
    // ==========================================================================
    initializeBudgetLedger(budget) {
        LongHorizonExecutionValidator.validateBudget(budget);
        return {
            budget,
            generationsConsumed: 0,
            stepsConsumed: 0,
            replanningAttempts: 0,
            executionAttempts: 0,
            consecutiveFailures: 0,
            stagnationCycles: 0,
            startedAt: new Date().toISOString(),
        };
    }
    consumeGeneration(ledger) {
        if (ledger.generationsConsumed >= ledger.budget.maxGenerations) {
            throw new LongHorizonBudgetExhaustedError(`Generation budget exhausted: ${ledger.generationsConsumed} / ${ledger.budget.maxGenerations}`);
        }
        ledger.generationsConsumed++;
    }
    consumeStep(ledger) {
        if (ledger.stepsConsumed >= ledger.budget.maxSteps) {
            throw new LongHorizonBudgetExhaustedError(`Step budget exhausted: ${ledger.stepsConsumed} / ${ledger.budget.maxSteps}`);
        }
        ledger.stepsConsumed++;
    }
    consumeReplan(ledger) {
        if (ledger.replanningAttempts >= ledger.budget.maxReplanningAttempts) {
            throw new LongHorizonBudgetExhaustedError(`Replanning budget exhausted: ${ledger.replanningAttempts} / ${ledger.budget.maxReplanningAttempts}`);
        }
        ledger.replanningAttempts++;
    }
    recordFailure(ledger) {
        ledger.executionAttempts++;
        ledger.consecutiveFailures++;
        if (ledger.consecutiveFailures >= ledger.budget.maxConsecutiveFailures) {
            throw new LongHorizonBudgetExhaustedError(`Consecutive failures limit exceeded: ${ledger.consecutiveFailures} / ${ledger.budget.maxConsecutiveFailures}`);
        }
    }
    recordSuccess(ledger) {
        ledger.consecutiveFailures = 0;
    }
    recordStagnation(ledger) {
        ledger.stagnationCycles++;
        if (ledger.stagnationCycles >= ledger.budget.maxStagnationCycles) {
            throw new LongHorizonStagnationError(`Stagnation cycle limit reached: ${ledger.stagnationCycles} / ${ledger.budget.maxStagnationCycles}`);
        }
    }
    enforceBudget(ledger) {
        const startMs = Date.parse(ledger.startedAt);
        const elapsedMs = Date.now() - startMs;
        if (elapsedMs >= ledger.budget.maxWallClockMs) {
            throw new LongHorizonBudgetExhaustedError(`Wall-clock budget exhausted: ${elapsedMs}ms >= ${ledger.budget.maxWallClockMs}ms`);
        }
        if (ledger.generationsConsumed >= ledger.budget.maxGenerations) {
            throw new LongHorizonBudgetExhaustedError('Generations exhausted');
        }
        if (ledger.stepsConsumed >= ledger.budget.maxSteps) {
            throw new LongHorizonBudgetExhaustedError('Steps exhausted');
        }
        if (ledger.replanningAttempts >= ledger.budget.maxReplanningAttempts) {
            throw new LongHorizonBudgetExhaustedError('Replanning exhausted');
        }
    }
}
