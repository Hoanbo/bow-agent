// src/core/governedRuntimeCompliance/GovernedRuntimeComplianceModuleIndex.ts
// Component 1197: GovernedRuntimeComplianceModuleIndex (REAL)
//
// Master coordinator and public container factory for MS-1.5.22.
// Encapsulates telemetry ingestion, policy binding, deterministic evaluation, assurance scoring,
// drift classification, adaptive safety control, evidence compilation, and audit ledger chaining.
// Điều phối viên trung tâm và nhà máy container công khai cho MS-1.5.22.
// Đóng gói tiếp nhận đo lường, liên kết chính sách, đánh giá tiền định, chấm điểm đảm bảo,
// phân loại độ lệch, điều khiển an toàn thích ứng, tổng hợp bằng chứng và chuỗi sổ cái kiểm toán.

import {
  RuntimeBehaviorObservationCollector,
  RawTelemetryInput,
  EmergencyStopProvider,
} from './RuntimeBehaviorObservationCollector.js';
import {
  ActivePolicySnapshotBindingResolver,
  PolicySnapshotProvider,
} from './ActivePolicySnapshotBindingResolver.js';
import { DeterministicPolicyComplianceEvaluator } from './DeterministicPolicyComplianceEvaluator.js';
import { ContinuousOperationalAssuranceScorer } from './ContinuousOperationalAssuranceScorer.js';
import { PolicyViolationDriftClassifier } from './PolicyViolationDriftClassifier.js';
import {
  GovernedAdaptiveSafetyController,
  LifecycleStateCoordinatorBridge,
  IncidentManagerBridge,
} from './GovernedAdaptiveSafetyController.js';
import { RuntimeComplianceEvidenceDossierEngine } from './RuntimeComplianceEvidenceDossierEngine.js';
import { RuntimeComplianceAuditLedger } from './RuntimeComplianceAuditLedger.js';
import {
  RuntimeBehavioralProfile,
  ActivePolicyBinding,
  ComplianceEvaluationRecord,
  OperationalAssuranceScore,
  PolicyViolationRecord,
  SafetyControlDecision,
  RuntimeComplianceEvidenceDossier,
} from './GovernedRuntimeComplianceTypes.js';
import type { CanonicalStrategicPolicy } from '../governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.js';

export interface GovernedRuntimeComplianceContainerConfig {
  readonly stopProvider?: EmergencyStopProvider;
  readonly snapshotProvider?: PolicySnapshotProvider;
  readonly lifecycleBridge?: LifecycleStateCoordinatorBridge;
  readonly incidentBridge?: IncidentManagerBridge;
  readonly baseStorageDir?: string;
}

export class GovernedRuntimeComplianceModuleIndex {
  public readonly collector: RuntimeBehaviorObservationCollector;
  public readonly bindingResolver: ActivePolicySnapshotBindingResolver;
  public readonly evaluator: DeterministicPolicyComplianceEvaluator;
  public readonly scorer: ContinuousOperationalAssuranceScorer;
  public readonly classifier: PolicyViolationDriftClassifier;
  public readonly safetyController: GovernedAdaptiveSafetyController;
  public readonly dossierEngine: RuntimeComplianceEvidenceDossierEngine;
  public readonly auditLedger: RuntimeComplianceAuditLedger;

  constructor(config: GovernedRuntimeComplianceContainerConfig = {}) {
    this.collector = new RuntimeBehaviorObservationCollector(config.stopProvider);
    this.bindingResolver = new ActivePolicySnapshotBindingResolver(
      config.snapshotProvider ?? {
        getActivePolicy: async () => null,
      },
      config.stopProvider
    );
    this.evaluator = new DeterministicPolicyComplianceEvaluator();
    this.scorer = new ContinuousOperationalAssuranceScorer();
    this.classifier = new PolicyViolationDriftClassifier();
    this.safetyController = new GovernedAdaptiveSafetyController(
      config.lifecycleBridge,
      config.incidentBridge,
      config.stopProvider
    );
    this.dossierEngine = new RuntimeComplianceEvidenceDossierEngine();
    this.auditLedger = new RuntimeComplianceAuditLedger(config.baseStorageDir);
  }

  // High-level operational workflow: processes a runtime telemetry event through full compliance lifecycle.
  // Quy trình vận hành cấp cao: xử lý sự kiện đo lường thời gian thực qua toàn bộ vòng đời tuân thủ.
  public async processRuntimeTelemetry(
    rawTelemetry: RawTelemetryInput,
    policy: CanonicalStrategicPolicy
  ): Promise<{
    profile: RuntimeBehavioralProfile;
    binding: ActivePolicyBinding;
    evaluation: ComplianceEvaluationRecord;
    violation: PolicyViolationRecord | null;
    assurance: OperationalAssuranceScore;
    safetyDecision: SafetyControlDecision;
    dossier: RuntimeComplianceEvidenceDossier;
  }> {
    // 1. Ingest & Sanitize Observation
    const profile = this.collector.ingestObservation(rawTelemetry);

    // 2. Resolve Active Policy Binding
    const binding = await this.bindingResolver.resolveActiveBinding(
      profile.tenantId,
      profile.policyDomain,
      policy.policyVersion,
      policy.metadata.canonicalHash
    );

    // 3. Deterministic Compliance Evaluation
    const evaluation = this.evaluator.evaluateCompliance(profile, policy, binding);

    // 4. Violation Classification & Drift Tracking
    const violation = this.classifier.classifyViolation(profile, evaluation);

    // 5. Continuous Operational Assurance Scoring
    const allEvals = [evaluation];
    const allViolations = violation ? [violation] : [];
    const assurance = this.scorer.computeAssuranceScore(
      profile.tenantId,
      profile.policyDomain,
      allEvals,
      allViolations
    );

    // 6. Adaptive Safety Decision
    const safetyDecision = await this.safetyController.evaluateSafetyIntervention(
      assurance,
      allViolations
    );

    // 7. Compile Immutable Evidence Dossier
    const dossier = this.dossierEngine.compileDossier(
      profile.tenantId,
      assurance,
      allViolations,
      binding.policyVersion,
      binding.canonicalPolicyHash
    );

    // 8. Record Audit Events
    await this.auditLedger.appendEvent(
      profile.tenantId,
      profile.policyDomain,
      evaluation.verdict === 'COMPLIANT' ? 'COMPLIANCE_EVALUATED_COMPLIANT' : 'COMPLIANCE_EVALUATED_NON_COMPLIANT',
      {
        observationId: profile.observationId,
        evaluationId: evaluation.evaluationId,
        verdict: evaluation.verdict,
        scoreValue: assurance.scoreValue,
        safetyAction: safetyDecision.triggeredAction,
      }
    );

    return {
      profile,
      binding,
      evaluation,
      violation,
      assurance,
      safetyDecision,
      dossier,
    };
  }
}
