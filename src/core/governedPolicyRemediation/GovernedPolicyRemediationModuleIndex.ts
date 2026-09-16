// src/core/governedPolicyRemediation/GovernedPolicyRemediationModuleIndex.ts
// Component 1207: GovernedPolicyRemediationModuleIndex (REAL)
//
// Master coordinator and public barrel export interface for the entire native governed
// policy remediation subsystem, orchestrating closed-loop resilience while enforcing strict boundaries.
// Bộ điều phối chính và giao diện xuất công khai cho toàn bộ phân hệ khắc phục chính sách được quản trị bản địa,
// điều phối tính bền bỉ khép vòng đồng thời thực thi các ranh giới nghiêm ngặt.

import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyIncidentRecord } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';
import type {
  RuntimeComplianceEvidenceDossier,
  PolicyViolationRecord,
  OperationalAssuranceScore,
} from '../governedRuntimeCompliance/GovernedRuntimeComplianceTypes.js';
import {
  GovernedPolicyRemediationEvidenceDossier,
  RemediationHandoffPackage,
  EmergencyStopProvider,
  EmergencyStopActiveError,
  CrossTenantAccessForbiddenError,
} from './GovernedPolicyRemediationTypes.js';
import {
  IncidentComplianceEvidenceCorrelator,
  IngestedComplianceData,
} from './IncidentComplianceEvidenceCorrelator.js';
import {
  DeterministicPolicyRootCauseEngine,
  LineageGraphNode,
} from './DeterministicPolicyRootCauseEngine.js';
import {
  PolicyBlastRadiusRiskAnalyzer,
  WorkflowImpactInput,
} from './PolicyBlastRadiusRiskAnalyzer.js';
import {
  GovernedRemediationStrategySynthesizer,
} from './GovernedRemediationStrategySynthesizer.js';
import {
  OperationalCircuitBreakerAntiThrashingController,
} from './OperationalCircuitBreakerAntiThrashingController.js';
import {
  ClosedLoopDeliberationHandoffBridge,
} from './ClosedLoopDeliberationHandoffBridge.js';
import {
  PolicyRemediationEvidenceDossierEngine,
} from './PolicyRemediationEvidenceDossierEngine.js';
import {
  PolicyRemediationAuditLedger,
} from './PolicyRemediationAuditLedger.js';

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

export class GovernedPolicyRemediationModuleIndex {
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly correlator: IncidentComplianceEvidenceCorrelator;
  private readonly rootCauseEngine: DeterministicPolicyRootCauseEngine;
  private readonly riskAnalyzer: PolicyBlastRadiusRiskAnalyzer;
  private readonly strategySynthesizer: GovernedRemediationStrategySynthesizer;
  private readonly circuitBreaker: OperationalCircuitBreakerAntiThrashingController;
  private readonly handoffBridge: ClosedLoopDeliberationHandoffBridge;
  private readonly dossierEngine: PolicyRemediationEvidenceDossierEngine;
  private readonly auditLedger: PolicyRemediationAuditLedger;

  constructor(config?: GovernedPolicyRemediationContainerConfig) {
    this.emergencyStopProvider = config?.emergencyStopProvider;

    this.correlator = new IncidentComplianceEvidenceCorrelator(this.emergencyStopProvider);
    this.rootCauseEngine = new DeterministicPolicyRootCauseEngine(this.emergencyStopProvider);
    this.riskAnalyzer = new PolicyBlastRadiusRiskAnalyzer(this.emergencyStopProvider);
    this.strategySynthesizer = new GovernedRemediationStrategySynthesizer(this.emergencyStopProvider);
    this.circuitBreaker = new OperationalCircuitBreakerAntiThrashingController(this.emergencyStopProvider);
    this.handoffBridge = new ClosedLoopDeliberationHandoffBridge(this.emergencyStopProvider);
    this.dossierEngine = new PolicyRemediationEvidenceDossierEngine(this.emergencyStopProvider);
    this.auditLedger = new PolicyRemediationAuditLedger(this.emergencyStopProvider, config?.baseStorageDir);
  }

