import type { AgentLoopObjective, AgentLoopObservation, AgentLoopDecision } from './agentLoopTypes.js';
export declare class AgentLoopReasoningEngine {
    reason(objective: AgentLoopObjective, observation: AgentLoopObservation, context?: {
        previousDecision?: AgentLoopDecision;
    }): Promise<AgentLoopDecision>;
}
export declare const globalAgentLoopReasoning: AgentLoopReasoningEngine;
