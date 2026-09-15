// src/core/missionCoordination/missionObjectiveScheduler.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1101 — REAL
//
// EN: Governed objective DAG dependency scheduler, readiness evaluator, and cascading invalidator.
// VI: Trình lập lịch phụ thuộc DAG mục tiêu có quản trị, đánh giá tính sẵn sàng và vô hiệu hóa theo tầng.
import { MissionCoordinationDependencyError, MissionCoordinationValidationError, MAX_OBJECTIVE_DEPENDENCY_DEPTH, } from './missionCoordinationTypes.js';
export class MissionObjectiveScheduler {
    objectives = new Map();
    dependencies = new Map(); // objectiveId -> set of upstream dependency objectiveIds
    dependents = new Map(); // objectiveId -> set of downstream dependent objectiveIds
    constructor(initialObjectives = []) {
        for (const obj of initialObjectives) {
            this.registerObjective(obj);
        }
    }
    getObjectives() {
        return Array.from(this.objectives.values());
    }
    getObjective(objectiveId) {
        return this.objectives.get(objectiveId);
    }
    /**
     * EN: Registers an objective binding into the scheduler and builds dependency links.
     * VI: Đăng ký một ràng buộc mục tiêu vào trình lập lịch và xây dựng các liên kết phụ thuộc.
     */
    registerObjective(binding) {
        if (this.objectives.has(binding.objectiveId)) {
            throw new MissionCoordinationValidationError(`Duplicate objective ID detected: ${binding.objectiveId}`);
        }
        this.objectives.set(binding.objectiveId, binding);
        if (!this.dependencies.has(binding.objectiveId)) {
            this.dependencies.set(binding.objectiveId, new Set());
        }
        if (!this.dependents.has(binding.objectiveId)) {
            this.dependents.set(binding.objectiveId, new Set());
        }
        for (const depId of binding.dependencies) {
            this.dependencies.get(binding.objectiveId).add(depId);
            if (!this.dependents.has(depId)) {
                this.dependents.set(depId, new Set());
            }
            this.dependents.get(depId).add(binding.objectiveId);
        }
        this.validateGraphCycleAndDepth();
    }
    /**
     * EN: Validates DAG cycle freedom and dependency depth constraint (<= 10).
     * VI: Xác thực tính không chu trình của DAG và ràng buộc độ sâu phụ thuộc (<= 10).
     */
    validateGraphCycleAndDepth(maxDepth = MAX_OBJECTIVE_DEPENDENCY_DEPTH) {
        const visited = new Set();
        const recStack = new Set();
        const checkDepthAndCycles = (node, currentDepth) => {
            if (currentDepth > maxDepth) {
                throw new MissionCoordinationDependencyError(`Dependency depth ${currentDepth} exceeds maximum limit of ${maxDepth} at node '${node}'`);
            }
            visited.add(node);
            recStack.add(node);
            const upstreamDeps = this.dependencies.get(node) ?? new Set();
            for (const upstream of upstreamDeps) {
                if (!visited.has(upstream)) {
                    checkDepthAndCycles(upstream, currentDepth + 1);
                }
                else if (recStack.has(upstream)) {
                    throw new MissionCoordinationDependencyError(`Dependency cycle detected involving '${node}' -> '${upstream}'`);
                }
            }
            recStack.delete(node);
        };
        for (const node of this.objectives.keys()) {
            if (!visited.has(node)) {
                checkDepthAndCycles(node, 1);
            }
        }
    }
    /**
     * EN: Evaluates and updates readiness for all registered objectives based on completed dependencies.
     * VI: Đánh giá và cập nhật tính sẵn sàng cho tất cả các mục tiêu đã đăng ký dựa trên các phụ thuộc đã hoàn thành.
     */
    evaluateReadiness() {
        const ready = [];
        const blocked = [];
        const active = [];
        const completed = [];
        for (const [id, binding] of this.objectives.entries()) {
            if (binding.state === 'COMPLETED') {
                completed.push(id);
                continue;
            }
            if (binding.state === 'ACTIVE' || binding.state === 'DELEGATED') {
                active.push(id);
                continue;
            }
            if (binding.state === 'FAILED' || binding.state === 'CANCELLED') {
                continue;
            }
            const deps = this.dependencies.get(id) ?? new Set();
            let allDepsCompleted = true;
            let hasFailedDep = false;
            for (const depId of deps) {
                const depObj = this.objectives.get(depId);
                if (!depObj || depObj.state !== 'COMPLETED') {
                    allDepsCompleted = false;
                }
                if (depObj && (depObj.state === 'FAILED' || depObj.state === 'CANCELLED')) {
                    hasFailedDep = true;
                }
            }
            if (hasFailedDep) {
                this.updateObjectiveState(id, 'BLOCKED');
                blocked.push(id);
            }
            else if (allDepsCompleted) {
                this.updateObjectiveState(id, 'READY');
                ready.push(id);
            }
            else {
                this.updateObjectiveState(id, 'BLOCKED');
                blocked.push(id);
            }
        }
        return { ready, blocked, active, completed };
    }
    /**
     * EN: Updates objective state in place and returns updated binding.
     * VI: Cập nhật trạng thái mục tiêu tại chỗ và trả về ràng buộc đã cập nhật.
     */
    updateObjectiveState(objectiveId, newState, summary) {
        const existing = this.objectives.get(objectiveId);
        if (!existing) {
            throw new MissionCoordinationValidationError(`Objective '${objectiveId}' not found in scheduler`);
        }
        const updated = {
            ...existing,
            state: newState,
            completedAt: newState === 'COMPLETED' || newState === 'FAILED' ? Date.now() : existing.completedAt,
            resultSummary: summary ?? existing.resultSummary,
        };
        this.objectives.set(objectiveId, updated);
        // Cascading invalidation if an objective fails
        if (newState === 'FAILED' || newState === 'CANCELLED') {
            this.cascadeBlockDependents(objectiveId);
        }
        return updated;
    }
    /**
     * EN: Cascades blocking to all downstream dependents when an upstream objective fails.
     * VI: Xếp tầng chặn tất cả các phần tử phụ thuộc xuôi dòng khi một mục tiêu thượng nguồn thất bại.
     */
    cascadeBlockDependents(failedObjectiveId) {
        const cascaded = [];
        const queue = Array.from(this.dependents.get(failedObjectiveId) ?? []);
        while (queue.length > 0) {
            const current = queue.shift();
            const obj = this.objectives.get(current);
            if (obj && obj.state !== 'COMPLETED' && obj.state !== 'FAILED' && obj.state !== 'CANCELLED') {
                this.objectives.set(current, {
                    ...obj,
                    state: 'BLOCKED',
                    resultSummary: `Blocked by cascading failure of upstream objective '${failedObjectiveId}'`,
                });
                cascaded.push(current);
                for (const next of this.dependents.get(current) ?? []) {
                    queue.push(next);
                }
            }
        }
        return cascaded;
    }
    getDependencyGraph() {
        const nodes = Array.from(this.objectives.keys());
        const edges = [];
        const depthMap = {};
        for (const [id, deps] of this.dependencies.entries()) {
            depthMap[id] = deps.size;
            for (const dep of deps) {
                edges.push({ from: dep, to: id });
            }
        }
        return {
            nodes,
            edges,
            depthMap,
        };
    }
}
