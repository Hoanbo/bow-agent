import type { ObservabilityHealthState } from '../observability/observabilityTypes.js';
import type { CorrelatedEvidenceCluster, RootCauseHypothesis, IncidentClassification, DissentingView, SupervisorDecisionSupportPackage } from './diagnosisTypes.js';
export interface DecisionSynthesizerInput {
    readonly classification: IncidentClassification;
    readonly cluster: CorrelatedEvidenceCluster;
    readonly hypotheses: readonly RootCauseHypothesis[];
    readonly currentHealth: ObservabilityHealthState;
    readonly dissentingViews?: readonly DissentingView[];
    readonly telemetrySampleHashes?: readonly string[];
    readonly invariantEvidenceHashes?: readonly string[];
    readonly driftEvidenceHashes?: readonly string[];
    readonly alertFingerprints?: readonly string[];
    readonly parentProvenanceHash?: string;
    readonly timestamp?: number;
}
export declare class DecisionSupportSynthesizer {
    /**
     * Synthesizes the complete, immutable Supervisor Decision-Support Package.
     * Tổng hợp gói hỗ trợ quyết định giám sát viên đầy đủ, bất biến.
     */
    synthesize(input: DecisionSynthesizerInput): SupervisorDecisionSupportPackage;
    private generateRemediationActions;
    private buildAction;
    private buildImpactAssessment;
}
export declare const globalDecisionSupportSynthesizer: DecisionSupportSynthesizer;
