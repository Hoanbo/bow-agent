// src/core/observability/observabilityAlertEngine.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Observability alert engine dispatching deterministic advisory notifications.
// Động cơ cảnh báo quan sát gửi các thông báo khuyến nghị mang tính xác định.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - ALERT != OWNER_APPROVAL (Alerts never authorize autonomous actions).
// - RECOMMENDATION != EXECUTION
// - DETERMINISTIC ALERT FINGERPRINTING.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type ObservabilitySessionId,
  type ObservabilityAlertId,
  type ObservabilityAlert,
  type ObservabilityAlertSeverity,
  createObservabilityAlertId,
} from './observabilityTypes.js';

export interface AlertTriggerInput {
  readonly sessionId: ObservabilitySessionId;
  readonly severity: ObservabilityAlertSeverity;
  readonly targetId: string;
  readonly reason: string;
  readonly observationRefs?: readonly string[];
  readonly evidenceRefs?: readonly string[];
  readonly provenance?: string;
  readonly recommendedEscalation?: string;
}

export class ObservabilityAlertEngine {
  private alerts = new Map<string, ObservabilityAlert[]>();

  /**
   * Generates a deterministic SHA-256 fingerprint for deduplicating identical alerts.
   * Tạo mã dấu vân tay SHA-256 xác định để khử trùng lặp các cảnh báo giống hệt nhau.
   */
  public computeAlertFingerprint(
    targetId: string,
    severity: ObservabilityAlertSeverity,
    reason: string
  ): string {
    const raw = `${targetId}:${severity}:${reason}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Creates and stores an advisory alert.
   * Tạo và lưu trữ một cảnh báo khuyến nghị.
   */
  public createAlert(input: AlertTriggerInput): ObservabilityAlert {
    const timestamp = Date.now();
    const fingerprint = this.computeAlertFingerprint(input.targetId, input.severity, input.reason);
    const alertId: ObservabilityAlertId = createObservabilityAlertId(
      `alert_${input.severity.toLowerCase()}_${timestamp}_${crypto.randomBytes(4).toString('hex')}`
    );

    const alert: ObservabilityAlert = {
      alertId,
      sessionId: input.sessionId,
      severity: input.severity,
      targetId: input.targetId,
      reason: input.reason,
      observationRefs: input.observationRefs ?? [],
      evidenceRefs: input.evidenceRefs ?? [],
      timestamp,
      fingerprint,
      provenance: input.provenance ?? 'OBSERVABILITY_MESH',
      recommendedEscalation:
        input.recommendedEscalation ??
        (input.severity === 'CRITICAL'
          ? 'ESCALATE_TO_SUPERVISOR_HUMAN_GATE'
          : 'LOG_ADVISORY_TELEMETRY'),
    };

    const sessionAlerts = this.alerts.get(input.sessionId) ?? [];
    sessionAlerts.push(alert);
    this.alerts.set(input.sessionId, sessionAlerts);

    return alert;
  }

  /**
   * Retrieves all alerts recorded for a session.
   * Lấy tất cả các cảnh báo được ghi nhận cho một phiên.
   */
  public getAlerts(sessionId: ObservabilitySessionId): readonly ObservabilityAlert[] {
    return this.alerts.get(sessionId) ?? [];
  }

  /**
   * Clears in-memory alerts.
   * Xóa các cảnh báo trong bộ nhớ.
   */
  public clear(sessionId?: ObservabilitySessionId): void {
    if (sessionId) {
      this.alerts.delete(sessionId);
    } else {
      this.alerts.clear();
    }
  }
}
