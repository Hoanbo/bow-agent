// src/core/diagnosis/evidenceCorrelationEngine.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Deterministic Evidence Correlation Engine.
// Correlates telemetry observations, invariant violations, drift events, and advisory alerts
// across sliding temporal windows and topological targets without mutating state or recalculating raw metrics.
// Động cơ tương quan bằng chứng xác định.
// Tương quan các quan sát đo từ xa, vi phạm bất biến, sự kiện sai lệch và cảnh báo khuyến nghị
// qua các cửa sổ thời gian cuốn và đích cấu trúc mà không làm đột biến trạng thái hay tính toán lại các chỉ số thô.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - PURELY OBSERVATIONAL: Zero mutation, zero autonomous execution.
// - DETERMINISTIC CORRELATION: Identical inputs within window delta produce identical cluster hashes.
// - REUSE EXISTING METRICS: Do NOT re-evaluate invariants or recompute aggregations.
// - SANITIZED HASHING: All evidence hashes MUST be computed over sanitized payloads.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { createEvidenceClusterId, } from './diagnosisTypes.js';
import { globalDiagnosisSanitizer } from './diagnosisSanitizer.js';
export class EvidenceCorrelationEngine {
    static DEFAULT_WINDOW_DURATION_MS = 60_000; // 1 minute window
    /**
     * Correlates all observational signals within a temporal window for a designated target.
     * Tương quan tất cả các tín hiệu quan sát trong cửa sổ thời gian cho một đích được chỉ định.
     */
    correlate(input) {
        const windowDuration = input.windowDurationMs ?? EvidenceCorrelationEngine.DEFAULT_WINDOW_DURATION_MS;
        const refTime = input.referenceTime ?? Date.now();
        const windowStart = refTime - windowDuration;
        const windowEnd = refTime;
        const evidenceItems = [];
        // 1. Process Invariant Checks (Violations within window)
        // 1. Xử lý kiểm tra bất biến (Vi phạm trong cửa sổ)
        if (input.invariantChecks) {
            for (const check of input.invariantChecks) {
                if (check.targetId === input.targetId &&
                    check.evaluatedAt >= windowStart &&
                    check.evaluatedAt <= windowEnd &&
                    check.status === 'VIOLATED') {
                    const isCriticalCategory = check.category === 'PROTECTED_WORKSPACE' ||
                        check.category === 'USER_STOP' ||
                        check.category === 'REVOCATION' ||
                        check.category === 'BOUNDARY';
                    const weight = isCriticalCategory ? 1.0 : 0.8;
                    evidenceItems.push({
                        evidenceId: check.invariantId,
                        source: 'INVARIANT',
                        category: check.category,
                        timestamp: check.evaluatedAt,
                        severity: isCriticalCategory ? 'CRITICAL' : 'HIGH',
                        description: `Invariant [${check.category}] "${check.name}" violated: ${check.reason ?? 'value mismatch'}`,
                        evidenceHash: check.evidenceHash,
                        weight,
                    });
                }
            }
        }
        // 2. Process Drift Events (Drift detected within window)
        // 2. Xử lý sự kiện sai lệch (Sai lệch được phát hiện trong cửa sổ)
        if (input.driftEvents) {
            for (const drift of input.driftEvents) {
                if (drift.targetId === input.targetId &&
                    drift.detectedAt >= windowStart &&
                    drift.detectedAt <= windowEnd &&
                    drift.classification !== 'NO_DRIFT') {
                    const isCritical = drift.classification === 'CRITICAL_DRIFT' ||
                        drift.driftType === 'UNAUTHORIZED_MUTATION';
                    const weight = isCritical ? 0.7 : 0.2;
                    evidenceItems.push({
                        evidenceId: drift.eventId,
                        source: 'DRIFT',
                        category: drift.driftType,
                        timestamp: drift.detectedAt,
                        severity: isCritical ? 'CRITICAL' : 'WARNING',
                        description: `Drift [${drift.driftType}] detected (${drift.classification}): ${drift.diffSummary}`,
                        evidenceHash: drift.evidenceHash,
                        weight,
                    });
                }
            }
        }
        // 3. Process Observability Alerts
        // 3. Xử lý cảnh báo quan sát
        if (input.alerts) {
            for (const alert of input.alerts) {
                if (alert.targetId === input.targetId &&
                    alert.timestamp >= windowStart &&
                    alert.timestamp <= windowEnd) {
                    const weight = alert.severity === 'CRITICAL' ? 1.0 : alert.severity === 'HIGH' ? 0.5 : 0.2;
                    evidenceItems.push({
                        evidenceId: alert.alertId,
                        source: 'ALERT',
                        category: 'ALERT',
                        timestamp: alert.timestamp,
                        severity: alert.severity,
                        description: `Alert [${alert.severity}]: ${alert.reason}`,
                        evidenceHash: alert.fingerprint,
                        weight,
                    });
                }
            }
        }
        // 4. Process Telemetry Window Degradations
        // 4. Xử lý sự suy thoái trong cửa sổ đo từ xa
        if (input.telemetryWindow && input.telemetryWindow.targetId === input.targetId) {
            const tw = input.telemetryWindow;
            if (tw.consecutiveDegradations > 0 || (tw.baselineComparison && tw.baselineComparison.isDegradedAgainstBaseline)) {
                evidenceItems.push({
                    evidenceId: `telemetry_${tw.windowId}`,
                    source: 'TELEMETRY',
                    category: 'PERFORMANCE_DEGRADATION',
                    timestamp: tw.endTime,
                    severity: tw.consecutiveDegradations >= 3 ? 'HIGH' : 'WARNING',
                    description: `Telemetry degradation observed: error rate ${(tw.aggregateErrorRate * 100).toFixed(2)}%, p95 latency ${tw.aggregateLatencyP95Ms.toFixed(0)}ms, consecutive degradations: ${tw.consecutiveDegradations}`,
                    evidenceHash: crypto.createHash('sha256').update(tw.windowId).digest('hex'),
                    weight: tw.consecutiveDegradations >= 3 ? 0.6 : 0.3,
                });
            }
        }
        // Sort evidence deterministically by timestamp ascending, then evidenceId
        evidenceItems.sort((a, b) => {
            if (a.timestamp !== b.timestamp)
                return a.timestamp - b.timestamp;
            return a.evidenceId.localeCompare(b.evidenceId);
        });
        const totalWeight = evidenceItems.reduce((sum, item) => sum + item.weight, 0);
        // Compute deterministic clusterHash over sorted, sanitized payload
        const clusterPayload = globalDiagnosisSanitizer.sanitize({
            sessionId: input.sessionId,
            targetId: input.targetId,
            windowStart,
            windowEnd,
            evidenceIds: evidenceItems.map((e) => e.evidenceId),
            evidenceHashes: evidenceItems.map((e) => e.evidenceHash),
        });
        const serialized = JSON.stringify(clusterPayload, Object.keys(clusterPayload).sort());
        const clusterHash = crypto.createHash('sha256').update(serialized).digest('hex');
        const clusterId = createEvidenceClusterId(`cluster_${refTime}_${clusterHash.substring(0, 10)}`);
        return {
            clusterId,
            sessionId: input.sessionId,
            targetId: input.targetId,
            windowStart,
            windowEnd,
            items: Object.freeze(evidenceItems),
            totalWeight,
            clusterHash,
        };
    }
}
export const globalEvidenceCorrelationEngine = new EvidenceCorrelationEngine();
