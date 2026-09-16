// src/core/governedPolicySimulation/GovernedPolicySimulationModuleIndex.ts
// Component 1217: GovernedPolicySimulationModuleIndex (REAL)
//
// Master coordinator and public barrel export interface for the entire native governed
// policy simulation subsystem, orchestrating pre-ratification verification while enforcing strict boundaries.
// Bộ điều phối chính và giao diện xuất công khai cho toàn bộ phân hệ mô phỏng chính sách được quản trị bản địa,
// điều phối xác minh tiền phê chuẩn đồng thời thực thi các ranh giới nghiêm ngặt.

import type { PolicyDomain, PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  EmergencyStopProvider,
  EmergencyStopActiveError,
  SimulationCrossTenantAccessForbiddenError,
  SimulationAuthorityViolationError,
  SimulationSessionId,
  asSimulationSessionId,
  HistoricalObservationItem,
  PolicyDomainDependency,
  SyntheticStressConfig,
  PolicySimulationEvidenceDossier,
  SimulationAdvisoryPackage,
  computeCandidatePolicyHash,
} from './GovernedPolicySimulationTypes.js';
import {
  HistoricalExecutionReplayEngine,
} from './HistoricalExecutionReplayEngine.js';
import {
  CounterfactualAssuranceProjector,
} from './CounterfactualAssuranceProjector.js';
import {
  CrossDomainPolicyInvariantChecker,
} from './CrossDomainPolicyInvariantChecker.js';
import {
  SyntheticPolicyStressHarness,
} from './SyntheticPolicyStressHarness.js';
import {
  ShadowDualEvaluationBridge,
  LiveSanitizedObservationInput,
} from './ShadowDualEvaluationBridge.js';
import {
  SimulationEvidenceDossierEngine,
} from './SimulationEvidenceDossierEngine.js';
import {
  PreRatificationSimulationAdvisoryBridge,
} from './PreRatificationSimulationAdvisoryBridge.js';
import {
  PolicySimulationAuditLedger,
} from './PolicySimulationAuditLedger.js';

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

export class GovernedPolicySimulationModuleIndex {
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly replayEngine: HistoricalExecutionReplayEngine;
  private readonly assuranceProjector: CounterfactualAssuranceProjector;
  private readonly invariantChecker: CrossDomainPolicyInvariantChecker;
  private readonly stressHarness: SyntheticPolicyStressHarness;
  private readonly shadowBridge: ShadowDualEvaluationBridge;
  private readonly dossierEngine: SimulationEvidenceDossierEngine;
  private readonly advisoryBridge: PreRatificationSimulationAdvisoryBridge;
  private readonly auditLedger: PolicySimulationAuditLedger;

  constructor(config?: GovernedPolicySimulationContainerConfig) {
    this.emergencyStopProvider = config?.emergencyStopProvider;

    this.replayEngine = new HistoricalExecutionReplayEngine(this.emergencyStopProvider);
    this.assuranceProjector = new CounterfactualAssuranceProjector(
      this.emergencyStopProvider,
      config?.falseRejectionThreshold
    );
    this.invariantChecker = new CrossDomainPolicyInvariantChecker(this.emergencyStopProvider);
    this.stressHarness = new SyntheticPolicyStressHarness(this.emergencyStopProvider);
    this.shadowBridge = new ShadowDualEvaluationBridge(this.emergencyStopProvider);
    this.dossierEngine = new SimulationEvidenceDossierEngine(this.emergencyStopProvider);
    this.advisoryBridge = new PreRatificationSimulationAdvisoryBridge(this.emergencyStopProvider);
    this.auditLedger = new PolicySimulationAuditLedger(this.emergencyStopProvider, config?.baseStorageDir);
  }

