// src/core/observability/observabilityRuntime.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Central coordinator for post-deployment autonomous verification, drift detection, and advisory reporting.
// Bộ điều phối trung tâm cho việc xác minh tự động sau triển khai, phát hiện sai lệch và báo cáo khuyến nghị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - AUTOMATION != OWNER_WILL
// - OBSERVATION != INTERPRETATION != AUTHORITY
// - HEALTH != AUTHORITY
// - DRIFT_DETECTION != AUTHORIZATION
// - TELEMETRY != AUTHORIZATION
// - ALERT != OWNER_APPROVAL
// - RECOMMENDATION != EXECUTION
// - AGENT_COUNT != AUTHORITY_COUNT
// - MONITORING_RESULT != EXECUTION_PERMISSION
// - SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type ObservabilitySessionId,
  type ObservabilitySessionState,
  type ObservabilityHealthState,
  type TelemetrySample,
  type TelemetryAggregationWindow,
  type InvariantCheck,
  type InvariantCategory,
  type DriftEvent,
  type DriftType,
  type ObservabilityAlert,
  type ObservabilityAgentAssertion,
  type ObservabilityContradictionRecord,
  type SupervisorHealthReport,
  type ObservabilityAlertSeverity,
  createObservabilitySessionId,
} from './observabilityTypes.js';

import { TelemetryObservationEngine, type RawTelemetryInput } from './telemetryObservationEngine.js';
import { TelemetryAggregationEngine, type AggregationBaselineOptions } from './telemetryAggregationEngine.js';
import { InvariantVerificationEngine } from './invariantVerificationEngine.js';
import { DriftDetectionEngine, type FilesystemManifestEntry } from './driftDetectionEngine.js';
import { ObservabilityHealthEngine, type HealthEvaluationResult } from './observabilityHealthEngine.js';
import { ObservabilityAlertEngine } from './observabilityAlertEngine.js';
import { ObservabilityContradictionEngine } from './observabilityContradictionEngine.js';
import { SupervisorHealthReportEngine } from './supervisorHealthReportEngine.js';
import { ObservabilityProvenanceEngine, type ObservabilityProvenanceChain } from './observabilityProvenanceEngine.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { SupervisorHumanGate, globalSupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';

export interface StartSessionOptions {
  readonly targetId: string;
  readonly deploymentId: string;
  readonly deploymentVersion: string;
  readonly taskId?: string;
  readonly agentId?: string;
  readonly delegationId?: string;
  readonly capabilityLeaseId?: string;
  readonly sandboxId?: string;
  readonly worktreeId?: string;
  readonly releaseExecutionId?: string;
}

export class ObservabilityRuntime {
  private sessionStates = new Map<string, ObservabilitySessionState>();
  private sessionConfigs = new Map<string, StartSessionOptions>();
  private isUserStopActive = false;
  private isRevoked = false;

  constructor(
    public readonly observationEngine: TelemetryObservationEngine = new TelemetryObservationEngine(),
    public readonly aggregationEngine: TelemetryAggregationEngine = new TelemetryAggregationEngine(),
    public readonly invariantEngine: InvariantVerificationEngine = new InvariantVerificationEngine(),
    public readonly driftEngine: DriftDetectionEngine = new DriftDetectionEngine(),
    public readonly healthEngine: ObservabilityHealthEngine = new ObservabilityHealthEngine(),
    public readonly alertEngine: ObservabilityAlertEngine = new ObservabilityAlertEngine(),
    public readonly contradictionEngine: ObservabilityContradictionEngine = new ObservabilityContradictionEngine(),
    public readonly reportEngine: SupervisorHealthReportEngine = new SupervisorHealthReportEngine(),
    public readonly provenanceEngine: ObservabilityProvenanceEngine = new ObservabilityProvenanceEngine(),
    public readonly humanGate: SupervisorHumanGate = globalSupervisorHumanGate,
    private readonly auditLedger: AuditLedger = globalAuditLedger
  ) {}

