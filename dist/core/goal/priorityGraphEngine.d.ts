import { type GovernedGoal, type GoalStatus, type GoalOrigin, type GoalEdge } from './goalTypes.js';
import { GoalPriorityEngine } from './goalPriorityEngine.js';
export interface PriorityGraphEngineOptions {
    readonly priorityEngine?: GoalPriorityEngine;
    readonly userStopProvider?: () => boolean;
}
export declare class PriorityGraphEngine {
    readonly tenantId: string;
    private readonly goals;
    private readonly edges;
    private readonly outgoingEdges;
    private readonly incomingEdges;
    private readonly priorityEngine;
    private readonly userStopProvider;
    constructor(tenantId: string, options?: PriorityGraphEngineOptions);
    get goalCount(): number;
    get edgeCount(): number;
    /**
     * Adds or updates a governed goal in the graph.
     */
    addGoal(goal: GovernedGoal, activeTenantId?: string): void;
    getGoal(goalId: string, activeTenantId?: string): GovernedGoal | undefined;
    updateGoal(goal: GovernedGoal): void;
    hasGoal(goalId: string): boolean;
    removeGoal(goalId: string, activeTenantId?: string): boolean;
    /**
     * Adds a directed edge between two goals.
     * Fails closed on cross-tenant references, self-referential edges, edge capacity, and cycles.
     */
    addEdge(edge: GoalEdge, activeTenantId?: string): void;
    removeEdge(edgeId: string): boolean;
    listGoals(options?: {
        readonly sessionId?: string;
        readonly status?: GoalStatus;
        readonly origin?: GoalOrigin;
    }): readonly GovernedGoal[];
    listEdges(): readonly GoalEdge[];
    getSubgoals(parentGoalId: string): readonly GovernedGoal[];
    getDependencies(goalId: string): readonly GovernedGoal[];
    /**
     * Returns all goals that are ready to be scheduled/executed.
     * A goal is schedulable if:
     * 1. Status is APPROVED or ACTIVE.
     * 2. All DEPENDS_ON upstream prerequisites have status COMPLETED.
     * 3. No active BLOCKS edge blocks it.
     * Results are sorted deterministically by GoalPriorityEngine.
     */
    getSchedulableGoals(): readonly GovernedGoal[];
    /**
     * DFS Cycle detection attempting to find if adding source -> target creates a cycle.
     */
    private detectCycleWithProspectiveEdge;
    private calculateDepth;
}
