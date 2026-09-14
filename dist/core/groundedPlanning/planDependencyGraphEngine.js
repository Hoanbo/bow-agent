// src/core/groundedPlanning/planDependencyGraphEngine.ts
// BOWCON V4.0 — MS-1.5.07: PLAN DEPENDENCY GRAPH ENGINE
// Component 1041 — REAL
//
// EN: Enforces DAG integrity across plan steps, detects circular dependencies via DFS,
//     validates dependency ceilings, and calculates deterministic topological execution order.
// VI: Thực thi tính toàn vẹn DAG giữa các bước kế hoạch, phát hiện phụ thuộc vòng qua DFS,
//     kiểm tra giới hạn độ sâu và tính toán thứ tự thực thi topo tất định.
import { GROUNDED_PLAN_BOUNDS, GroundedPlanCycleError, GroundedPlanValidationError, } from './groundedPlanTypes.js';
export class PlanDependencyGraphEngine {
    /**
     * EN: Validates step dependencies, checks for cycles, and returns topologically ordered steps.
     * VI: Xác thực phụ thuộc giữa các bước, kiểm tra chu trình và trả về các bước xếp theo thứ tự topo.
     */
    static validateAndSort(steps) {
        if (steps.length === 0)
            return [];
        const stepMap = new Map();
        for (const step of steps) {
            if (stepMap.has(step.stepId)) {
                throw new GroundedPlanValidationError(`Duplicate stepId detected in plan: '${step.stepId}'`);
            }
            stepMap.set(step.stepId, step);
        }
        // 1. Validate Dependency References & Self-References
        for (const step of steps) {
            for (const depId of step.dependsOnStepIds) {
                if (depId === step.stepId) {
                    throw new GroundedPlanCycleError([step.stepId, step.stepId]);
                }
                if (!stepMap.has(depId)) {
                    throw new GroundedPlanValidationError(`Step '${step.stepId}' references non-existent dependency '${depId}'`);
                }
            }
        }
        // 2. DFS Cycle Detection and Depth Check (Phát hiện chu trình và độ sâu DFS)
        const visited = new Set();
        const recursionStack = new Set();
        const checkCycles = (currentId, path, depth) => {
            if (depth > GROUNDED_PLAN_BOUNDS.MAX_DEPENDENCY_DEPTH) {
                throw new GroundedPlanValidationError(`Dependency chain depth exceeded maximum permitted limit of ${GROUNDED_PLAN_BOUNDS.MAX_DEPENDENCY_DEPTH} at step '${currentId}'`);
            }
            visited.add(currentId);
            recursionStack.add(currentId);
            path.push(currentId);
            const step = stepMap.get(currentId);
            for (const depId of step.dependsOnStepIds) {
                if (!visited.has(depId)) {
                    checkCycles(depId, path, depth + 1);
                }
                else if (recursionStack.has(depId)) {
                    // Cycle found! (Phát hiện chu trình)
                    const cycleStart = path.indexOf(depId);
                    const cycle = path.slice(cycleStart).concat(depId);
                    throw new GroundedPlanCycleError(cycle);
                }
            }
            recursionStack.delete(currentId);
            path.pop();
        };
        for (const step of steps) {
            if (!visited.has(step.stepId)) {
                checkCycles(step.stepId, [], 1);
            }
        }
        // 3. Deterministic Topological Sort (Kahn's Algorithm with Lexicographical Tie-Breaking)
        // Sắp xếp topo tất định với giải quyết hòa bằng thứ tự từ điển của stepId
        const inDegree = new Map();
        const dependents = new Map();
        for (const step of steps) {
            inDegree.set(step.stepId, step.dependsOnStepIds.length);
            for (const depId of step.dependsOnStepIds) {
                if (!dependents.has(depId))
                    dependents.set(depId, []);
                dependents.get(depId).push(step.stepId);
            }
        }
        // Queue of steps with 0 remaining dependencies (Hàng đợi các bước có bậc vào = 0)
        const available = [];
        for (const step of steps) {
            if (inDegree.get(step.stepId) === 0) {
                available.push(step);
            }
        }
        const sorted = [];
        while (available.length > 0) {
            // Deterministic tie-breaking by stepIndex, then stepId
            available.sort((a, b) => {
                if (a.stepIndex !== b.stepIndex)
                    return a.stepIndex - b.stepIndex;
                return a.stepId.localeCompare(b.stepId);
            });
            const next = available.shift();
            sorted.push(next);
            const nextDependents = dependents.get(next.stepId) ?? [];
            for (const depId of nextDependents) {
                const cur = inDegree.get(depId) - 1;
                inDegree.set(depId, cur);
                if (cur === 0) {
                    available.push(stepMap.get(depId));
                }
            }
        }
        if (sorted.length !== steps.length) {
            throw new GroundedPlanCycleError(['UNRESOLVED_CYCLE_IN_STEPS']);
        }
        return sorted;
    }
}