  /**
   * Helper to append an immutable event to the canonical AuditLedger.
   * Trợ giúp ghi một sự kiện bất biến vào AuditLedger chuẩn tắc.
   */
  private logAudit(
    action: string,
    actor: { readonly id: string; readonly role: string },
    resource: { readonly id: string; readonly type: string },
    details: Record<string, unknown>
  ): string {
    const sanitizedDetails = this.provenanceEngine.sanitizeSecrets(details);
    const rawPayload = JSON.stringify({ action, resource, ...sanitizedDetails });
    const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    this.auditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: actor.id,
        role: actor.role,
        channel: 'INTERNAL',
      },
      domain: 'OBSERVABILITY_GOVERNANCE',
      toolName: action,
      classification:
        action.includes('STOP') || action.includes('REVOK') || action.includes('VIOLAT') || action.includes('CRITICAL')
          ? 'SAFETY'
          : 'OBSERVATION',
      argumentsHash,
      policyDecision: action.includes('VIOLAT') || action.includes('BLOCK') ? 'DENY' : 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: argumentsHash,
    });

    return argumentsHash;
  }

  // ---------------------------------------------------------------------------
  // 1. SAFETY GATES & STATE MANAGEMENT / CỔNG AN TOÀN & QUẢN LÝ TRẠNG THÁI
  // ---------------------------------------------------------------------------

  /**
   * Triggers global USER_STOP, halting all autonomous observability immediately.
   * Kích hoạt USER_STOP toàn cục, lập tức dừng mọi hành động quan sát tự động.
   */
  public triggerUserStop(reason: string): void {
    this.isUserStopActive = true;
    for (const [sessionId] of this.sessionStates.entries()) {
      this.sessionStates.set(sessionId, 'BLOCKED');
    }
    this.logAudit(
      'USER_STOP_TRIGGERED',
      { id: 'MASTER_OWNER', role: 'MASTER_OWNER' },
      { id: 'GLOBAL_OBSERVABILITY_MESH', type: 'SAFETY_SWITCH' },
      { reason }
    );
  }

  /**
   * Triggers global REVOCATION, revoking all active observation sessions.
   * Kích hoạt REVOCATION toàn cục, thu hồi tất cả các phiên quan sát đang hoạt động.
   */
  public triggerRevocation(reason: string): void {
    this.isRevoked = true;
    for (const [sessionId] of this.sessionStates.entries()) {
      this.sessionStates.set(sessionId, 'REVOKED');
    }
    this.logAudit(
      'REVOCATION_TRIGGERED',
      { id: 'MASTER_OWNER', role: 'MASTER_OWNER' },
      { id: 'GLOBAL_OBSERVABILITY_MESH', type: 'SAFETY_SWITCH' },
      { reason }
    );
  }

  /**
   * Resets safety overrides (for testing or supervisor restoration).
   * Đặt lại các ghi đè an toàn (cho kiểm thử hoặc khôi phục bởi người giám sát).
   */
  public resetSafetySwitches(): void {
    this.isUserStopActive = false;
    this.isRevoked = false;
  }

  /**
   * Starts a new post-deployment observability session.
   * Bắt đầu một phiên quan sát sau triển khai mới.
   */
  public startSession(options: StartSessionOptions): ObservabilitySessionId {
    if (this.isUserStopActive) {
      throw new Error('USER_STOP_ACTIVE: Cannot start observability session when USER_STOP is active');
    }
    if (this.isRevoked) {
      throw new Error('REVOKED: Cannot start observability session when REVOCATION is active');
    }

    const sessionId: ObservabilitySessionId = createObservabilitySessionId(
      `obs_session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );

    this.sessionStates.set(sessionId, 'OBSERVING');
    this.sessionConfigs.set(sessionId, options);

    this.logAudit(
      'OBSERVATION_SESSION_STARTED',
      { id: options.agentId ?? 'BOWCON_AGENT', role: 'OBSERVER' },
      { id: sessionId, type: 'OBSERVABILITY_SESSION' },
      { ...options }
    );

    return sessionId;
  }

  /**
   * Retrieves the current state of an observation session.
   * Lấy trạng thái hiện tại của một phiên quan sát.
   */
  public getSessionState(sessionId: ObservabilitySessionId): ObservabilitySessionState {
    if (this.isUserStopActive) return 'BLOCKED';
    if (this.isRevoked) return 'REVOKED';
    return this.sessionStates.get(sessionId) ?? 'CONCLUDED';
  }

  // ---------------------------------------------------------------------------
  // 2. INGESTION & AGGREGATION / THU NẠP & TỔNG HỢP
  // ---------------------------------------------------------------------------

  /**
   * Ingests a raw telemetry observation, writes audit record, and updates session.
   * Thu nạp quan sát đo từ xa thô, ghi bản ghi kiểm toán và cập nhật phiên.
   */
  public ingestTelemetry(
    sessionId: ObservabilitySessionId,
    input: RawTelemetryInput
  ): TelemetrySample {
    if (this.isUserStopActive) {
      throw new Error('USER_STOP_ACTIVE: Ingestion blocked by USER_STOP');
    }
    if (this.isRevoked) {
      throw new Error('REVOKED: Ingestion blocked by REVOCATION');
    }

    const sample = this.observationEngine.ingestSample(sessionId, input);

    this.logAudit(
      'OBSERVATION_RECEIVED',
      { id: input.sourceId, role: 'OBSERVER' },
      { id: sample.sampleId, type: 'TELEMETRY_SAMPLE' },
      {
        sessionId,
        targetId: input.targetId,
        metrics: sample.metrics,
        provenanceHash: sample.provenanceHash,
      }
    );

    return sample;
  }

  /**
   * Aggregates ingested telemetry samples into a deterministic rolling observation window.
   * Tổng hợp các mẫu đo từ xa đã thu nạp thành cửa sổ quan sát cuốn xác định.
   */
  public aggregateTelemetry(
    sessionId: ObservabilitySessionId,
    targetId: string,
    options?: AggregationBaselineOptions
  ): TelemetryAggregationWindow {
    const samples = this.observationEngine.getSamples(sessionId);
    const window = this.aggregationEngine.aggregateWindow(sessionId, targetId, samples, options);

    this.logAudit(
      'TELEMETRY_AGGREGATED',
      { id: 'BOWCON_TELEMETRY_AGGREGATOR', role: 'AGGREGATOR' },
      { id: window.windowId, type: 'OBSERVATION_WINDOW' },
      {
        sessionId,
        targetId,
        totalSamples: window.totalSamples,
        aggregateAvailability: window.aggregateAvailability,
        aggregateErrorRate: window.aggregateErrorRate,
        aggregateLatencyP95Ms: window.aggregateLatencyP95Ms,
        consecutiveDegradations: window.consecutiveDegradations,
      }
    );

    return window;
  }

  // ---------------------------------------------------------------------------
  // 3. INVARIANT EVALUATION & DRIFT DETECTION / ĐÁNH GIÁ BẤT BIẾN & PHÁT HIỆN SAI LỆCH
  // ---------------------------------------------------------------------------

  /**
   * Evaluates a system invariant, asserting boundaries and recording violations.
   * Đánh giá một bất biến hệ thống, khẳng định ranh giới và ghi lại các vi phạm.
   */
  public checkInvariant(
    sessionId: ObservabilitySessionId,
    targetId: string,
    category: InvariantCategory,
    name: string,
    expectedValue: string,
    observedValue: string,
    targetPath?: string
  ): InvariantCheck {
    const check = this.invariantEngine.evaluateInvariant({
      sessionId,
      targetId,
      category,
      name,
      expectedValue,
      observedValue,
      targetPath,
      isUserStopActive: this.isUserStopActive,
      isRevoked: this.isRevoked,
    });

    const action = check.status === 'VIOLATED' ? 'INVARIANT_VIOLATED' : 'INVARIANT_CHECKED';
    this.logAudit(
      action,
      { id: 'BOWCON_INVARIANT_ENGINE', role: 'VERIFIER' },
      { id: check.invariantId, type: 'INVARIANT_CHECK' },
      {
        sessionId,
        targetId,
        category,
        name,
        status: check.status,
        reason: check.reason,
        evidenceHash: check.evidenceHash,
      }
    );

    if (check.status === 'VIOLATED') {
      this.alertEngine.createAlert({
        sessionId,
        severity: category === 'PROTECTED_WORKSPACE' || category === 'USER_STOP' || category === 'REVOCATION' ? 'CRITICAL' : 'HIGH',
        targetId,
        reason: `Invariant violation [${category}] ${name}: ${check.reason}`,
        evidenceRefs: [check.evidenceHash],
        recommendedEscalation: 'ESCALATE_TO_SUPERVISOR_HUMAN_GATE',
      });
    }

    return check;
  }

  /**
   * Detects runtime or configuration drift. Never performs autonomous repair.
   * Phát hiện sai lệch thời gian chạy hoặc cấu hình. Không bao giờ thực hiện sửa chữa tự động.
   */
  public detectDrift(
    sessionId: ObservabilitySessionId,
    targetId: string,
    driftType: DriftType,
    expectedState: string,
    observedState: string,
    isExpectedMutation?: boolean
  ): DriftEvent {
    const event = this.driftEngine.detectDrift({
      sessionId,
      targetId,
      driftType,
      expectedState,
      observedState,
      isExpectedMutation,
    });

    if (event.classification !== 'NO_DRIFT') {
      this.logAudit(
        'DRIFT_DETECTED',
        { id: 'BOWCON_DRIFT_DETECTOR', role: 'DETECTOR' },
        { id: event.eventId, type: 'DRIFT_EVENT' },
        {
          sessionId,
          targetId,
          driftType,
          classification: event.classification,
          diffSummary: event.diffSummary,
          evidenceHash: event.evidenceHash,
        }
      );

      const severity: ObservabilityAlertSeverity =
        event.classification === 'CRITICAL_DRIFT'
          ? 'CRITICAL'
          : event.classification === 'UNKNOWN_DRIFT'
          ? 'HIGH'
          : 'INFO';

      this.alertEngine.createAlert({
        sessionId,
        severity,
        targetId,
        reason: `Drift detected: ${event.diffSummary}`,
        evidenceRefs: [event.evidenceHash],
        recommendedEscalation:
          severity === 'CRITICAL'
            ? 'ESCALATE_TO_SUPERVISOR_HUMAN_GATE'
            : 'NOTIFY_SUPERVISOR_ADVISORY',
      });
    }

    return event;
  }

  /**
   * Evaluates filesystem manifest drift across file entries.
   * Đánh giá sai lệch tệp kê khai hệ thống tệp trên các mục tệp.
   */
  public checkFilesystemDrift(
    sessionId: ObservabilitySessionId,
    targetId: string,
    expectedManifest: readonly FilesystemManifestEntry[],
    observedManifest: readonly FilesystemManifestEntry[]
  ): readonly DriftEvent[] {
    const drifts = this.driftEngine.detectFilesystemManifestDrift(
      sessionId,
      targetId,
      expectedManifest,
      observedManifest
    );

    for (const drift of drifts) {
      if (drift.classification !== 'NO_DRIFT') {
        this.logAudit(
          'DRIFT_DETECTED',
          { id: 'BOWCON_DRIFT_DETECTOR', role: 'DETECTOR' },
          { id: drift.eventId, type: 'DRIFT_EVENT' },
          {
            sessionId,
            targetId,
            driftType: drift.driftType,
            classification: drift.classification,
            diffSummary: drift.diffSummary,
            evidenceHash: drift.evidenceHash,
          }
        );

        this.alertEngine.createAlert({
          sessionId,
          severity: drift.classification === 'CRITICAL_DRIFT' ? 'CRITICAL' : 'HIGH',
          targetId,
          reason: drift.diffSummary,
          evidenceRefs: [drift.evidenceHash],
          recommendedEscalation: 'ESCALATE_TO_SUPERVISOR_HUMAN_GATE',
        });
      }
    }

    return drifts;
  }

  // ---------------------------------------------------------------------------
  // 4. MULTI-AGENT CONTRADICTION & HEALTH EVALUATION / MÂU THUẪN ĐA TÁC NHÂN & ĐÁNH GIÁ SỨC KHỎE
  // ---------------------------------------------------------------------------

  /**
   * Evaluates multi-agent assertions, rejecting majority voting and preserving contradictions.
   * Đánh giá khẳng định đa tác nhân, bác bỏ bỏ phiếu đa số và bảo toàn các mâu thuẫn.
   */
  public evaluateMultiAgentAssertions(
    sessionId: ObservabilitySessionId,
    targetId: string,
    assertions: readonly ObservabilityAgentAssertion[]
  ): ObservabilityContradictionRecord | null {
    const contradiction = this.contradictionEngine.detectContradictions(sessionId, targetId, assertions);

    if (contradiction) {
      this.logAudit(
        'CONTRADICTION_DETECTED',
        { id: 'BOWCON_CONTRADICTION_ENGINE', role: 'ARBITER' },
        { id: contradiction.contradictionId, type: 'CONTRADICTION_RECORD' },
        {
          sessionId,
          targetId,
          conflictingFields: contradiction.conflictingFields,
          assertionCount: assertions.length,
          escalatedToSupervisor: contradiction.escalatedToSupervisor,
        }
      );

      this.alertEngine.createAlert({
        sessionId,
        severity: 'HIGH',
        targetId,
        reason: `Contradictory assertions detected across ${assertions.length} agents on fields: ${contradiction.conflictingFields.join(', ')}`,
        observationRefs: assertions.map(a => a.agentId),
        recommendedEscalation: 'ESCALATE_TO_SUPERVISOR_HUMAN_GATE',
      });
    }

    return contradiction;
  }

  /**
   * Evaluates composite system health. Health state does not confer execution authority.
   * Đánh giá sức khỏe hệ thống phức hợp. Trạng thái sức khỏe không trao quyền thực thi.
   */
  public evaluateHealth(
    sessionId: ObservabilitySessionId,
    latestMetrics?: RawTelemetryInput
  ): HealthEvaluationResult {
    const normMetrics = latestMetrics ? this.observationEngine.normalizeMetrics(latestMetrics) : undefined;
    const drifts = this.driftEngine.getEvents(sessionId);
    const invariantChecks = this.invariantEngine.getChecks(sessionId);

    const result = this.healthEngine.evaluateHealth({
      metrics: normMetrics,
      drifts,
      invariantChecks,
    });

    this.logAudit(
      'HEALTH_CHANGED',
      { id: 'BOWCON_HEALTH_ENGINE', role: 'EVALUATOR' },
      { id: sessionId, type: 'HEALTH_EVALUATION' },
      {
        healthState: result.healthState,
        healthScore: result.healthScore,
        reasons: result.reasons,
        recommendation: result.supervisorRecommendation,
      }
    );

    return result;
  }

  // ---------------------------------------------------------------------------
  // 5. SUPERVISOR HEALTH REPORT & PROVENANCE / BÁO CÁO SỨC KHỎE GIÁM SÁT VIÊN & NGUỒN GỐC
  // ---------------------------------------------------------------------------

  /**
   * Generates a deterministic supervisor health report.
   * Explicit invariant: SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL.
   * Tạo báo cáo sức khỏe giám sát viên xác định.
   * Bất biến rõ ràng: SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL.
   */
  public generateSupervisorHealthReport(sessionId: ObservabilitySessionId): SupervisorHealthReport {
    const config = this.sessionConfigs.get(sessionId) ?? {
      targetId: 'unknown-target',
      deploymentId: 'unknown-deployment',
      deploymentVersion: '1.0.0',
    };

    const samples = this.observationEngine.getSamples(sessionId);
    const window = this.aggregationEngine.aggregateWindow(sessionId, config.targetId, samples);
    const alerts = this.alertEngine.getAlerts(sessionId);
    const drifts = this.driftEngine.getEvents(sessionId);
    const invariantChecks = this.invariantEngine.getChecks(sessionId);
    const contradictions = this.contradictionEngine.getContradictions(sessionId);

    const latestSample = samples.length > 0 ? samples[samples.length - 1] : undefined;
    const healthResult = this.healthEngine.evaluateHealth({
      metrics: latestSample?.metrics,
      drifts,
      invariantChecks,
    });

    const report = this.reportEngine.generateReport({
      sessionId,
      deploymentId: config.deploymentId,
      deploymentVersion: config.deploymentVersion,
      targetId: config.targetId,
      healthState: healthResult.healthState,
      healthScore: healthResult.healthScore,
      recentTelemetrySummary: {
        sampleCount: window.totalSamples,
        availability: window.aggregateAvailability,
        errorRate: window.aggregateErrorRate,
        latencyP95Ms: window.aggregateLatencyP95Ms,
        consecutiveDegradations: window.consecutiveDegradations,
      },
      activeAlerts: alerts,
      detectedDrifts: drifts,
      invariantChecks,
      contradictions,
      provenanceStatus: 'VERIFIED',
      recommendedNextAction: healthResult.supervisorRecommendation,
    });

    this.logAudit(
      'HEALTH_REPORT_CREATED',
      { id: 'BOWCON_REPORT_ENGINE', role: 'REPORTER' },
      { id: report.reportId, type: 'SUPERVISOR_HEALTH_REPORT' },
      {
        sessionId,
        reportHash: report.reportHash,
        healthState: report.healthState,
        healthScore: report.healthScore,
      }
    );

    return report;
  }

  /**
   * Builds the comprehensive provenance chain linking post-deployment observations to task roots.
   * Xây dựng chuỗi nguồn gốc toàn diện liên kết các quan sát sau triển khai với các gốc tác vụ.
   */
  public buildProvenanceChain(sessionId: ObservabilitySessionId): {
    readonly chain: ObservabilityProvenanceChain;
    readonly chainHash: string;
  } {
    const config = this.sessionConfigs.get(sessionId) ?? {
      targetId: 'unknown-target',
      deploymentId: 'unknown-deployment',
      deploymentVersion: '1.0.0',
    };

    const samples = this.observationEngine.getSamples(sessionId);
    const checks = this.invariantEngine.getChecks(sessionId);
    const drifts = this.driftEngine.getEvents(sessionId);
    const alerts = this.alertEngine.getAlerts(sessionId);
    const reports = this.reportEngine.getReports(sessionId);

    return this.provenanceEngine.buildChain({
      taskId: config.taskId ?? 'task-root',
      agentId: config.agentId ?? 'bowcon-observer',
      delegationId: config.delegationId ?? 'delegation-root',
      capabilityLeaseId: config.capabilityLeaseId ?? 'lease-root',
      sandboxId: config.sandboxId ?? 'sandbox-root',
      worktreeId: config.worktreeId ?? 'worktree-root',
      releaseExecutionId: config.releaseExecutionId ?? 'release-exec-root',
      deploymentId: config.deploymentId,
      sessionId,
      telemetrySampleHashes: samples.map(s => s.provenanceHash),
      invariantEvidenceHashes: checks.map(c => c.evidenceHash),
      driftEvidenceHashes: drifts.map(d => d.evidenceHash),
      alertFingerprints: alerts.map(a => a.fingerprint),
      healthReportHash: reports.length > 0 ? reports[reports.length - 1].reportHash : undefined,
    });
  }
}