  private assertEmergencyStopInactive(): void {
    if (!this.emergencyStopProvider) {
      throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
    }
    let active: unknown;
    try {
      active = this.emergencyStopProvider.isEmergencyStopActive();
    } catch (err) {
      throw new EmergencyStopActiveError(
        `Emergency stop provider threw error during pipeline execution: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (typeof active !== 'boolean' || active === true) {
      throw new EmergencyStopActiveError('Emergency stop is ACTIVE or non-boolean (fail-closed)');
    }
  }

  private sanitizeTenantId(tenantId: string): string {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new SimulationCrossTenantAccessForbiddenError('Tenant ID must be a non-empty string');
    }
    const clean = tenantId.trim();
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(clean)) {
      throw new SimulationCrossTenantAccessForbiddenError(`Invalid tenant ID format: ${clean}`);
    }
    const reservedWindows = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedWindows.test(clean) || clean.includes('..') || clean.includes('/') || clean.includes('\\')) {
      throw new SimulationCrossTenantAccessForbiddenError(`Forbidden tenant path token: ${clean}`);
    }
    return clean;
  }

  /**
   * Orchestrates complete pre-ratification policy simulation pipeline.
   * SIMULATION != RATIFICATION: Produces non-authoritative simulation evidence dossiers only.
   */
  public executeSimulationPipeline(input: SimulationPipelineInput): SimulationPipelineResult {
    this.assertEmergencyStopInactive();

    const cleanTenant = this.sanitizeTenantId(input.tenantId);
    if (!input.basePolicyHash) {
      throw new SimulationAuthorityViolationError('Base policy hash must be non-empty');
    }
    if (!Array.isArray(input.candidateDeltas)) {
      throw new SimulationAuthorityViolationError('Candidate deltas must be an array');
    }

    const sessionId = asSimulationSessionId(`sim_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    const candidatePolicyHash = computeCandidatePolicyHash(input.candidateDeltas, input.basePolicyHash);

    // 1. Audit initiation
    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'SIMULATION_SESSION_INITIATED',
      { sessionId, candidatePolicyHash, basePolicyHash: input.basePolicyHash },
      sessionId
    );

    // 2. Historical Replay
    const corpus = input.historicalCorpus ?? [];
    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'HISTORICAL_REPLAY_STARTED',
      { corpusCount: corpus.length },
      sessionId
    );

    const replayResult = this.replayEngine.replayCorpus(
      cleanTenant,
      input.policyDomain,
      input.candidateDeltas,
      corpus
    );

    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'HISTORICAL_REPLAY_COMPLETED',
      { totalReplayed: replayResult.totalReplayed, falseRejections: replayResult.falseRejectionCount },
      sessionId
    );

