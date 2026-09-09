import type { AgentLoopPlan } from './agentLoopTypes.js';
export interface LoopEscalationRecord {
    readonly escalationId: string;
    readonly planId: string;
    readonly objectiveId: string;
    readonly attempts: number;
    readonly maxAttempts: number;
    readonly reason: string;
    readonly timestamp: number;
    readonly requiresHumanReview: true;
}
export declare class AgentLoopEscalationManager {
    private readonly escalations;
    escalate(plan: AgentLoopPlan, attempts: number, reason: string): LoopEscalationRecord;
    getEscalation(escalationId: string): LoopEscalationRecord | undefined;
    listEscalations(): LoopEscalationRecord[];
    clear(): void;
}
export declare const globalAgentLoopEscalation: AgentLoopEscalationManager;
