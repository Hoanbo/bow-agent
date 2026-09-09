import type { GoalStatus, TaskStatus } from './executiveTypes.js';
export declare class ExecutiveTransitionError extends Error {
    readonly entityType: 'GOAL' | 'TASK';
    readonly fromState: string;
    readonly toState: string;
    readonly context?: string | undefined;
    constructor(entityType: 'GOAL' | 'TASK', fromState: string, toState: string, context?: string | undefined);
}
export declare function isValidGoalTransition(from: GoalStatus, to: GoalStatus): boolean;
export declare const canTransitionGoal: typeof isValidGoalTransition;
export declare function assertValidGoalTransition(from: GoalStatus, to: GoalStatus, context?: string): void;
export declare function isValidTaskTransition(from: TaskStatus, to: TaskStatus): boolean;
export declare const canTransitionTask: typeof isValidTaskTransition;
export declare function assertValidTaskTransition(from: TaskStatus, to: TaskStatus, context?: string): void;
