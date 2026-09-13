// src/core/agentLoopFacade/agentLoopRetryGovernor.ts
// BOWCON V4.0 — MS-1.4.10: AGENT LOOP RETRY GOVERNOR
//
// EN:
// Enforces hard execution ceilings, iteration bounds, step attempt caps,
// and strict transient-only retry eligibility.
// Forbids retry on PDP DENY, security violations, USER_STOP, stale versions,
// and commit failures.
//
// VI:
// Thực thi các trần thực thi cứng, giới hạn số vòng lặp, giới hạn số lần thử bước
// và tính đủ điều kiện thử lại nghiêm ngặt chỉ dành cho lỗi tạm thời (transient).
// Cấm thử lại khi PDP DENY, vi phạm an ninh, USER_STOP, lỗi phiên bản cũ và lỗi commit.
import { MAX_LOOP_ITERATIONS, MAX_STEP_ATTEMPTS, MAX_CONSECUTIVE_DENIALS, MAX_TASK_EXECUTION_TIME_MS, AgentLoopBudgetExceededError, } from './agentLoopFacadeTypes.js';
export class AgentLoopRetryGovernor {
    maxIterations;
    maxStepAttempts;
    maxConsecutiveDenials;
    maxExecutionTimeMs;
    currentIteration = 0;
    consecutiveDenials = 0;
    stepAttempts = new Map();
    startTimeMs = 0;
    constructor(options) {
        this.maxIterations = Math.min(options?.maxIterations ?? MAX_LOOP_ITERATIONS, MAX_LOOP_ITERATIONS);
        this.maxStepAttempts = Math.min(options?.maxStepAttempts ?? MAX_STEP_ATTEMPTS, MAX_STEP_ATTEMPTS);
        this.maxConsecutiveDenials = Math.min(options?.maxConsecutiveDenials ?? MAX_CONSECUTIVE_DENIALS, MAX_CONSECUTIVE_DENIALS);
        this.maxExecutionTimeMs = Math.min(options?.maxExecutionTimeMs ?? MAX_TASK_EXECUTION_TIME_MS, MAX_TASK_EXECUTION_TIME_MS);
    }
    /**
     * EN: Initializes the governor at the start of a loop run.
     */
    start() {
        this.currentIteration = 0;
        this.consecutiveDenials = 0;
        this.stepAttempts.clear();
        this.startTimeMs = Date.now();
    }
    /**
     * EN: Returns the current iteration count.
     */
    getIteration() {
        return this.currentIteration;
    }
    /**
     * EN: Increments iteration count and asserts that max iteration bounds are respected.
     */
    advanceIteration() {
        this.assertWithinTimeLimit();
        this.currentIteration++;
        if (this.currentIteration > this.maxIterations) {
            throw new AgentLoopBudgetExceededError(`Agent loop exceeded maximum allowed iterations (${this.maxIterations})`, { maxIterations: this.maxIterations, currentIteration: this.currentIteration });
        }
        return this.currentIteration;
    }
    /**
     * EN: Asserts that total elapsed execution time is within the maximum allowed window.
     */
    assertWithinTimeLimit() {
        if (this.startTimeMs === 0) {
            return;
        }
        const elapsed = Date.now() - this.startTimeMs;
        if (elapsed > this.maxExecutionTimeMs) {
            throw new AgentLoopBudgetExceededError(`Agent loop exceeded maximum task execution time of ${this.maxExecutionTimeMs}ms (elapsed: ${elapsed}ms)`, { maxExecutionTimeMs: this.maxExecutionTimeMs, elapsedMs: elapsed });
        }
    }
    /**
     * EN: Records a policy denial. Throws if consecutive denials exceed the hard ceiling.
     */
    recordDenial(stepId) {
        this.consecutiveDenials++;
        if (this.consecutiveDenials >= this.maxConsecutiveDenials) {
            throw new AgentLoopBudgetExceededError(`Agent loop reached maximum consecutive policy denials (${this.maxConsecutiveDenials}) at step '${stepId}'`, { maxConsecutiveDenials: this.maxConsecutiveDenials, consecutiveDenials: this.consecutiveDenials, stepId });
        }
    }
    /**
     * EN: Resets consecutive denials counter upon a permitted action.
     */
    resetDenials() {
        this.consecutiveDenials = 0;
    }
    /**
     * EN: Increments the attempt counter for a specific step.
     */
    recordStepAttempt(stepId) {
        const attempts = (this.stepAttempts.get(stepId) ?? 0) + 1;
        this.stepAttempts.set(stepId, attempts);
        if (attempts > this.maxStepAttempts) {
            throw new AgentLoopBudgetExceededError(`Step '${stepId}' exceeded maximum attempt count (${this.maxStepAttempts})`, { stepId, maxAttempts: this.maxStepAttempts, currentAttempts: attempts });
        }
        return attempts;
    }
    /**
     * EN: Evaluates whether a failure is eligible for transient retry.
     * Returns true ONLY for transient failures within step attempt limits.
     * NEVER allows retry for DENY, security violations, USER_STOP, stale task versions, or commit errors.
     */
    isRetryEligible(params) {
        const { stepId, error, isTransient } = params;
        // Strict non-retryable error types
        const errName = error.name || '';
        const errCode = error.code || '';
        const errMsg = error.message.toLowerCase();
        if (errName.includes('Aborted') ||
            errCode.includes('ABORTED') ||
            errMsg.includes('user_stop') ||
            errName.includes('Security') ||
            errCode.includes('SECURITY') ||
            errName.includes('CrossTenant') ||
            errCode.includes('CROSS_TENANT') ||
            errName.includes('Stale') ||
            errCode.includes('STALE') ||
            errCode.includes('CONCURRENCY') ||
            errName.includes('Denied') ||
            errCode.includes('DENIED') ||
            errMsg.includes('denied') ||
            errName.includes('Commit') ||
            errCode.includes('COMMIT')) {
            return false;
        }
        // Step attempt check
        const currentAttempts = this.stepAttempts.get(stepId) ?? 0;
        if (currentAttempts >= this.maxStepAttempts) {
            return false;
        }
        // Must be marked transient or recognize standard transient signatures (timeout, ETIMEDOUT, ECONNRESET)
        return isTransient === true || errMsg.includes('timeout') || errMsg.includes('timed out');
    }
    canAttemptStep(stepId) {
        const attempts = this.stepAttempts.get(stepId) ?? 0;
        return attempts < this.maxStepAttempts;
    }
    canProceedAfterDenial() {
        return this.consecutiveDenials < this.maxConsecutiveDenials;
    }
    isRetryableFailure(error) {
        const errName = error.name || '';
        const errCode = error.code || '';
        const errMsg = error.message.toLowerCase();
        if (errName.includes('Aborted') ||
            errCode.includes('ABORTED') ||
            errMsg.includes('user_stop') ||
            errName.includes('Security') ||
            errCode.includes('SECURITY') ||
            errName.includes('CrossTenant') ||
            errCode.includes('CROSS_TENANT') ||
            errName.includes('Stale') ||
            errCode.includes('STALE') ||
            errCode.includes('CONCURRENCY') ||
            errName.includes('Denied') ||
            errCode.includes('DENIED') ||
            errMsg.includes('denied') ||
            errName.includes('Commit') ||
            errCode.includes('COMMIT')) {
            return false;
        }
        return true;
    }
    canIterate(iteration) {
        const iter = iteration ?? this.currentIteration;
        return iter <= this.maxIterations;
    }
    isTimeExceeded(startTimeMs, limitMs) {
        const limit = limitMs ?? this.maxExecutionTimeMs;
        return Date.now() - startTimeMs > limit;
    }
    getMaxIterations() {
        return this.maxIterations;
    }
    getMaxStepAttempts() {
        return this.maxStepAttempts;
    }
    getMaxConsecutiveDenials() {
        return this.maxConsecutiveDenials;
    }
    getMaxExecutionTimeMs() {
        return this.maxExecutionTimeMs;
    }
}
