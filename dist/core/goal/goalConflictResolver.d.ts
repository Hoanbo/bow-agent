import { type GovernedGoal, type GoalConflictDescriptor } from './goalTypes.js';
import { PriorityGraphEngine } from './priorityGraphEngine.js';
export declare class GoalConflictResolver {
    private readonly userStopProvider;
    constructor(userStopProvider?: () => boolean);
    /**
     * Detects conflicts across all goals in a PriorityGraphEngine.
     */
    detectConflicts(graph: PriorityGraphEngine): readonly GoalConflictDescriptor[];
    /**
     * Deterministically resolves a detected conflict.
     * Accepts either (conflict, graph) or (goalA, goalB).
     *
     * Hierarchy:
     * 1. USER_DIRECTIVE (Master Human) beats autonomous origin. Lower transitions to BLOCKED.
     * 2. Higher priority score beats lower priority score. Lower transitions to BLOCKED.
     * 3. Equal priority and authority -> both transition to BLOCKED for human escalation.
     */
    resolveConflict(conflictOrGoalA: GoalConflictDescriptor | GovernedGoal, graphOrGoalB: PriorityGraphEngine | GovernedGoal): {
        readonly winnerGoalId: string | null;
        readonly loserGoalId: string | null;
        readonly winningGoalId: string | null;
        readonly blockedGoalIds: readonly string[];
        readonly requiresHumanEscalation: boolean;
        readonly strategy: string;
        readonly rationale: string;
        readonly resolutionReason: string;
    };
    /**
     * Applies the resolution by updating blocked goals in the graph to status BLOCKED.
     */
    applyResolution(resolution: {
        winnerGoalId?: string | null;
        loserGoalId?: string | null;
        blockedGoalIds?: readonly string[];
        rationale?: string;
        resolutionReason?: string;
    }, graph: PriorityGraphEngine): void;
    private checkResourceConflict;
    private checkPolicyConflict;
}
export declare const globalGoalConflictResolver: GoalConflictResolver;
