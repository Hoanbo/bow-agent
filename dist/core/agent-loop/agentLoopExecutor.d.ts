import type { AgentLoopPlan } from './agentLoopTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export interface ExecutionResult {
    readonly success: boolean;
    readonly executedSteps: number;
    readonly error?: string;
    readonly outputs: any[];
}
export declare class AgentLoopExecutor {
    executePlan(plan: AgentLoopPlan, options?: {
        isDryRun?: boolean;
        authorizationToken?: AuthorizationToken;
    }): Promise<ExecutionResult>;
}
export declare const globalAgentLoopExecutor: AgentLoopExecutor;
