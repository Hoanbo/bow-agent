import type { CandidateAction, SemanticIntent } from '../intent/intentTypes.js';
export type PlanActionType = 'RESPOND' | 'ASK_CLARIFICATION' | 'RETRIEVE_CONTEXT' | 'RETRIEVE_MEMORY' | 'PREPARE_ACTION' | 'REQUEST_APPROVAL' | 'EXECUTE_TOOL' | 'DEFER' | 'REJECT';
export type PlanRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export interface GovernanceContext {
    readonly requiresApprovalForRisk: PlanRiskLevel;
    readonly pdpRequired: true;
}
export interface DecisionContext {
    readonly userId: string;
    readonly sessionId: string;
    readonly semanticIntent: SemanticIntent;
    readonly entities: readonly {
        type: string;
        normalizedValue: string;
    }[];
    readonly conversationContext: readonly {
        id: string;
        sender: string;
        content: string;
    }[];
    readonly relevantMemory: readonly {
        id: string;
        sender: string;
        content: string;
    }[];
    readonly candidateActions: readonly CandidateAction[];
    readonly governanceContext: GovernanceContext;
    readonly previousDecision?: string;
    readonly currentState: string;
}
export interface StructuredClarification {
    readonly reason: string;
    readonly missingFields: readonly string[];
    readonly candidateOptions: readonly string[];
}
export interface ContextPlanStep {
    readonly stepId: string;
    readonly order: number;
    readonly type: PlanActionType;
    readonly description: string;
    readonly dependencies: readonly string[];
    readonly riskLevel: PlanRiskLevel;
    readonly requiresApproval: boolean;
    readonly candidateAction?: CandidateAction;
}
export interface ContextAwarePlan {
    readonly planId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly intent: SemanticIntent;
    readonly objective: string;
    readonly steps: readonly ContextPlanStep[];
    readonly riskLevel: PlanRiskLevel;
    readonly requiresApproval: boolean;
    readonly requiresClarification: boolean;
    readonly clarification?: StructuredClarification;
    readonly confidence: number;
    readonly createdAt: string;
}