    // 3. Assurance Projection
    const baselineA = input.baselineAssurance ?? 0.85;
    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'ASSURANCE_PROJECTION_STARTED',
      { baselineAssurance: baselineA },
      sessionId
    );

    const assuranceProjection = this.assuranceProjector.projectAssuranceImpact(replayResult, baselineA);

    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'ASSURANCE_PROJECTION_COMPLETED',
      { projectedAssurance: assuranceProjection.projectedAssurance, delta: assuranceProjection.assuranceDelta },
      sessionId
    );

    if (assuranceProjection.isHighRegressionRisk) {
      this.auditLedger.appendAuditEvent(
        cleanTenant,
        input.policyDomain,
        'HIGH_REGRESSION_RISK_FLAGGED',
        { falsePositiveRate: assuranceProjection.falsePositiveRejectionRate },
        sessionId
      );
    }

    // 4. Invariant Checking
    const dependencies = input.domainDependencies ?? [];
    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'INVARIANT_CHECK_STARTED',
      { dependencyCount: dependencies.length },
      sessionId
    );

    const invariantResult = this.invariantChecker.verifyDomainInvariants(dependencies);

    if (invariantResult.hasDeadlock) {
      this.auditLedger.appendAuditEvent(
        cleanTenant,
        input.policyDomain,
        'CROSS_DOMAIN_DEADLOCK_DETECTED',
        { circularDependencies: invariantResult.circularDependencies },
        sessionId
      );
    } else {
      this.auditLedger.appendAuditEvent(
        cleanTenant,
        input.policyDomain,
        'INVARIANT_CHECK_PASSED',
        { verifiedCount: dependencies.length },
        sessionId
      );
    }

    // 5. Synthetic Stress Probing
    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'SYNTHETIC_STRESS_STARTED',
      { config: input.stressConfig ?? {} },
      sessionId
    );

    const stressResult = this.stressHarness.executeStressHarness(input.candidateDeltas, input.stressConfig);

    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'SYNTHETIC_STRESS_COMPLETED',
      { totalProbes: stressResult.totalProbes, failedProbes: stressResult.failedProbes },
      sessionId
    );

    // 6. Live Shadow Dual-Evaluation Tap (optional if observation provided)
    let shadowSummary = { totalShadowEvaluations: 0, totalDivergences: 0 };
    if (input.liveObservationTap) {
      const shadowRecord = this.shadowBridge.evaluateShadowTap(input.liveObservationTap, input.candidateDeltas);
      shadowSummary = {
        totalShadowEvaluations: 1,
        totalDivergences: shadowRecord.isDivergent ? 1 : 0,
      };
      this.auditLedger.appendAuditEvent(
        cleanTenant,
        input.policyDomain,
        'SHADOW_TAP_EVALUATED',
        { shadowRunId: shadowRecord.shadowRunId, isDivergent: shadowRecord.isDivergent },
        sessionId
      );
    }

    // 7. Dossier Compilation
    const dossier = this.dossierEngine.compileSimulationDossier({
      sessionId,
      tenantId: cleanTenant,
      policyDomain: input.policyDomain,
      candidatePolicyHash,
      basePolicyHash: input.basePolicyHash,
      replayResult,
      assuranceProjection,
      invariantResult,
      stressResult,
      shadowSummary,
    });

    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'SIMULATION_DOSSIER_COMPILED',
      { dossierId: dossier.dossierId, verdict: dossier.overallVerdict, fingerprint: dossier.simulationDossierFingerprint },
      sessionId
    );

    // 8. Advisory Handoff
    let advisoryPackage: SimulationAdvisoryPackage | undefined;
    let transmitted = false;

    if (input.autoTransmitToDeliberation) {
      advisoryPackage = this.advisoryBridge.packageSimulationAdvisory(dossier);
      transmitted = true;

      this.auditLedger.appendAuditEvent(
        cleanTenant,
        input.policyDomain,
        'SIMULATION_HANDOFF_TRANSMITTED',
        { handoffId: advisoryPackage.handoffId, handoffNonce: advisoryPackage.handoffNonce },
        sessionId
      );
    }

    this.auditLedger.appendAuditEvent(
      cleanTenant,
      input.policyDomain,
      'SIMULATION_PIPELINE_SUCCEEDED',
      { sessionId, verdict: dossier.overallVerdict },
      sessionId
    );

    return Object.freeze({
      sessionId,
      dossier,
      advisoryPackage,
      transmitted,
    });
  }

  // Getter accessors for subsystem components
  public getReplayEngine(): HistoricalExecutionReplayEngine {
    return this.replayEngine;
  }
  public getAssuranceProjector(): CounterfactualAssuranceProjector {
    return this.assuranceProjector;
  }
  public getInvariantChecker(): CrossDomainPolicyInvariantChecker {
    return this.invariantChecker;
  }
  public getStressHarness(): SyntheticPolicyStressHarness {
    return this.stressHarness;
  }
  public getShadowBridge(): ShadowDualEvaluationBridge {
    return this.shadowBridge;
  }
  public getDossierEngine(): SimulationEvidenceDossierEngine {
    return this.dossierEngine;
  }
  public getAdvisoryBridge(): PreRatificationSimulationAdvisoryBridge {
    return this.advisoryBridge;
  }
  public getAuditLedger(): PolicySimulationAuditLedger {
    return this.auditLedger;
  }
}
