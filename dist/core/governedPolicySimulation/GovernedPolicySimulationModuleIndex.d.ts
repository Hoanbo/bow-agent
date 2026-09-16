import type { PolicyDomain, PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { EmergencyStopProvider, SimulationSessionId, HistoricalObservationItem, PolicyDomainDependency, SyntheticStressConfig, PolicySimulationEvidenceDossier, SimulationAdvisoryPackage } from './GovernedPolicySimulationTypes.js';
import { HistoricalExecutionReplayEngine } from './HistoricalExecutionReplayEngine.js';
import { CounterfactualAssuranceProjector } from './CounterfactualAssuranceProjector.js';
import { CrossDomainPolicyInvariantChecker } from './CrossDomainPolicyInvariantChecker.js';
import { SyntheticPolicyStressHarness } from './SyntheticPolicyStressHarness.js';
import { ShadowDualEvaluationBridge, LiveSanitizedObservationInput } from './ShadowDualEvaluationBridge.js';
import { SimulationEvidenceDossierEngine } from './SimulationEvidenceDossierEngine.js';
import { PreRatificationSimulationAdvisoryBridge } from './PreRatificationSimulationAdvisoryBridge.js';
import { PolicySimulationAuditLedger } from './PolicySimulationAuditLedger.js';
export interface SimulationPipelineInput {
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly candidateDeltas: readonly PolicyDelta[];
    readonly basePolicyHash: string;
    readonly baselineAssurance?: number;
    readonly historicalCorpus?: readonly HistoricalObservationItem[];
    readonly domainDependencies?: readonly PolicyDomainDependency[];
    readonly stressConfig?: Partial<SyntheticStressConfig>;
    readonly liveObservationTap?: LiveSanitizedObservationInput;
    readonly autoTransmitToDeliberation?: boolean;
}
export interface SimulationPipelineResult {
    readonly sessionId: SimulationSessionId;
    readonly dossier: PolicySimulationEvidenceDossier;
    readonly advisoryPackage?: SimulationAdvisoryPackage;
    readonly transmitted: boolean;
}
export interface GovernedPolicySimulationContainerConfig {
    readonly emergencyStopProvider?: EmergencyStopProvider;
    readonly baseStorageDir?: string;
    readonly falseRejectionThreshold?: number;
}
export declare class GovernedPolicySimulationModuleIndex {
    private readonly emergencyStopProvider?;
    private readonly replayEngine;
    private readonly assuranceProjector;
    private readonly invariantChecker;
    private readonly stressHarness;
    private readonly shadowBridge;
    private readonly dossierEngine;
    private readonly advisoryBridge;
    private readonly auditLedger;
    constructor(config?: GovernedPolicySimulationContainerConfig);
    private assertEmergencyStopInactive;
    private sanitizeTenantId;
    /**
     * Orchestrates complete pre-ratification policy simulation pipeline.
     * SIMULATION != RATIFICATION: Produces non-authoritative simulation evidence dossiers only.
     */
    executeSimulationPipeline(input: SimulationPipelineInput): SimulationPipelineResult;
    getReplayEngine(): HistoricalExecutionReplayEngine;
    getAssuranceProjector(): CounterfactualAssuranceProjector;
    getInvariantChecker(): CrossDomainPolicyInvariantChecker;
    getStressHarness(): SyntheticPolicyStressHarness;
    getShadowBridge(): ShadowDualEvaluationBridge;
    getDossierEngine(): SimulationEvidenceDossierEngine;
    getAdvisoryBridge(): PreRatificationSimulationAdvisoryBridge;
    getAuditLedger(): PolicySimulationAuditLedger;
}
