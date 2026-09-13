import type { IncidentSeverity, IncidentLifecycleState, SafetyBoundaryStatus, PolicyActiveIncidentResponseOptions } from './policyActiveIncidentResponseTypes.js';
import type { DegradationEvaluationResult } from './policyActivePolicyDegradationDetector.js';
export interface IncidentClassificationResult {
    readonly severity: IncidentSeverity;
    readonly lifecycleState: IncidentLifecycleState;
    readonly safetyBoundaryStatus: SafetyBoundaryStatus;
    readonly requiresHumanEscalation: boolean;
    readonly rationale: string;
}
export declare class PolicyActiveIncidentClassifier {
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveIncidentResponseOptions);
    private assertUserStopInactive;
    /**
     * Classifies an active policy operational condition deterministically.
     */
    classifyIncident(evaluation: DegradationEvaluationResult): IncidentClassificationResult;
}
