import { Phase14ChaosFaultType, Phase14ChaosScenarioResult, Phase14CriterionEvaluation } from './phase14ReadinessTypes.js';
import { Phase14ExecutionGate } from './phase14ExecutionGate.js';
import { EvaluatorContext } from './phase14ExitCriteriaEvaluator.js';
export interface RunAssessmentOptions {
    readonly tenantId: string;
    readonly simulatedFailures?: readonly Phase14ChaosFaultType[];
    readonly contextOverrides?: Partial<EvaluatorContext>;
}
export interface AssessmentRunResults {
    readonly criteriaEvaluations: readonly Phase14CriterionEvaluation[];
    readonly chaosScenarios: readonly Phase14ChaosScenarioResult[];
    readonly passRatio: number;
    readonly criteriaPassedCount: number;
}
export declare class Phase14ReadinessAssessor {
    private readonly _gate;
    private readonly _injector;
    private readonly _evaluator;
    constructor(gate: Phase14ExecutionGate);
    /**
     * Run full holistic readiness assessment across chaos scenarios and 12 exit criteria
     */
    assessReadiness(options: RunAssessmentOptions): Promise<AssessmentRunResults>;
}
