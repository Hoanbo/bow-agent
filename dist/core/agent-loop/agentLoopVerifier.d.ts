import type { AgentLoopPlan } from './agentLoopTypes.js';
export interface LoopVerificationResult {
    readonly verified: boolean;
    readonly checksPerformed: readonly string[];
    readonly failureReason?: string;
}
export declare class AgentLoopVerifier {
    verifyPlanOutcome(plan: AgentLoopPlan, executionOutputs: any[]): Promise<LoopVerificationResult>;
}
export declare const globalAgentLoopVerifier: AgentLoopVerifier;
