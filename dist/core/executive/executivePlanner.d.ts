import type { ExecutiveTask, ExecutiveTaskPlan } from './executiveTypes.js';
export declare class ExecutivePlanner {
    planTask(task: ExecutiveTask, isDryRun?: boolean): ExecutiveTaskPlan;
    createPlan(task: ExecutiveTask, options?: {
        targetPath?: string;
        actionName?: string;
        parameters?: Record<string, unknown>;
        isDryRun?: boolean;
    } | boolean): ExecutiveTask;
}
export declare const globalExecutivePlanner: ExecutivePlanner;
