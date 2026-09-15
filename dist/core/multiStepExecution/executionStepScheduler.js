// src/core/multiStepExecution/executionStepScheduler.ts
// BOWCON V4.0 — MS-1.5.10: EXECUTION STEP SCHEDULER
// Component 1071 — REAL
//
// EN: Deterministic dependency-aware step scheduler. Evaluates step dependencies,
//     identifies candidates ready for execution scheduling, and enforces topological order.
//     Strictly upholds invariant: READY != AUTHORIZED (Scheduling does NOT confer execution authority).
// VI: Bộ lập lịch bước thực thi nhận biết phụ thuộc xác định. Đánh giá các phụ thuộc bước,
//     xác định các ứng viên sẵn sàng lập lịch và thực thi thứ tự topo.
//     Tuân thủ nghiêm ngặt bất biến: READY != AUTHORIZED (Lập lịch KHÔNG trao quyền thực thi).
import { MAX_EXECUTION_STEPS, MultiStepExecutionDependencyError, MultiStepExecutionValidationError, } from './multiStepExecutionTypes.js';
import { MultiStepExecutionValidator } from './multiStepExecutionValidator.js';
export class ExecutionStepScheduler {
    /**
     * EN: Evaluates current step states in a generation and computes ready vs blocked steps.
     * VI: Đánh giá các trạng thái bước hiện tại trong thế hệ và tính toán các bước sẵn sàng so với bị chặn.
     */
    static evaluateStepReadiness(generation) {
        MultiStepExecutionValidator.validateGeneration(generation);
        const steps = generation.stepStates;
        const allStepList = Object.values(steps).sort((a, b) => a.stepIndex - b.stepIndex);
        if (allStepList.length > MAX_EXECUTION_STEPS) {
            throw new MultiStepExecutionValidationError(`Step count exceeds MAX_EXECUTION_STEPS limit of ${MAX_EXECUTION_STEPS}`);
        }
        const readySteps = [];
        const blockedSteps = [];
        const completedSteps = [];
        const failedSteps = [];
        const invalidatedSteps = [];
        // Track statuses of all steps
        const stepStatusMap = new Map();
        for (const step of allStepList) {
            stepStatusMap.set(step.stepId, step.status);
            if (step.status === 'COMPLETED') {
                completedSteps.push(step);
            }
            else if (step.status === 'FAILED') {
                failedSteps.push(step);
            }
            else if (step.status === 'INVALIDATED') {
                invalidatedSteps.push(step);
            }
        }
        // Determine readiness for non-terminal steps
        for (const step of allStepList) {
            if (step.status === 'COMPLETED' ||
                step.status === 'FAILED' ||
                step.status === 'SKIPPED' ||
                step.status === 'INVALIDATED' ||
                step.status === 'PREEMPTED') {
                continue;
            }
            // Check all dependencies
            let allDepsSatisfied = true;
            let hasFailedOrInvalidDep = false;
            for (const depId of step.dependencies) {
                const depStatus = stepStatusMap.get(depId);
                if (depStatus === 'FAILED' || depStatus === 'INVALIDATED') {
                    hasFailedOrInvalidDep = true;
                    allDepsSatisfied = false;
                    break;
                }
                if (depStatus !== 'COMPLETED') {
                    allDepsSatisfied = false;
                }
            }
            if (hasFailedOrInvalidDep) {
                // Step is blocked by a failed/invalidated upstream dependency
                blockedSteps.push(step);
            }
            else if (allDepsSatisfied) {
                readySteps.push(step);
            }
            else {
                blockedSteps.push(step);
            }
        }
        // Deterministically select the first ready step by stepIndex
        const nextExecutableStep = readySteps.length > 0 ? readySteps[0] : undefined;
        const isPlanExhausted = readySteps.length === 0 &&
            blockedSteps.length === 0 &&
            completedSteps.length + failedSteps.length + invalidatedSteps.length === allStepList.length;
        return {
            readySteps,
            blockedSteps,
            completedSteps,
            failedSteps,
            invalidatedSteps,
            nextExecutableStep,
            isPlanExhausted,
        };
    }
    /**
     * EN: Identifies which downstream steps must be invalidated when a given step fails or is invalidated.
     * VI: Xác định các bước hạ nguồn nào phải bị vô hiệu hóa khi một bước cụ thể thất bại hoặc bị vô hiệu hóa.
     */
    static computeCascadingInvalidations(failedStepId, steps) {
        if (!steps[failedStepId]) {
            throw new MultiStepExecutionDependencyError(`Cannot compute invalidations for unknown step "${failedStepId}"`);
        }
        const invalidated = new Set();
        const queue = [failedStepId];
        while (queue.length > 0) {
            const current = queue.shift();
            for (const [candidateId, candidateStep] of Object.entries(steps)) {
                if (candidateStep.dependencies.includes(current) && !invalidated.has(candidateId)) {
                    invalidated.add(candidateId);
                    queue.push(candidateId);
                }
            }
        }
        return Array.from(invalidated).sort();
    }
    /**
     * EN: Computes a deterministic topological ordering of all steps in the generation.
     * VI: Tính toán thứ tự topo xác định của tất cả các bước trong thế hệ.
     */
    static getTopologicalOrder(generation) {
        MultiStepExecutionValidator.validateStepDependencies(generation.stepStates);
        const steps = generation.stepStates;
        const inDegree = new Map();
        const adj = new Map();
        for (const stepId of Object.keys(steps)) {
            inDegree.set(stepId, 0);
            adj.set(stepId, []);
        }
        for (const [stepId, step] of Object.entries(steps)) {
            for (const depId of step.dependencies) {
                adj.get(depId).push(stepId);
                inDegree.set(stepId, (inDegree.get(stepId) ?? 0) + 1);
            }
        }
        // Deterministic priority queue sorted by stepIndex
        const zeroInDegree = Object.values(steps)
            .filter((s) => (inDegree.get(s.stepId) ?? 0) === 0)
            .sort((a, b) => a.stepIndex - b.stepIndex)
            .map((s) => s.stepId);
        const order = [];
        while (zeroInDegree.length > 0) {
            const curr = zeroInDegree.shift();
            order.push(curr);
            const neighbors = adj.get(curr) ?? [];
            for (const next of neighbors) {
                const remaining = (inDegree.get(next) ?? 0) - 1;
                inDegree.set(next, remaining);
                if (remaining === 0) {
                    zeroInDegree.push(next);
                    // Keep deterministic order
                    zeroInDegree.sort((a, b) => (steps[a]?.stepIndex ?? 0) - (steps[b]?.stepIndex ?? 0));
                }
            }
        }
        if (order.length !== Object.keys(steps).length) {
            throw new MultiStepExecutionDependencyError('Cyclic dependency prevented topological ordering');
        }
        return order;
    }
}