  private assertEmergencyStopInactive(): void {
    if (!this.emergencyStopProvider) {
      throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
    }
    let active: unknown;
    try {
      active = this.emergencyStopProvider.isEmergencyStopActive();
    } catch (err: unknown) {
      throw new EmergencyStopActiveError(`Emergency stop provider threw error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (typeof active !== 'boolean') {
      throw new EmergencyStopActiveError('Emergency stop provider returned non-boolean value (fail-closed)');
    }
    if (active === true) {
      throw new EmergencyStopActiveError('Emergency stop is currently ACTIVE (fail-closed)');
    }
  }

  // Public Component Accessors
  public getCorrelator(): IncidentComplianceEvidenceCorrelator { return this.correlator; }
  public getRootCauseEngine(): DeterministicPolicyRootCauseEngine { return this.rootCauseEngine; }
  public getRiskAnalyzer(): PolicyBlastRadiusRiskAnalyzer { return this.riskAnalyzer; }
  public getStrategySynthesizer(): GovernedRemediationStrategySynthesizer { return this.strategySynthesizer; }
  public getCircuitBreaker(): OperationalCircuitBreakerAntiThrashingController { return this.circuitBreaker; }
  public getHandoffBridge(): ClosedLoopDeliberationHandoffBridge { return this.handoffBridge; }
  public getDossierEngine(): PolicyRemediationEvidenceDossierEngine { return this.dossierEngine; }
  public getAuditLedger(): PolicyRemediationAuditLedger { return this.auditLedger; }

  /**
   * Orchestrates the complete end-to-end closed-loop remediation assessment pipeline.
   * Strictly non-authoritative: output is an evidence dossier and human deliberation handoff package.
   */
  public async processIncidentRemediationPipeline(
    tenantId: string,
    policyDomain: PolicyDomain,
    input: PipelineExecutionInput
  ): Promise<PipelineExecutionResult> {
    this.assertEmergencyStopInactive();

    if (!tenantId || tenantId.trim() === '') {
      throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
    }

    // 1. Correlate compliance evidence and operational incidents
    const envelope = this.correlator.correlateIncidentEvidence(
      tenantId,
      policyDomain,
      input.complianceData
    );
    await this.auditLedger.appendEvent(tenantId, policyDomain, 'INCIDENT_CORRELATED', {
      correlationId: envelope.correlationId,
      incidentCount: envelope.incidentIds.length,
      violationCount: envelope.violationIds.length,
    });

    // 2. Deterministic Root-Cause Causal Diagnosis
    const diagnosis = this.rootCauseEngine.diagnoseRootCause(tenantId, policyDomain, {
      envelope,
      activePolicyHash: input.activePolicyHash,
      lineageNodes: input.lineageNodes,
      violations: input.complianceData.violations,
      environmentTelemetry: input.environmentTelemetry,
    });
    await this.auditLedger.appendEvent(tenantId, policyDomain, 'ROOT_CAUSE_DIAGNOSED', {
      diagnosisId: diagnosis.diagnosisId,
      primaryCategory: diagnosis.primaryCategory,
      confidence: diagnosis.confidence,
    });

    // 3. Blast Radius & Systemic Risk Analysis
    const blastRadius = this.riskAnalyzer.evaluateBlastRadius(
      tenantId,
      policyDomain,
      diagnosis,
      input.workflowImpact
    );
    await this.auditLedger.appendEvent(tenantId, policyDomain, 'BLAST_RADIUS_EVALUATED', {
      riskAnalysisId: blastRadius.riskAnalysisId,
      riskScore: blastRadius.riskScore,
      riskLevel: blastRadius.riskLevel,
    });

    // 4. Candidate Strategy Proposal Synthesis
    const candidate = this.strategySynthesizer.synthesizeRemediationCandidate(tenantId, policyDomain, {
      diagnosis,
      blastRadius,
      incidentEvidenceHash: envelope.correlationHash,
      activePolicyHash: input.activePolicyHash,
      activePolicyVersion: input.activePolicyVersion,
    });
    await this.auditLedger.appendEvent(tenantId, policyDomain, 'REMEDIATION_CANDIDATE_GENERATED', {
      remediationId: candidate.remediationId,
      proposedAction: candidate.proposedAction,
      candidateHash: candidate.candidateHash,
    });

    // 5. Immutable Evidence Dossier Compilation
    const dossier = this.dossierEngine.compileRemediationDossier(tenantId, policyDomain, {
      correlationEnvelope: envelope,
      diagnosisRecord: diagnosis,
      blastRadiusRecord: blastRadius,
      remediationCandidate: candidate,
    });

    // 6. Closed-Loop Deliberation Handoff Packaging
    const handoffPackage = this.handoffBridge.compileHandoffPackage(tenantId, policyDomain, {
      candidate,
      diagnosis,
      blastRadius,
      dossier,
      activePolicyVersion: input.activePolicyVersion,
    });
    await this.auditLedger.appendEvent(tenantId, policyDomain, 'HANDOFF_PACKAGE_COMPILED', {
      handoffId: handoffPackage.handoffId,
      remediationId: candidate.remediationId,
      dossierFingerprint: dossier.dossierFingerprint,
    });

    let transmitted = false;
    if (input.autoTransmitToDeliberation) {
      const transmitResult = this.handoffBridge.transmitHandoff(handoffPackage);
      transmitted = transmitResult.transmitted;
      await this.auditLedger.appendEvent(tenantId, policyDomain, 'HANDOFF_PACKAGE_TRANSMITTED', {
        handoffId: handoffPackage.handoffId,
        registered: transmitResult.registeredInDeliberationRegistry,
      });
    }

    return Object.freeze({
      dossier,
      handoffPackage,
      transmitted,
    });
  }
}
