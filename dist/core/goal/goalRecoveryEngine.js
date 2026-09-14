// src/core/goal/goalRecoveryEngine.ts
// BOWCON V4.0 — MS-1.5.04: GOAL RECOVERY & REHYDRATION ENGINE
// Component 1016 — REAL
//
// Invariants:
// ZERO_DATA_INVENTION == TRUE
// DETERMINISTIC_IDEMPOTENT_RECOVERY == TRUE
// USER_STOP > ALL_MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY
import { GoalUserStopError, } from './goalTypes.js';
import { PriorityGraphEngine } from './priorityGraphEngine.js';
import { globalGoalPersistenceEngine } from './goalPersistenceEngine.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class GoalRecoveryEngine {
    persistence;
    userStopProvider;
    constructor(persistence, userStopProvider) {
        this.persistence = persistence ?? globalGoalPersistenceEngine;
        this.userStopProvider =
            userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    }
    /**
     * Rehydrates a PriorityGraphEngine from persisted partition, safely falling back to .bak if primary is corrupted.
     * If no partition exists or both are corrupted, returns a clean empty graph.
     * Never invents data.
     */
    rehydrateGraph(tenantId, activeTenantId) {
        if (this.userStopProvider()) {
            throw new GoalUserStopError('rehydrate_graph');
        }
        const doc = this.persistence.loadGraphDocument(tenantId, activeTenantId);
        const graph = new PriorityGraphEngine(tenantId);
        if (!doc) {
            return Object.freeze({
                graph,
                report: Object.freeze({
                    tenantId,
                    restoredGoalsCount: 0,
                    restoredEdgesCount: 0,
                    recoveredFromBackup: false,
                    recoveredAt: new Date().toISOString(),
                }),
            });
        }
        // Restore goals
        let restoredGoalsCount = 0;
        for (const goal of doc.goals || []) {
            try {
                graph.addGoal(goal, activeTenantId);
                restoredGoalsCount++;
            }
            catch {
                // fail-closed on corrupt individual node
            }
        }
        // Restore edges
        let restoredEdgesCount = 0;
        for (const edge of doc.edges || []) {
            try {
                graph.addEdge(edge, activeTenantId);
                restoredEdgesCount++;
            }
            catch {
                // fail-closed on corrupt individual edge
            }
        }
        const recoveredFromBackup = Boolean(doc.recoveredFromBackup);
        return Object.freeze({
            graph,
            report: Object.freeze({
                tenantId,
                restoredGoalsCount,
                restoredEdgesCount,
                recoveredFromBackup,
                recoveredAt: new Date().toISOString(),
            }),
        });
    }
    /**
     * Idempotently rebuilds graph from a canonical list of goals and edges.
     */
    rebuildIdempotent(tenantId, canonicalGoals, canonicalEdges = [], activeTenantId) {
        if (this.userStopProvider()) {
            throw new GoalUserStopError('rebuild_idempotent');
        }
        const graph = new PriorityGraphEngine(tenantId);
        for (const g of canonicalGoals) {
            graph.addGoal(g, activeTenantId);
        }
        for (const e of canonicalEdges) {
            graph.addEdge(e, activeTenantId);
        }
        return graph;
    }
}
export const globalGoalRecoveryEngine = new GoalRecoveryEngine();
