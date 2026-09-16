import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { GovernedPolicyRemediationEvidenceDossier, RemediationHandoffPackage, EmergencyStopProvider } from './GovernedPolicyRemediationTypes.js';
import { IncidentComplianceEvidenceCorrelator, IngestedComplianceData } from './IncidentComplianceEvidenceCorrelator.js';
import { DeterministicPolicyRootCauseEngine, LineageGraphNode } from './DeterministicPolicyRootCauseEngine.js';
import { PolicyBlastRadiusRiskAnalyzer, WorkflowImpactInput } from './PolicyBlastRadiusRiskAnalyzer.js';
import { GovernedRemediationStrategySynthesizer } from './GovernedRemediationStrategySynthesizer.js';
import { OperationalCircuitBreakerAntiThrashingController } from './OperationalCircuitBreakerAntiThrashingController.js';
import { ClosedLoopDeliberationHandoffBridge } from './ClosedLoopDeliberationHandoffBridge.js';
import { PolicyRemediationEvidenceDossierEngine } from './PolicyRemediationEvidenceDossierEngine.js';
import { PolicyRemediationAuditLedger } from './PolicyRemediationAuditLedger.js';
export interface PipelineExecutionInput {
    readonly complianceData: IngestedComplianceData;
    readonly activePolicyHash: string;
    readonly activePolicyVersion?: number;
    readonly lineageNodes?: readonly LineageGraphNode[];
    readonly workflowImpact?: WorkflowImpactInput;
    readonly environmentTelemetry?: Readonly<Record<string, unknown>>;
    readonly autoTransmitToDeliberation?: boolean;
}
export interface PipelineExecutionResult {
    readonly dossier: GovernedPolicyRemediationEvidenceDossier;
    readonly handoffPackage: RemediationHandoffPackage;
    readonly transmitted: boolean;
}
export interface GovernedPolicyRemediationContainerConfig {
    readonly emergencyStopProvider?: EmergencyStopProvider;
    readonly baseStorageDir?: string;
}
export declare class GovernedPolicyRemediationModuleIndex {
    private readonly emergencyStopProvider?;
    private readonly correlator;
    private readonly rootCauseEngine;
    private readonly riskAnalyzer;
    private readonly strategySynthesizer;
    private readonly circuitBreaker;
    private readonly handoffBridge;
    private readonly dossierEngine;
    private readonly auditLedger;
    constructor(config?: GovernedPolicyRemediationContainerConfig);
    private assertEmergencyStopInactive;
    getCorrelator(): IncidentComplianceEvidenceCorrelator;
    getRootCauseEngine(): DeterministicPolicyRootCauseEngine;
    getRiskAnalyzer(): PolicyBlastRadiusRiskAnalyzer;
    getStrategySynthesizer(): GovernedRemediationStrategySynthesizer;
    getCircuitBreaker(): OperationalCircuitBreakerAntiThrashingController;
    getHandoffBridge(): ClosedLoopDeliberationHandoffBridge;
    getDossierEngine(): PolicyRemediationEvidenceDossierEngine;
    getAuditLedger(): PolicyRemediationAuditLedger;
    /**
     * Orchestrates the complete end-to-end closed-loop remediation assessment pipeline.
     * Strictly non-authoritative: output is an evidence dossier and human deliberation handoff package.
     */
    processIncidentRemediationPipeline(tenantId: string, policyDomain: PolicyDomain, input: PipelineExecutionInput): Promise<PipelineExecutionResult>;
}
