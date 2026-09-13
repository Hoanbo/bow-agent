import { Phase14CriterionEvaluation } from './phase14ReadinessTypes.js';
import { Phase14ExecutionGate } from './phase14ExecutionGate.js';
export interface EvaluatorContext {
    readonly tenantId: string;
    readonly shopOfBowUntouched: boolean;
    readonly regressionPassRatio: number;
    readonly userStopLatencyMs: number;
    readonly multiStepCompletionObserved: boolean;
    readonly zeroUnauthToolObserved: boolean;
    readonly zeroUnhandledDenialObserved: boolean;
    readonly inferenceBudgetsEnforced: boolean;
    readonly toolIsolationEnforced: boolean;
    readonly realityVerificationEnforced: boolean;
    readonly memoryPollutionInvariantHeld: boolean;
    readonly distributedTracesComplete: boolean;
    readonly multiTenantIsolationHeld: boolean;
}
export declare class Phase14ExitCriteriaEvaluator {
    private readonly _gate;
    constructor(gate: Phase14ExecutionGate);
    /**
     * Evaluate all 12 exit criteria empirically based on system evidence
     */
    evaluateAllCriteria(context: EvaluatorContext, nowIso?: string): readonly Phase14CriterionEvaluation[];
    private evaluateSingleCriterion;
}
