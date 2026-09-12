import { type PolicyEvolutionProposal, type EvolutionVersionId } from './policyEvolutionTypes.js';
import type { PolicyRefinementAdvisory, SystemicFailurePattern, RemediationReliabilityRecord } from '../crossIncident/crossIncidentTypes.js';
import type { ActionClassification } from '../policyDecisionPoint.js';
export interface SynthesizeProposalInput {
    readonly advisories: readonly PolicyRefinementAdvisory[];
    readonly systemicPatterns?: readonly SystemicFailurePattern[];
    readonly remediationRecords?: readonly RemediationReliabilityRecord[];
    readonly baseVersionId: EvolutionVersionId;
    readonly targetAction?: string;
    readonly proposedClassification?: ActionClassification;
    readonly rationale?: string;
}
export declare class PolicyRefinementSynthesizer {
    /**
     * Synthesizes a structured, non-mutating PolicyEvolutionProposal from cross-incident advisories and metrics.
     * Total authority is strictly Level 1 advisory: POLICY_PROPOSAL != POLICY_MUTATION.
     * Tổng hợp một đề xuất tiến hóa chính sách có cấu trúc, không biến đổi từ các tư vấn và số liệu liên sự cố.
     */
    synthesizeProposal(input: SynthesizeProposalInput): PolicyEvolutionProposal;
}
