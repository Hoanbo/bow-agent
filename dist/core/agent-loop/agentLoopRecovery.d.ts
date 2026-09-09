import type { AgentLoopPlan } from './agentLoopTypes.js';
export interface LoopRecoveryResult {
    readonly recovered: boolean;
    readonly reason: string;
}
export declare class AgentLoopRecoveryCoordinator {
    attemptRecovery(plan: AgentLoopPlan, error: string, attempt: number): Promise<LoopRecoveryResult>;
}
export declare const globalAgentLoopRecovery: AgentLoopRecoveryCoordinator;
