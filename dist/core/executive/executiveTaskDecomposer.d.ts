import type { ExecutiveGoal, ExecutiveTask, CreateTaskOptions } from './executiveTypes.js';
import { ExecutiveDependencyGraph } from './executiveDependencyGraph.js';
export interface DecompositionResult {
    readonly goalId: string;
    readonly tasks: ExecutiveTask[];
    readonly graph: ExecutiveDependencyGraph;
    readonly rootTasks: ExecutiveTask[];
    readonly leafTasks: ExecutiveTask[];
}
export declare class ExecutiveTaskDecomposer {
    decompose(goal: ExecutiveGoal, customTaskSpecs?: CreateTaskOptions[]): DecompositionResult;
}
export declare const globalExecutiveTaskDecomposer: ExecutiveTaskDecomposer;
