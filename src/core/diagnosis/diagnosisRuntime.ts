// src/core/diagnosis/diagnosisRuntime.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Master Autonomous Diagnosis & Supervisor Decision-Support Runtime.
// Coordinates evidence correlation, hypothesis generation, contradiction preservation,
// incident classification, and decision-support package synthesis within strict governance boundaries.
// Thời gian chạy tự chẩn đoán và hỗ trợ quyết định giám sát viên chủ chốt.
// Điều phối tương quan bằng chứng, tạo giả thuyết, bảo toàn mâu thuẫn,
// phân loại sự cố và tổng hợp gói hỗ trợ quyết định trong ranh giới quản trị nghiêm ngặt.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - DIAGNOSIS != EXECUTION: Zero autonomous remediation execution.
// - ROOT_CAUSE_HYPOTHESIS != FACT: Hypotheses are probabilistic inferences (confidence <= 0.95).
// - CONFIDENCE != AUTHORITY: High confidence grants zero authorization.
// - DECISION_PACKAGE != OWNER_DECISION: Human supervisor retains absolute prerogative.
// - AGENT_COUNT != AUTHORITY_COUNT: Zero majority voting; all dissent preserved.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
// - ZERO SHELL EXECUTION: child_process, execSync, spawn, and fork are strictly prohibited.
// - ZERO TOKEN ISSUANCE: issueToken() and approve() are NEVER invoked by this runtime.
// - CANONICAL AUDIT: All events recorded to globalAuditLedger under domain 'INCIDENT_DIAGNOSIS'.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import { globalSupervisorHumanGate, type SupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import type { Diagnosis as LegacySupervisorDiagnosis, RecoveryPlan as LegacyRecoveryPlan, AnomalySeverity } from '../supervisor/supervisorTypes.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
import type {
  ObservabilitySessionId,
  ObservabilityHealthState,
  InvariantCheck,
  DriftEvent,
  ObservabilityAlert,
  TelemetryAggregationWindow,
  ObservabilityContradictionRecord,
} from '../observability/observabilityTypes.js';
import type {
  IncidentDiagnosis,
  AgentDiagnosticAssertion,
  IncidentSeverity,
} from './diagnosisTypes.js';
import { EvidenceCorrelationEngine, globalEvidenceCorrelationEngine } from './evidenceCorrelationEngine.js';
import { RootCauseHypothesisEngine, globalRootCauseHypothesisEngine } from './rootCauseHypothesisEngine.js';
import { IncidentClassificationEngine, globalIncidentClassificationEngine } from './incidentClassificationEngine.js';
import { DiagnosisContradictionEngine, globalDiagnosisContradictionEngine } from './diagnosisContradictionEngine.js';
import { DiagnosisProvenanceEngine, globalDiagnosisProvenanceEngine } from './diagnosisProvenanceEngine.js';
import { DecisionSupportSynthesizer, globalDecisionSupportSynthesizer } from './decisionSupportSynthesizer.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from './diagnosisSanitizer.js';

export interface DiagnoseIncidentOptions {
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly targetPath?: string;
  readonly referenceTime?: number;
  readonly windowDurationMs?: number;
  readonly invariantChecks?: readonly InvariantCheck[];
  readonly driftEvents?: readonly DriftEvent[];
  readonly alerts?: readonly ObservabilityAlert[];
  readonly telemetryWindow?: TelemetryAggregationWindow;
  readonly multiAgentAssertions?: readonly AgentDiagnosticAssertion[];
  readonly observabilityContradictions?: readonly ObservabilityContradictionRecord[];
  readonly currentHealth?: ObservabilityHealthState;
  readonly canaryRollbackRecommended?: boolean;
  readonly telemetrySampleHashes?: readonly string[];
  readonly invariantEvidenceHashes?: readonly string[];
  readonly driftEvidenceHashes?: readonly string[];
  readonly alertFingerprints?: readonly string[];
  readonly parentProvenanceHash?: string;
}

export class DiagnosisRuntime {
  private isUserStopActive = false;
  private isRevoked = false;

  constructor(
    private readonly correlationEngine: EvidenceCorrelationEngine = globalEvidenceCorrelationEngine,
    private readonly hypothesisEngine: RootCauseHypothesisEngine = globalRootCauseHypothesisEngine,
    private readonly classificationEngine: IncidentClassificationEngine = globalIncidentClassificationEngine,
    private readonly contradictionEngine: DiagnosisContradictionEngine = globalDiagnosisContradictionEngine,
    private readonly provenanceEngine: DiagnosisProvenanceEngine = globalDiagnosisProvenanceEngine,
    private readonly synthesizer: DecisionSupportSynthesizer = globalDecisionSupportSynthesizer,
    private readonly sanitizer: DiagnosisSanitizer = globalDiagnosisSanitizer,
    private readonly auditLedger: AuditLedger = globalAuditLedger,
    private readonly humanGate: SupervisorHumanGate = globalSupervisorHumanGate
  ) {}

