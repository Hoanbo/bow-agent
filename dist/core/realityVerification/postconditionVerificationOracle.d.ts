import type { Postcondition, PostconditionResult } from '../verification/postconditionTypes.js';
import type { RealityEvidence, RealityVerificationStatus, RealityVerificationSummary, RealityVerificationFailure, VerificationRecommendation } from './realityVerificationTypes.js';
export interface OracleEvaluationOutcome {
    readonly status: RealityVerificationStatus;
    readonly confidence: number;
    readonly postconditionResults: readonly PostconditionResult[];
    readonly summary: RealityVerificationSummary;
    readonly failure?: RealityVerificationFailure;
    readonly recommendation: VerificationRecommendation;
}
export declare class PostconditionVerificationOracle {
    /**
     * Evaluates postconditions and expected outcomes against collected reality evidence.
     */
    evaluateInvariants(params: {
        postconditions?: readonly Postcondition[];
        expectedOutcome?: string;
        evidence: readonly RealityEvidence[];
        executionSucceeded: boolean;
    }): OracleEvaluationOutcome;
    /**
     * Builds an in-memory key-value dictionary and nested hierarchy from all collected evidence items.
     */
    private buildObservedStateMap;
}
export declare const globalPostconditionVerificationOracle: PostconditionVerificationOracle;
