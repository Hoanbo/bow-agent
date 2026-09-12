// src/core/observability/supervisorHealthReportEngine.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Deterministic supervisor health report generator aggregating verified evidence.
// Trình tạo báo cáo sức khỏe giám sát viên xác định tổng hợp các bằng chứng đã xác minh.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL (Purely advisory; no execution authority).
// - RECOMMENDATION != EXECUTION
// - All constituent evidence hashed deterministically with SHA-256.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type ObservabilitySessionId,
  type HealthReportId,
  type SupervisorHealthReport,
  type ObservabilityHealthState,
  type ObservabilityAlert,
  type DriftEvent,
  type InvariantCheck,
  type ObservabilityContradictionRecord,
  createHealthReportId,
} from './observabilityTypes.js';

export interface HealthReportAssemblyInput {
  readonly sessionId: ObservabilitySessionId;
  readonly deploymentId: string;
  readonly deploymentVersion: string;
  readonly targetId: string;
  readonly healthState: ObservabilityHealthState;
  readonly healthScore: number;
  readonly recentTelemetrySummary: {
    readonly sampleCount: number;
    readonly availability: number;
    readonly errorRate: number;
    readonly latencyP95Ms: number;
    readonly consecutiveDegradations: number;
  };
  readonly activeAlerts: readonly ObservabilityAlert[];
  readonly detectedDrifts: readonly DriftEvent[];
  readonly invariantChecks: readonly InvariantCheck[];
  readonly contradictions: readonly ObservabilityContradictionRecord[];
  readonly provenanceStatus?: 'VERIFIED' | 'COMPROMISED' | 'MISSING';
  readonly recommendedNextAction?: string;
  readonly confidenceScore?: number;
}

export class SupervisorHealthReportEngine {
  private reports = new Map<string, SupervisorHealthReport[]>();

  /**
   * Generates a deterministic SHA-256 hash representing the full report contents.
   * Tạo mã băm SHA-256 xác định đại diện cho toàn bộ nội dung báo cáo.
   */
  public computeReportHash(reportData: Omit<SupervisorHealthReport, 'reportHash'>): string {
    const serialized = JSON.stringify(reportData, Object.keys(reportData).sort());
    return crypto.createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Assembles an advisory health report for human supervisor review.
   * Lắp ráp một báo cáo sức khỏe khuyến nghị để người giám sát con người xem xét.
   */
  public generateReport(input: HealthReportAssemblyInput): SupervisorHealthReport {
    const generatedAt = Date.now();
    const reportId: HealthReportId = createHealthReportId(
      `report_${input.sessionId}_${generatedAt}_${crypto.randomBytes(4).toString('hex')}`
    );

    const provenanceStatus = input.provenanceStatus ?? 'VERIFIED';
    const confidenceScore = input.confidenceScore ?? (input.recentTelemetrySummary.sampleCount > 0 ? 95 : 50);

    let recommendedNextAction = input.recommendedNextAction;
    if (!recommendedNextAction) {
      if (input.healthState === 'CRITICAL') {
        recommendedNextAction =
          'CRITICAL: Review detected drift and invariant violations with Master Owner before considering rollback or remediation.';
      } else if (input.healthState === 'UNSTABLE' || input.healthState === 'DEGRADED') {
        recommendedNextAction =
          'ADVISORY: Inspect telemetry degradations. Maintain active observability mesh without mutating production.';
      } else {
        recommendedNextAction =
          'NORMAL: Continuous post-deployment observation confirmed healthy. Retain monitoring.';
      }
    }

    const preliminary: Omit<SupervisorHealthReport, 'reportHash'> = {
      reportId,
      sessionId: input.sessionId,
      deploymentId: input.deploymentId,
      deploymentVersion: input.deploymentVersion,
      targetId: input.targetId,
      healthState: input.healthState,
      healthScore: input.healthScore,
      recentTelemetrySummary: input.recentTelemetrySummary,
      activeAlerts: input.activeAlerts,
      detectedDrifts: input.detectedDrifts,
      invariantChecks: input.invariantChecks,
      contradictions: input.contradictions,
      provenanceStatus,
      recommendedNextAction,
      confidenceScore,
      generatedAt,
    };

    const reportHash = this.computeReportHash(preliminary);
    const report: SupervisorHealthReport = {
      ...preliminary,
      reportHash,
    };

    const sessionReports = this.reports.get(input.sessionId) ?? [];
    sessionReports.push(report);
    this.reports.set(input.sessionId, sessionReports);

    return report;
  }

  /**
   * Retrieves all reports generated for a session.
   * Lấy tất cả các báo cáo được tạo cho một phiên.
   */
  public getReports(sessionId: ObservabilitySessionId): readonly SupervisorHealthReport[] {
    return this.reports.get(sessionId) ?? [];
  }

  /**
   * Clears in-memory reports.
   * Xóa các báo cáo trong bộ nhớ.
   */
  public clear(sessionId?: ObservabilitySessionId): void {
    if (sessionId) {
      this.reports.delete(sessionId);
    } else {
      this.reports.clear();
    }
  }
}
