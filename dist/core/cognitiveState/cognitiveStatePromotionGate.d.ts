import { type CognitiveHypothesis } from './cognitiveStateTypes.js';
export interface CognitivePromotionRequest {
    readonly candidateType: 'HYPOTHESIS_TO_FACT' | 'ENTITY_TO_KNOWLEDGE_GRAPH' | 'OBSERVATION_TO_EPISODE';
    readonly sourceRegister: string;
    readonly item: CognitiveHypothesis | Record<string, unknown>;
    readonly verificationEvidenceId?: string;
    readonly verificationOracle?: string;
    readonly confidence: number;
}
export interface CognitivePromotionApproval {
    readonly approved: boolean;
    readonly targetStore: 'EPISODIC' | 'KNOWLEDGE_GRAPH' | 'AUDIT_LEDGER';
    readonly promotedPayload: Readonly<Record<string, unknown>>;
    readonly approvalReason: string;
    readonly approvedAt: string;
}
export declare class CognitiveStatePromotionGate {
    /**
     * Evaluates a promotion request from working cognitive registers to durable memory.
     * Rejects any claim that is unverified, speculative, or solely based on model assertion.
     */
    static evaluatePromotion(request: CognitivePromotionRequest): CognitivePromotionApproval;
}
