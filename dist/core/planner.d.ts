export interface PlanStep {
    stepId: string;
    toolName: string;
    description: string;
    parameters: Record<string, any>;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
    result?: any;
    error?: string;
}
export interface TaskExecutionPlan {
    planId: string;
    goal: string;
    steps: PlanStep[];
    status: 'PLANNED' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
    createdAt: number;
}
export declare class TaskPlanner {
    createPlan(goal: string, steps: Omit<PlanStep, 'status' | 'result' | 'error'>[]): TaskExecutionPlan;
    executePlan(plan: TaskExecutionPlan, toolExecutor: (toolName: string, params: any) => Promise<any>): Promise<TaskExecutionPlan>;
}
export declare const taskPlanner: TaskPlanner;
