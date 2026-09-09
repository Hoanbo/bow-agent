import type { GoalId, TaskId, ExecutiveTask, ExecutiveEscalationRecord } from './executiveTypes.js';
export declare class ExecutiveEscalationManager {
    private _records;
    createEscalation(goalId: GoalId, reason: string, diagnosis: string, requiredDecision: string, task?: ExecutiveTask): ExecutiveEscalationRecord;
    recordEscalation(options: {
        goalId: GoalId;
        taskId?: TaskId;
        reason: string;
        diagnosis?: string;
        attempts?: number;
        blockedBy?: string;
        requiredHumanDecision: string;
        riskLevel?: string;
    }): ExecutiveEscalationRecord;
    getEscalation(escalationId: string): ExecutiveEscalationRecord | undefined;
    getEscalationsByGoal(goalId: GoalId): ExecutiveEscalationRecord[];
    getEscalationsForGoal(goalId: GoalId): ExecutiveEscalationRecord[];
    clear(): void;
}
export declare const globalExecutiveEscalation: ExecutiveEscalationManager;
