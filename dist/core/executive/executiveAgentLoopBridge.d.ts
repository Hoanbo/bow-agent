import type { GoalId, TaskId } from './executiveTypes.js';
import { AgentLoopRuntime } from '../agent-loop/agentLoopRuntime.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export interface BridgeStepResult {
    readonly success: boolean;
    readonly goalId: GoalId;
    readonly taskId?: TaskId;
    readonly phase: 'OBSERVE' | 'RECONSTRUCT_STATE' | 'REASON' | 'PLAN' | 'GOVERN' | 'AUTHORIZE' | 'EXECUTE' | 'VERIFY' | 'EVALUATE' | 'OBSERVE_PRIME';
    readonly status: string;
    readonly error?: string;
}
export declare class ExecutiveAgentLoopBridge {
    /**
     * Orchestrates a single long-horizon goal step through the ContinuousAgentLoop 10-phase lifecycle.
     * Ensures ExecutiveRuntime operates inside ContinuousAgentLoop rather than creating a competing loop.
     */
    stepGoalThroughAgentLoop(goalId: GoalId, agentLoop?: AgentLoopRuntime, options?: {
        authTokenId?: string;
        authorizationToken?: AuthorizationToken;
        isDryRun?: boolean;
    }): Promise<BridgeStepResult>;
}
export declare const globalExecutiveAgentLoopBridge: ExecutiveAgentLoopBridge;
