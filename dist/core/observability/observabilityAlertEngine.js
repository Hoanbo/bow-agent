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
import { createObservabilityAlertId, } from './observabilityTypes.js';
export class ObservabilityAlertEngine {
    alerts = new Map();
    /**
     * Generates a deterministic SHA-256 fingerprint for deduplicating identical alerts.
     * Tạo mã dấu vân tay SHA-256 xác định để khử trùng lặp các cảnh báo giống hệt nhau.
     */
    computeAlertFingerprint(targetId, severity, reason) {
        const raw = `${targetId}:${severity}:${reason}`;
        return crypto.createHash('sha256').update(raw).digest('hex');
    }
    /**
     * Creates and stores an advisory alert.
     * Tạo và lưu trữ một cảnh báo khuyến nghị.
     */
    createAlert(input) {
        const timestamp = Date.now();
        const fingerprint = this.computeAlertFingerprint(input.targetId, input.severity, input.reason);
        const alertId = createObservabilityAlertId(`alert_${input.severity.toLowerCase()}_${timestamp}_${crypto.randomBytes(4).toString('hex')}`);
        const alert = {
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
            recommendedEscalation: input.recommendedEscalation ??
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
    getAlerts(sessionId) {
        return this.alerts.get(sessionId) ?? [];
    }
    /**
     * Clears in-memory alerts.
     * Xóa các cảnh báo trong bộ nhớ.
     */
    clear(sessionId) {
        if (sessionId) {
            this.alerts.delete(sessionId);
        }
        else {
            this.alerts.clear();
        }
    }
}
