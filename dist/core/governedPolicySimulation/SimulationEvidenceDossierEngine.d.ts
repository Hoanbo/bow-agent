import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { EmergencyStopProvider, SimulationSessionId, ReplayExecutionResult, CounterfactualAssuranceProjection, CrossDomainInvariantResult, SyntheticStressResult, PolicySimulationEvidenceDossier } from './GovernedPolicySimulationTypes.js';
export interface DossierCompilationInput {
    readonly sessionId: SimulationSessionId;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly candidatePolicyHash: string;
    readonly basePolicyHash: string;
    readonly replayResult: ReplayExecutionResult;
    readonly assuranceProjection: CounterfactualAssuranceProjection;
    readonly invariantResult: CrossDomainInvariantResult;
    readonly stressResult: SyntheticStressResult;
    readonly shadowSummary?: {
        readonly totalShadowEvaluations: number;
        readonly totalDivergences: number;
    };
    readonly ttlMs?: number;
}
export declare class SimulationEvidenceDossierEngine {
    private readonly emergencyStopProvider?;
    constructor(emergencyStopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    private sanitizeTenantId;
    private deepFreeze;
    /**
     * Compiles an immutable, deep-frozen PolicySimulationEvidenceDossier.
     */
    compileSimulationDossier(input: DossierCompilationInput): PolicySimulationEvidenceDossier;
}
