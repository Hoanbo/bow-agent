import type { ExecutiveGoal, TaskPriority } from './executiveTypes.js';
export interface InterpretationResult {
    readonly goalId: string;
    readonly interpretedObjective: string;
    readonly suggestedPriority: TaskPriority;
    readonly identifiedConstraints: string[];
    readonly successCriteriaSummary: string;
    readonly estimatedTaskCount: number;
    readonly containsForbiddenPatterns: boolean;
    readonly forbiddenReasons: string[];
    readonly intent?: string;
    readonly riskLevel?: string;
    readonly suggestedCapabilities: string[];
    readonly estimatedSteps: number;
}
export declare class ExecutiveGoalInterpreter {
    private _forbiddenPatterns;
    interpret(goalOrPrompt: ExecutiveGoal | string): Promise<InterpretationResult>;
}
export declare const globalExecutiveGoalInterpreter: ExecutiveGoalInterpreter;
