import { Phase14ChaosFaultType, Phase14ProvenanceManifest, Phase14ReadinessResult } from './phase14ReadinessTypes.js';
import { Phase14GateOptions } from './phase14ExecutionGate.js';
import { EvaluatorContext } from './phase14ExitCriteriaEvaluator.js';
export interface AssessReadinessInput {
    readonly tenantId: string;
    readonly reportId?: string;
    readonly simulatedFailures?: readonly Phase14ChaosFaultType[];
    readonly contextOverrides?: Partial<EvaluatorContext>;
    readonly customProvenanceManifest?: Partial<Phase14ProvenanceManifest>;
}
export declare class Phase14ReadinessRuntime {
    private readonly _gate;
    private readonly _assessor;
    constructor(gateOptions?: Phase14GateOptions);
    /**
     * Static factory method for quick execution
     */
    static assessPhase14Readiness(input: AssessReadinessInput, gateOptions?: Phase14GateOptions): Promise<Phase14ReadinessResult>;
    /**
     * Compute deterministic SHA-256 provenance manifest across MS-1.4.01 through MS-1.4.11
     */
    private buildProvenanceManifest;
    /**
     * Execute readiness assessment and generate sealed report
     */
    assess(input: AssessReadinessInput): Promise<Phase14ReadinessResult>;
}
