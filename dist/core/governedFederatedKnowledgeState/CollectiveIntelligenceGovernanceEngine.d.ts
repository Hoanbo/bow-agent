import { KnowledgeEvidence, KnowledgeState } from './GovernedFederatedKnowledgeStateTypes.js';
export interface CollectiveIntelligenceMetrics {
    readonly stateId: string;
    readonly entryCount: number;
    readonly averageConfidence: number;
    readonly evidenceStrength: number;
    readonly consistencyScore: number;
    readonly stabilityScore: number;
    readonly governanceCompliance: 'COMPLIANT' | 'LOW_CONFIDENCE' | 'REVIEW_REQUIRED';
    readonly provenanceHash: string;
}
export declare class CollectiveIntelligenceGovernanceEngine {
    /**
     * EN: Evaluates collective intelligence metrics for a knowledge state.
     * VI: Đánh giá các chỉ số trí tuệ tập thể cho một trạng thái tri thức.
     */
    evaluateState(state: KnowledgeState, evidences?: readonly KnowledgeEvidence[]): CollectiveIntelligenceMetrics;
}
