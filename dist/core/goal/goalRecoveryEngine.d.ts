import { type GovernedGoal, type GoalEdge } from './goalTypes.js';
import { PriorityGraphEngine } from './priorityGraphEngine.js';
import { GoalPersistenceEngine } from './goalPersistenceEngine.js';
export interface GoalRecoveryReport {
    readonly tenantId: string;
    readonly restoredGoalsCount: number;
    readonly restoredEdgesCount: number;
    readonly recoveredFromBackup: boolean;
    readonly recoveredAt: string;
}
export declare class GoalRecoveryEngine {
    private readonly persistence;
    private readonly userStopProvider;
    constructor(persistence?: GoalPersistenceEngine, userStopProvider?: () => boolean);
    /**
     * Rehydrates a PriorityGraphEngine from persisted partition, safely falling back to .bak if primary is corrupted.
     * If no partition exists or both are corrupted, returns a clean empty graph.
     * Never invents data.
     */
    rehydrateGraph(tenantId: string, activeTenantId?: string): {
        readonly graph: PriorityGraphEngine;
        readonly report: GoalRecoveryReport;
    };
    /**
     * Idempotently rebuilds graph from a canonical list of goals and edges.
     */
    rebuildIdempotent(tenantId: string, canonicalGoals: readonly GovernedGoal[], canonicalEdges?: readonly GoalEdge[], activeTenantId?: string): PriorityGraphEngine;
}
export declare const globalGoalRecoveryEngine: GoalRecoveryEngine;
