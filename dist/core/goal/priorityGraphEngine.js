// src/core/goal/priorityGraphEngine.ts
// BOWCON V4.0 — MS-1.5.04: PRIORITY GRAPH & DAG ENGINE
// Component 1012 — REAL
//
// Invariants:
// FAIL_CLOSED_ON_CYCLE == TRUE
// ZERO_CROSS_TENANT_EDGES == TRUE
// BOUNDED_GRAPH_EXECUTION == TRUE
// USER_STOP > ALL_MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY
import { GoalValidationError, GoalGraphCycleError, CrossTenantGoalError, GoalCapacityError, GoalUserStopError, MAX_GOALS_PER_TENANT, MAX_SUBGOALS_PER_GOAL, MAX_GRAPH_DEPTH, MAX_EDGES_PER_GOAL, } from './goalTypes.js';
import { globalGoalPriorityEngine } from './goalPriorityEngine.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class PriorityGraphEngine {
    tenantId;
    goals = new Map();
    edges = new Map();
    // goalId -> outgoing edges
    outgoingEdges = new Map();
    // goalId -> incoming edges
    incomingEdges = new Map();
    priorityEngine;
    userStopProvider;
    constructor(tenantId, options) {
        if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
            throw new GoalValidationError('tenantId must be a non-empty string');
        }
        this.tenantId = tenantId.trim();
        this.priorityEngine = options?.priorityEngine ?? globalGoalPriorityEngine;
        this.userStopProvider =
            options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    get goalCount() {
        return this.goals.size;
    }
    get edgeCount() {
        return this.edges.size;
    }
    /**
     * Adds or updates a governed goal in the graph.
     */
    addGoal(goal, activeTenantId) {
        if (this.userStopProvider()) {
            throw new GoalUserStopError('add_goal');
        }
        if (activeTenantId && activeTenantId !== this.tenantId) {
            throw new CrossTenantGoalError(this.tenantId, activeTenantId);
        }
        if (goal.tenantId !== this.tenantId) {
            throw new CrossTenantGoalError(goal.tenantId, this.tenantId);
        }
        if (this.goals.size >= MAX_GOALS_PER_TENANT && !this.goals.has(goal.goalId)) {
            throw new GoalCapacityError(this.goals.size, MAX_GOALS_PER_TENANT, 'goals per tenant');
        }
        // Check parent goal relationship and bounds
        if (goal.parentGoalId) {
            if (goal.parentGoalId === goal.goalId) {
                throw new GoalValidationError('Self-referential parentGoalId is prohibited', ['SELF_PARENT']);
            }
            const parent = this.goals.get(goal.parentGoalId);
            if (parent && parent.tenantId !== this.tenantId) {
                throw new CrossTenantGoalError(parent.tenantId, this.tenantId);
            }
            const subgoals = this.getSubgoals(goal.parentGoalId);
            if (subgoals.length >= MAX_SUBGOALS_PER_GOAL && !this.goals.has(goal.goalId)) {
                throw new GoalCapacityError(subgoals.length, MAX_SUBGOALS_PER_GOAL, 'subgoals per goal');
            }
            // Check hierarchy depth
            const depth = this.calculateDepth(goal.parentGoalId);
            if (depth >= MAX_GRAPH_DEPTH) {
                throw new GoalCapacityError(depth, MAX_GRAPH_DEPTH, 'graph hierarchy depth');
            }
        }
        this.goals.set(goal.goalId, Object.freeze({ ...goal }));
        if (!this.outgoingEdges.has(goal.goalId)) {
            this.outgoingEdges.set(goal.goalId, new Set());
        }
        if (!this.incomingEdges.has(goal.goalId)) {
            this.incomingEdges.set(goal.goalId, new Set());
        }
        // Auto-link PARENT_OF edge if parentGoalId is declared
        if (goal.parentGoalId && this.goals.has(goal.parentGoalId)) {
            const parentEdgeId = `edge_${goal.parentGoalId}_PARENT_OF_${goal.goalId}`;
            if (!this.edges.has(parentEdgeId)) {
                this.addEdge({
                    edgeId: parentEdgeId,
                    sourceGoalId: goal.parentGoalId,
                    targetGoalId: goal.goalId,
                    edgeType: 'PARENT_OF',
                    tenantId: this.tenantId,
                    createdAt: goal.createdAt,
                });
            }
        }
    }
    getGoal(goalId, activeTenantId) {
        if (activeTenantId && activeTenantId !== this.tenantId) {
            throw new CrossTenantGoalError(this.tenantId, activeTenantId);
        }
        return this.goals.get(goalId);
    }
    updateGoal(goal) {
        if (this.userStopProvider()) {
            throw new GoalUserStopError('graph_update_goal');
        }
        if (goal.tenantId !== this.tenantId) {
            throw new CrossTenantGoalError(goal.tenantId, this.tenantId);
        }
        if (!this.goals.has(goal.goalId)) {
            throw new GoalValidationError(`Goal '${goal.goalId}' not found in graph`);
        }
        this.goals.set(goal.goalId, Object.freeze({ ...goal }));
    }
    hasGoal(goalId) {
        return this.goals.has(goalId);
    }
    removeGoal(goalId, activeTenantId) {
        if (this.userStopProvider()) {
            throw new GoalUserStopError('remove_goal');
        }
        if (activeTenantId && activeTenantId !== this.tenantId) {
            throw new CrossTenantGoalError(this.tenantId, activeTenantId);
        }
        if (!this.goals.has(goalId))
            return false;
        // Remove all associated edges
        const outEdges = this.outgoingEdges.get(goalId) || new Set();
        for (const edgeId of Array.from(outEdges)) {
            this.removeEdge(edgeId);
        }
        const inEdges = this.incomingEdges.get(goalId) || new Set();
        for (const edgeId of Array.from(inEdges)) {
            this.removeEdge(edgeId);
        }
        this.outgoingEdges.delete(goalId);
        this.incomingEdges.delete(goalId);
        return this.goals.delete(goalId);
    }
    /**
     * Adds a directed edge between two goals.
     * Fails closed on cross-tenant references, self-referential edges, edge capacity, and cycles.
     */
    addEdge(edge, activeTenantId) {
        if (this.userStopProvider()) {
            throw new GoalUserStopError('add_edge');
        }
        if (activeTenantId && activeTenantId !== this.tenantId) {
            throw new CrossTenantGoalError(this.tenantId, activeTenantId);
        }
        if (edge.tenantId !== this.tenantId) {
            throw new CrossTenantGoalError(edge.tenantId, this.tenantId);
        }
        // 1. Self-referential edge check
        if (edge.sourceGoalId === edge.targetGoalId) {
            throw new GoalValidationError(`Self-referential edge rejected on goal ${edge.sourceGoalId}`, ['SELF_DEPENDENCY_CYCLE']);
        }
        // 2. Existence check
        const source = this.goals.get(edge.sourceGoalId);
        const target = this.goals.get(edge.targetGoalId);
        if (!source) {
            throw new GoalValidationError(`Source goal '${edge.sourceGoalId}' does not exist`);
        }
        if (!target) {
            throw new GoalValidationError(`Target goal '${edge.targetGoalId}' does not exist`);
        }
        // 3. Multi-tenant edge check
        if (source.tenantId !== this.tenantId || target.tenantId !== this.tenantId) {
            throw new CrossTenantGoalError(source.tenantId, target.tenantId);
        }
        // 4. Edge count bounds check
        const existingOut = this.outgoingEdges.get(edge.sourceGoalId)?.size || 0;
        if (existingOut >= MAX_EDGES_PER_GOAL && !this.edges.has(edge.edgeId)) {
            throw new GoalCapacityError(existingOut, MAX_EDGES_PER_GOAL, 'edges per goal');
        }
        // 5. Cycle detection for directed dependencies and parent relationships
        if (edge.edgeType === 'DEPENDS_ON' || edge.edgeType === 'PARENT_OF') {
            const wouldCreateCycle = this.detectCycleWithProspectiveEdge(edge.sourceGoalId, edge.targetGoalId, edge.edgeType);
            if (wouldCreateCycle.hasCycle) {
                throw new GoalGraphCycleError(wouldCreateCycle.path);
            }
        }
        // 6. Store edge
        this.edges.set(edge.edgeId, Object.freeze({ ...edge }));
        if (!this.outgoingEdges.has(edge.sourceGoalId)) {
            this.outgoingEdges.set(edge.sourceGoalId, new Set());
        }
        this.outgoingEdges.get(edge.sourceGoalId).add(edge.edgeId);
        if (!this.incomingEdges.has(edge.targetGoalId)) {
            this.incomingEdges.set(edge.targetGoalId, new Set());
        }
        this.incomingEdges.get(edge.targetGoalId).add(edge.edgeId);
    }
    removeEdge(edgeId) {
        if (this.userStopProvider()) {
            throw new GoalUserStopError('remove_edge');
        }
        const edge = this.edges.get(edgeId);
        if (!edge)
            return false;
        this.outgoingEdges.get(edge.sourceGoalId)?.delete(edgeId);
        this.incomingEdges.get(edge.targetGoalId)?.delete(edgeId);
        return this.edges.delete(edgeId);
    }
    listGoals(options) {
        let result = Array.from(this.goals.values());
        if (options?.sessionId) {
            result = result.filter((g) => g.sessionId === options.sessionId);
        }
        if (options?.status) {
            result = result.filter((g) => g.status === options.status);
        }
        if (options?.origin) {
            result = result.filter((g) => g.origin === options.origin);
        }
        return Object.freeze(result);
    }
    listEdges() {
        return Object.freeze(Array.from(this.edges.values()));
    }
    getSubgoals(parentGoalId) {
        const subgoals = [];
        for (const goal of this.goals.values()) {
            if (goal.parentGoalId === parentGoalId) {
                subgoals.push(goal);
            }
        }
        return Object.freeze(subgoals);
    }
    getDependencies(goalId) {
        const outEdgeIds = this.outgoingEdges.get(goalId) || new Set();
        const deps = [];
        for (const eid of outEdgeIds) {
            const edge = this.edges.get(eid);
            if (edge && edge.edgeType === 'DEPENDS_ON') {
                const target = this.goals.get(edge.targetGoalId);
                if (target)
                    deps.push(target);
            }
        }
        return Object.freeze(deps);
    }
    /**
     * Returns all goals that are ready to be scheduled/executed.
     * A goal is schedulable if:
     * 1. Status is APPROVED or ACTIVE.
     * 2. All DEPENDS_ON upstream prerequisites have status COMPLETED.
     * 3. No active BLOCKS edge blocks it.
     * Results are sorted deterministically by GoalPriorityEngine.
     */
    getSchedulableGoals() {
        const schedulable = [];
        for (const goal of this.goals.values()) {
            if (goal.status !== 'APPROVED' && goal.status !== 'ACTIVE') {
                continue;
            }
            // Check all upstream dependencies (targets of DEPENDS_ON)
            const deps = this.getDependencies(goal.goalId);
            const allDepsCompleted = deps.every((d) => d.status === 'COMPLETED');
            if (!allDepsCompleted) {
                continue;
            }
            // Check if blocked by any active blocker
            const inEdgeIds = this.incomingEdges.get(goal.goalId) || new Set();
            let blocked = false;
            for (const eid of inEdgeIds) {
                const edge = this.edges.get(eid);
                if (edge && edge.edgeType === 'BLOCKS') {
                    const blocker = this.goals.get(edge.sourceGoalId);
                    if (blocker && blocker.status !== 'COMPLETED' && blocker.status !== 'ABANDONED') {
                        blocked = true;
                        break;
                    }
                }
            }
            if (blocked) {
                continue;
            }
            schedulable.push(goal);
        }
        return this.priorityEngine.sortGoals(schedulable);
    }
    /**
     * DFS Cycle detection attempting to find if adding source -> target creates a cycle.
     */
    detectCycleWithProspectiveEdge(sourceId, targetId, edgeType) {
        // If target can already reach source through existing edges of same type family,
        // then adding source -> target would complete a cycle.
        const visited = new Set();
        const path = [sourceId, targetId];
        const dfs = (current) => {
            if (current === sourceId) {
                return true;
            }
            visited.add(current);
            const outEdgeIds = this.outgoingEdges.get(current) || new Set();
            for (const eid of outEdgeIds) {
                const edge = this.edges.get(eid);
                if (edge && edge.edgeType === edgeType) {
                    if (!visited.has(edge.targetGoalId)) {
                        path.push(edge.targetGoalId);
                        if (dfs(edge.targetGoalId)) {
                            return true;
                        }
                        path.pop();
                    }
                    else if (edge.targetGoalId === sourceId) {
                        path.push(sourceId);
                        return true;
                    }
                }
            }
            return false;
        };
        const cycleFound = dfs(targetId);
        return { hasCycle: cycleFound, path };
    }
    calculateDepth(parentGoalId) {
        let depth = 1;
        let currentId = parentGoalId;
        const seen = new Set();
        while (currentId) {
            if (seen.has(currentId))
                break; // cycle protection
            seen.add(currentId);
            const node = this.goals.get(currentId);
            if (node?.parentGoalId) {
                depth++;
                currentId = node.parentGoalId;
            }
            else {
                currentId = null;
            }
        }
        return depth;
    }
}
