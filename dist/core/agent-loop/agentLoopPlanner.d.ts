import type { AgentLoopObjective, AgentLoopDecision, AgentLoopPlan } from './agentLoopTypes.js';
export declare class AgentLoopPlanner {
    plan(objective: AgentLoopObjective, decision: AgentLoopDecision): AgentLoopPlan;
}
export declare const globalAgentLoopPlanner: AgentLoopPlanner;
