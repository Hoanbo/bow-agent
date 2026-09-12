import type { ObservabilityHealthState } from '../observability/observabilityTypes.js';
import type { CorrelatedEvidenceCluster, RootCauseHypothesis, IncidentClassification } from './diagnosisTypes.js';
export interface IncidentClassificationInput {
    readonly cluster: CorrelatedEvidenceCluster;
    readonly hypotheses: readonly RootCauseHypothesis[];
    readonly currentHealth?: ObservabilityHealthState;
    readonly telemetrySampleCount?: number;
    readonly isConflicted?: boolean;
    readonly canaryRollbackRecommended?: boolean;
}
export declare class IncidentClassificationEngine {
    /**
     * Classifies an incident, assigning deterministic severity and blast radius.
     * Phân loại sự cố, gán mức độ nghiêm trọng và bán kính ảnh hưởng xác định.
     */
    classify(input: IncidentClassificationInput): IncidentClassification;
}
export declare const globalIncidentClassificationEngine: IncidentClassificationEngine;
