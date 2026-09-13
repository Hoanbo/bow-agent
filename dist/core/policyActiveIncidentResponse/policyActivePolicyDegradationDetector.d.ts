import type { DegradationCategory, DegradationSignal, IncidentSeverity, PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';
import type { ResolvedPolicyIncidentSignals } from './policyActiveIncidentSignalResolver.js';
export interface DegradationEvaluationResult {
    readonly isDegraded: boolean;
    readonly severity: IncidentSeverity;
    readonly primaryCategory: DegradationCategory | null;
    readonly triggerSignals: readonly DegradationSignal[];
    readonly evaluationDetails: {
        readonly totalSignals: number;
        readonly criticalCount: number;
        readonly incidentCount: number;
        readonly degradedCount: number;
    };
}
export declare class PolicyActivePolicyDegradationDetector {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResponseOptions);
    private assertUserStopInactive;
    /**
     * Deterministically evaluates whether signals constitute policy degradation or incident conditions.
     */
    detectDegradation(resolved: ResolvedPolicyIncidentSignals): DegradationEvaluationResult;
}
