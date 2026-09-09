import type { AgentLoopState, AgentLoopIteration, AgentLoopHealth, AgentLoopPlan, AgentLoopDecision, ControlCommandType } from './agentLoopTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
export declare class AgentLoopRuntime {
    private _state;
    private _iterationCount;
    private _consecutiveFailures;
    private _startTime;
    private _timer?;
    private _pendingPlan?;
    get state(): AgentLoopState;
    get pendingPlan(): {
        plan: AgentLoopPlan;
        decision: AgentLoopDecision;
    } | undefined;
    private transitionTo;
    boot(): Promise<void>;
    tick(options?: {
        isDryRun?: boolean;
        authorizationToken?: AuthorizationToken;
    }): Promise<AgentLoopIteration>;
    requestControl(params: {
        type: ControlCommandType;
        operatorId: string;
        payload?: Record<string, any>;
    }): void;
    authorizeAndExecute(authorizationToken: AuthorizationToken): Promise<AgentLoopIteration>;
    getHealth(): AgentLoopHealth;
    rehydrateFromCheckpoint(): {
        rehydrated: boolean;
        stale: boolean;
        checkpoint?: any;
    };
}
export declare const globalAgentLoopRuntime: AgentLoopRuntime;
