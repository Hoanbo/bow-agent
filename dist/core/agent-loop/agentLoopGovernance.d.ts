import type { AgentLoopPlan } from './agentLoopTypes.js';
export interface GovernanceDecision {
    readonly allowed: boolean;
    readonly recoveryClass: 'OBSERVE' | 'AUTO_SAFE' | 'AUTO_REVERSIBLE' | 'HUMAN_REQUIRED' | 'CRITICAL_BLOCKED';
    readonly requiresHumanGate: boolean;
    readonly reason: string;
}
export declare class AgentLoopGovernanceEngine {
    private readonly protectedWorkspace;
    evaluate(plan: AgentLoopPlan): GovernanceDecision;
}
export declare const globalAgentLoopGovernance: AgentLoopGovernanceEngine;
