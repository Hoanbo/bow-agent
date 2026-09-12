import type { ObservabilitySessionId, InvariantCheck, DriftEvent, ObservabilityAlert, TelemetryAggregationWindow } from '../observability/observabilityTypes.js';
import { type CorrelatedEvidenceCluster } from './diagnosisTypes.js';
export interface EvidenceCorrelationInput {
    readonly sessionId: ObservabilitySessionId;
    readonly targetId: string;
    readonly referenceTime?: number;
    readonly windowDurationMs?: number;
    readonly invariantChecks?: readonly InvariantCheck[];
    readonly driftEvents?: readonly DriftEvent[];
    readonly alerts?: readonly ObservabilityAlert[];
    readonly telemetryWindow?: TelemetryAggregationWindow;
}
export declare class EvidenceCorrelationEngine {
    static readonly DEFAULT_WINDOW_DURATION_MS = 60000;
    /**
     * Correlates all observational signals within a temporal window for a designated target.
     * Tương quan tất cả các tín hiệu quan sát trong cửa sổ thời gian cho một đích được chỉ định.
     */
    correlate(input: EvidenceCorrelationInput): CorrelatedEvidenceCluster;
}
export declare const globalEvidenceCorrelationEngine: EvidenceCorrelationEngine;