  // ---------------------------------------------------------------------------
  // 1. SAFETY CONTROLS & KILL SWITCHES / KIỂM SOÁT AN TOÀN & CÔNG TẮC DỪNG
  // ---------------------------------------------------------------------------

  public triggerUserStop(reason: string): void {
    this.isUserStopActive = true;
    this.logAudit('USER_STOP_TRIGGERED', 'SAFETY', { reason }, 'DENY');
  }

  public triggerRevocation(reason: string): void {
    this.isRevoked = true;
    this.logAudit('REVOCATION_TRIGGERED', 'SAFETY', { reason }, 'DENY');
  }

  public resetSafetySwitches(): void {
    this.isUserStopActive = false;
    this.isRevoked = false;
  }

  public get isSafetyHalted(): boolean {
    return this.isUserStopActive || this.isRevoked;
  }

  // ---------------------------------------------------------------------------
  // 2. INCIDENT DIAGNOSIS ORCHESTRATION / ĐIỀU PHỐI CHẨN ĐOÁN SỰ CỐ
  // ---------------------------------------------------------------------------

  /**
   * Performs autonomous self-diagnosis, incident classification, and decision-support package synthesis.
   * Purely advisory analysis; executes zero remediation.
   * Thực hiện tự chẩn đoán có quản trị, phân loại sự cố và tổng hợp gói hỗ trợ quyết định.
   * Phân tích hoàn toàn mang tính khuyến nghị; không thực thi bất kỳ hành động khắc phục nào.
   */
  public diagnoseIncident(options: DiagnoseIncidentOptions): IncidentDiagnosis {
    // 1. Assert protected workspace isolation
    // 1. Khẳng định sự cô lập không gian làm việc được bảo vệ
    if (options.targetPath) {
      SandboxPathGuard.assertNotProtectedWorkspace(options.targetPath);
    }
    SandboxPathGuard.assertNotProtectedWorkspace(options.targetId);

    // 2. Enforce safety switches
    // 2. Thực thi các công tắc an toàn
    if (this.isUserStopActive) {
      this.logAudit('DIAGNOSIS_ABORTED', 'SAFETY', { reason: 'USER_STOP_ACTIVE', targetId: options.targetId }, 'DENY');
      throw new Error('USER_STOP_ACTIVE: Diagnosis execution aborted by Master Human Operator emergency stop.');
    }
    if (this.isRevoked) {
      this.logAudit('DIAGNOSIS_ABORTED', 'SAFETY', { reason: 'REVOKED', targetId: options.targetId }, 'DENY');
      throw new Error('REVOKED: Diagnosis execution aborted due to session revocation.');
    }

    const evaluatedAt = options.referenceTime ?? Date.now();

    this.logAudit('DIAGNOSIS_STARTED', 'OBSERVATION', {
      sessionId: options.sessionId,
      targetId: options.targetId,
      evaluatedAt,
    }, 'PERMIT');

    // 3. Evaluate multi-agent assertions for contradictions (rejection of majority voting)
    // 3. Đánh giá khẳng định đa tác nhân để phát hiện mâu thuẫn (bác bỏ bỏ phiếu đa số)
    const contradictionResult = this.contradictionEngine.evaluateAssertions(
      options.multiAgentAssertions ?? [],
      options.observabilityContradictions
    );

    if (contradictionResult.hasContradiction) {
      this.logAudit('DIAGNOSIS_CONTRADICTION_DETECTED', 'OBSERVATION', {
        sessionId: options.sessionId,
        targetId: options.targetId,
        conflictingFields: contradictionResult.conflictingFields,
        dissentingCount: contradictionResult.dissentingViews.length,
      }, 'PERMIT');
    }

    // 4. Correlate observational evidence
    // 4. Tương quan bằng chứng quan sát
    const cluster = this.correlationEngine.correlate({
      sessionId: options.sessionId,
      targetId: options.targetId,
      referenceTime: evaluatedAt,
      windowDurationMs: options.windowDurationMs,
      invariantChecks: options.invariantChecks,
      driftEvents: options.driftEvents,
      alerts: options.alerts,
      telemetryWindow: options.telemetryWindow,
    });

    this.logAudit('EVIDENCE_CORRELATED', 'OBSERVATION', {
      sessionId: options.sessionId,
      targetId: options.targetId,
      clusterId: cluster.clusterId,
      clusterHash: cluster.clusterHash,
      itemCount: cluster.items.length,
      totalWeight: cluster.totalWeight,
    }, 'PERMIT');

    // 5. Formulate root-cause hypotheses
    // 5. Xây dựng các giả thuyết nguyên nhân gốc
    const hypotheses = this.hypothesisEngine.evaluateHypotheses(cluster, {
      hasMultiAgentDissent: contradictionResult.isConflicted,
    });

    this.logAudit('HYPOTHESIS_GENERATED', 'OBSERVATION', {
      sessionId: options.sessionId,
      targetId: options.targetId,
      hypothesesCount: hypotheses.length,
      primaryCategory: hypotheses.length > 0 ? hypotheses[0].category : 'NONE',
      primaryConfidence: hypotheses.length > 0 ? hypotheses[0].confidenceScore : 0,
    }, 'PERMIT');

    // 6. Classify incident severity and blast radius
    // 6. Phân loại mức độ nghiêm trọng và bán kính ảnh hưởng sự cố
    const classification = this.classificationEngine.classify({
      cluster,
      hypotheses,
      currentHealth: options.currentHealth,
      telemetrySampleCount: options.telemetryWindow?.totalSamples,
      isConflicted: contradictionResult.isConflicted,
      canaryRollbackRecommended: options.canaryRollbackRecommended,
    });

    this.logAudit('INCIDENT_CLASSIFIED', 'OBSERVATION', {
      sessionId: options.sessionId,
      targetId: options.targetId,
      incidentId: classification.incidentId,
      severity: classification.severity,
      blastRadius: classification.blastRadius,
      rationale: classification.rationale,
    }, 'PERMIT');

    // 7. Synthesize Supervisor Decision-Support Package
    // 7. Tổng hợp gói hỗ trợ quyết định giám sát viên
    const decisionPackage = this.synthesizer.synthesize({
      classification,
      cluster,
      hypotheses,
      currentHealth: options.currentHealth ?? 'UNKNOWN',
      dissentingViews: contradictionResult.dissentingViews,
      telemetrySampleHashes: options.telemetrySampleHashes,
      invariantEvidenceHashes: options.invariantEvidenceHashes,
      driftEvidenceHashes: options.driftEvidenceHashes,
      alertFingerprints: options.alertFingerprints,
      parentProvenanceHash: options.parentProvenanceHash,
      timestamp: evaluatedAt,
    });

    this.logAudit('DECISION_PACKAGE_CREATED', 'OBSERVATION', {
      sessionId: options.sessionId,
      targetId: options.targetId,
      packageId: decisionPackage.packageId,
      incidentId: decisionPackage.incidentId,
      packageHash: decisionPackage.packageHash,
      provenanceSignature: decisionPackage.provenanceSignature,
      aggregateConfidence: decisionPackage.aggregateConfidence,
      aggregateUncertainty: decisionPackage.aggregateUncertainty,
      recommendedActionsCount: decisionPackage.recommendedActions.length,
    }, 'PERMIT');

    const primaryHypothesis = hypotheses.length > 0 ? hypotheses[0] : undefined;

    return {
      incidentId: classification.incidentId,
      sessionId: options.sessionId,
      targetId: options.targetId,
      evaluatedAt,
      severity: classification.severity,
      blastRadius: classification.blastRadius,
      primaryHypothesis,
      allHypotheses: hypotheses,
      dissentingViews: contradictionResult.dissentingViews,
      isConflicted: contradictionResult.isConflicted,
      confidenceScore: decisionPackage.aggregateConfidence,
      uncertaintyScore: decisionPackage.aggregateUncertainty,
      decisionPackage,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. HUMAN GATE SUBMISSION / GỬI TỚI CỔNG CON NGƯỜI
  // ---------------------------------------------------------------------------

  /**
   * Submits an inert decision package to the SupervisorHumanGate for human evaluation.
   * Adapts IncidentDiagnosis to legacy HumanGateRequest contracts without creating execution authority.
   * Gửi gói quyết định trơ tới SupervisorHumanGate để con người đánh giá.
   * Thích ứng IncidentDiagnosis với các hợp đồng HumanGateRequest cũ mà không tạo ra quyền thực thi.
   */
  public submitToSupervisorGate(diagnosis: IncidentDiagnosis): {
    readonly requestId: string;
    readonly status: string;
  } {
    if (this.isUserStopActive) {
      throw new Error('USER_STOP_ACTIVE: Cannot submit to HumanGate when USER_STOP is active');
    }
    if (this.isRevoked) {
      throw new Error('REVOKED: Cannot submit to HumanGate when session is revoked');
    }

    const pkg = diagnosis.decisionPackage;

    // Map severity to legacy AnomalySeverity
    let legacySeverity: AnomalySeverity = 'MEDIUM';
    if (diagnosis.severity === 'CRITICAL') legacySeverity = 'CRITICAL';
    else if (diagnosis.severity === 'HIGH') legacySeverity = 'HIGH';
    else if (diagnosis.severity === 'LOW') legacySeverity = 'LOW';
    else if (diagnosis.severity === 'INFORMATIONAL') legacySeverity = 'INFO';

    // Construct inert legacy Diagnosis adapter
    const legacyDiagnosis: LegacySupervisorDiagnosis = {
      diagnosisId: `diag_${diagnosis.incidentId}`,
      anomalyId: diagnosis.incidentId,
      timestamp: diagnosis.evaluatedAt,
      probableCause: diagnosis.primaryHypothesis
        ? `[${diagnosis.primaryHypothesis.category}] ${diagnosis.primaryHypothesis.title}`
        : 'Unclassified distributed incident',
      evidence: diagnosis.primaryHypothesis
        ? [...diagnosis.primaryHypothesis.supportingEvidenceIds]
        : [],
      affectedCapability: 'observability_mesh',
      affectedResource: diagnosis.targetId,
      severity: legacySeverity,
      isInconclusive: diagnosis.severity === 'UNKNOWN' || diagnosis.isConflicted,
      recoverability: 'HUMAN_REQUIRED',
      recommendedRecovery: pkg.recommendedActions.length > 0 ? pkg.recommendedActions[0].title : 'MANUAL_OPERATOR_INSPECTION',
      requiresHumanApproval: true,
    };

    // Construct inert legacy RecoveryPlan adapter
    // Crucial Invariant: capabilityId is 'manual_operator_remediation' (inert descriptive marker)
    const legacyPlan: LegacyRecoveryPlan = {
      planId: `plan_${diagnosis.incidentId}`,
      diagnosisId: legacyDiagnosis.diagnosisId,
      anomalyId: diagnosis.incidentId,
      recoveryClass: 'HUMAN_REQUIRED',
      steps: pkg.recommendedActions.map((action, index) => ({
        stepIndex: index + 1,
        description: `[HUMAN ONLY] ${action.title}: ${action.description}`,
        capabilityId: 'manual_operator_remediation',
        target: diagnosis.targetId,
        parameters: {
          actionId: action.actionId,
          riskScore: action.riskScore,
          suggestedCommands: action.suggestedCommands,
          isAutomatedExecutionPermitted: false,
        },
        isReversible: false,
      })),
      requiresHumanApproval: true,
      riskLevel: pkg.recommendedActions.length > 0 ? pkg.recommendedActions[0].riskLevel : 'HIGH',
      timeoutMs: 300_000, // 5 minutes
      maxAttempts: 1,
      createdTimestamp: Date.now(),
    };

    // Submit to canonical SupervisorHumanGate
    const gateRequest = this.humanGate.createRequest(legacyDiagnosis, legacyPlan, {
      target: diagnosis.targetId,
      affectedResources: [...pkg.impactAssessment.affectedSubsystems],
      expectedEffects: pkg.recommendedActions.map((a) => a.description),
      ttlMs: 300_000,
      authorizationContext: {
        actionId: diagnosis.incidentId,
        sessionId: diagnosis.sessionId,
        deviceId: 'dev_host_master',
        capabilityId: 'manual_operator_remediation',
        parameters: {
          packageId: pkg.packageId,
          packageHash: pkg.packageHash,
          provenanceSignature: pkg.provenanceSignature,
        },
        target: diagnosis.targetId,
      },
    });

    this.logAudit('HUMAN_GATE_SUBMITTED', 'OBSERVATION', {
      requestId: gateRequest.requestId,
      incidentId: diagnosis.incidentId,
      packageId: pkg.packageId,
      status: gateRequest.status,
    }, 'PERMIT');

    return {
      requestId: gateRequest.requestId,
      status: gateRequest.status,
    };
  }

  // ---------------------------------------------------------------------------
  // 4. CANONICAL AUDIT LOGGING HELPER / TRỢ THỦ GHI NHẬT KÝ KIỂM TOÁN CHUẨN TẮC
  // ---------------------------------------------------------------------------

  private logAudit(
    action: string,
    classification: string,
    details: Record<string, unknown>,
    policyDecision: 'PERMIT' | 'DENY'
  ): string {
    const sanitizedDetails = this.sanitizer.sanitize(details);
    const rawPayload = JSON.stringify({ action, ...sanitizedDetails });
    const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    this.auditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: 'BOWCON_DIAGNOSIS_RUNTIME',
        role: 'DIAGNOSTICIAN',
        channel: 'INTERNAL',
      },
      domain: 'INCIDENT_DIAGNOSIS',
      toolName: action,
      classification,
      argumentsHash,
      policyDecision,
      executionStatus: policyDecision === 'DENY' ? 'BLOCKED' : 'SUCCESS',
      resultHash: argumentsHash,
    });

    return argumentsHash;
  }
}

export const globalDiagnosisRuntime = new DiagnosisRuntime();
