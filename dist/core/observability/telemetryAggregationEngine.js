// src/core/observability/telemetryAggregationEngine.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Telemetry aggregation engine building deterministic rolling windows and detecting degradation trends.
// Động cơ tổng hợp đo từ xa xây dựng các cửa sổ cuốn xác định và phát hiện xu hướng suy giảm.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - Aggregation preserves all constituent samples (no lossy discarding).
// - AGENT_COUNT != AUTHORITY_COUNT: Discrepant sources are preserved.
// - DETERMINISTIC METRIC ROLLING CALCULATIONS.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
export class TelemetryAggregationEngine {
    windows = new Map();
    /**
     * Aggregates a list of telemetry samples into a deterministic observation window.
     * Tổng hợp danh sách các mẫu đo từ xa thành một cửa sổ quan sát xác định.
     */
    aggregateWindow(sessionId, targetId, samples, options) {
        if (samples.length === 0) {
            const now = Date.now();
            return {
                windowId: `window_${now}_${crypto.randomBytes(4).toString('hex')}`,
                sessionId,
                targetId,
                startTime: now,
                endTime: now,
                samples: [],
                aggregateAvailability: 1.0,
                aggregateErrorRate: 0.0,
                aggregateLatencyP95Ms: 0,
                aggregateLatencyP99Ms: 0,
                totalSamples: 0,
                consecutiveDegradations: 0,
            };
        }
        // Sort deterministically by timestamp
        // Sắp xếp xác định theo dấu thời gian
        const sorted = [...samples].sort((a, b) => a.timestamp - b.timestamp);
        const startTime = sorted[0].timestamp;
        const endTime = sorted[sorted.length - 1].timestamp;
        let sumAvailability = 0;
        let sumErrorRate = 0;
        let sumLatencyP95 = 0;
        let sumLatencyP99 = 0;
        let totalSampleCount = 0;
        let consecutiveDegradations = 0;
        let currentDegradationStreak = 0;
        for (const sample of sorted) {
            const m = sample.metrics;
            const weight = m.sampleCount > 0 ? m.sampleCount : 1;
            sumAvailability += m.availability * weight;
            sumErrorRate += m.errorRate * weight;
            sumLatencyP95 += m.latencyP95Ms * weight;
            sumLatencyP99 += m.latencyP99Ms * weight;
            totalSampleCount += weight;
            // Check degradation per sample against baseline or static bounds
            // Kiểm tra sự suy giảm trên mỗi mẫu so với đường cơ sở hoặc ngưỡng tĩnh
            const isSampleDegraded = m.errorRate > 0.05 ||
                m.latencyP95Ms > 500 ||
                m.availability < 0.99 ||
                m.healthProbesPassing < m.totalHealthProbes;
            if (isSampleDegraded) {
                currentDegradationStreak++;
                if (currentDegradationStreak > consecutiveDegradations) {
                    consecutiveDegradations = currentDegradationStreak;
                }
            }
            else {
                currentDegradationStreak = 0;
            }
        }
        const divisor = totalSampleCount > 0 ? totalSampleCount : 1;
        const aggregateAvailability = sumAvailability / divisor;
        const aggregateErrorRate = sumErrorRate / divisor;
        const aggregateLatencyP95Ms = sumLatencyP95 / divisor;
        const aggregateLatencyP99Ms = sumLatencyP99 / divisor;
        let baselineComparison;
        if (options && (options.baselineErrorRate !== undefined || options.baselineLatencyP95Ms !== undefined)) {
            const baseErr = options.baselineErrorRate ?? 0.0;
            const baseLat = options.baselineLatencyP95Ms ?? 0.0;
            const errorRateDelta = aggregateErrorRate - baseErr;
            const latencyDeltaMs = aggregateLatencyP95Ms - baseLat;
            const errThreshold = options.degradationErrorThreshold ?? 0.01;
            const latThreshold = options.degradationLatencyThresholdMs ?? 50;
            const isDegradedAgainstBaseline = errorRateDelta >= errThreshold || latencyDeltaMs >= latThreshold;
            baselineComparison = {
                baselineErrorRate: baseErr,
                baselineLatencyP95Ms: baseLat,
                errorRateDelta,
                latencyDeltaMs,
                isDegradedAgainstBaseline,
            };
        }
        const windowId = `window_${startTime}_${endTime}_${crypto.randomBytes(4).toString('hex')}`;
        const window = {
            windowId,
            sessionId,
            targetId,
            startTime,
            endTime,
            samples: sorted,
            aggregateAvailability,
            aggregateErrorRate,
            aggregateLatencyP95Ms,
            aggregateLatencyP99Ms,
            totalSamples: totalSampleCount,
            consecutiveDegradations,
            baselineComparison,
        };
        const sessionWindows = this.windows.get(sessionId) ?? [];
        sessionWindows.push(window);
        this.windows.set(sessionId, sessionWindows);
        return window;
    }
    /**
     * Retrieves all aggregated windows for a session.
     * Lấy tất cả các cửa sổ đã tổng hợp cho một phiên.
     */
    getWindows(sessionId) {
        return this.windows.get(sessionId) ?? [];
    }
    /**
     * Clears in-memory windows.
     * Xóa các cửa sổ trong bộ nhớ.
     */
    clear(sessionId) {
        if (sessionId) {
            this.windows.delete(sessionId);
        }
        else {
            this.windows.clear();
        }
    }
}
