// src/core/observability/observabilityHealthEngine.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Observability health classification engine separating observations, interpretation, and recommendations.
// Động cơ phân loại sức khỏe quan sát tách biệt các quan sát, giải thích và khuyến nghị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - HEALTH != AUTHORITY (CRITICAL state never authorizes autonomous mutations).
// - OBSERVATION != INTERPRETATION != RECOMMENDATION != EXECUTION
// - DETERMINISTIC HEALTH SCORING (0 to 100).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export class ObservabilityHealthEngine {
    /**
     * Evaluates aggregate health from normalized metrics, drift events, and invariant checks.
     * Đánh giá sức khỏe tổng hợp từ các chỉ số đã chuẩn hóa, các sự kiện sai lệch và các kiểm tra bất biến.
     */
    evaluateHealth(input) {
        // 1. Check if observation is unavailable
        // 1. Kiểm tra xem việc quan sát có bị mất tín hiệu hay không
        if (input.isUnavailable) {
            return {
                healthState: 'OBSERVATION_UNAVAILABLE',
                healthScore: 0,
                reasons: ['Telemetry observation feed is currently offline or unreachable'],
                supervisorRecommendation: 'Verify telemetry collection probes and target connectivity. Await supervisor guidance.',
            };
        }
        if (!input.metrics && (!input.drifts || input.drifts.length === 0) && (!input.invariantChecks || input.invariantChecks.length === 0)) {
            return {
                healthState: 'UNKNOWN',
                healthScore: 50,
                reasons: ['Insufficient observation data to establish conclusive health state'],
                supervisorRecommendation: 'Await additional telemetry samples before taking operational action.',
            };
        }
        const reasons = [];
        let score = 100;
        // 2. Evaluate Invariant Violations
        // 2. Đánh giá vi phạm bất biến
        let hasCriticalInvariantViolation = false;
        if (input.invariantChecks && input.invariantChecks.length > 0) {
            for (const check of input.invariantChecks) {
                if (check.status === 'VIOLATED') {
                    score -= 25;
                    reasons.push(`Invariant violated: [${check.category}] ${check.name} (${check.reason ?? 'value mismatch'})`);
                    if (check.category === 'USER_STOP' ||
                        check.category === 'REVOCATION' ||
                        check.category === 'PROTECTED_WORKSPACE' ||
                        check.category === 'AUTHORIZATION') {
                        hasCriticalInvariantViolation = true;
                    }
                }
            }
        }
        // 3. Evaluate Drift Events
        // 3. Đánh giá các sự kiện sai lệch
        let hasCriticalDrift = false;
        let hasUnknownDrift = false;
        if (input.drifts && input.drifts.length > 0) {
            for (const drift of input.drifts) {
                if (drift.classification === 'CRITICAL_DRIFT') {
                    score -= 30;
                    hasCriticalDrift = true;
                    reasons.push(`Critical drift detected: ${drift.driftType} (${drift.diffSummary})`);
                }
                else if (drift.classification === 'UNKNOWN_DRIFT') {
                    score -= 15;
                    hasUnknownDrift = true;
                    reasons.push(`Unknown drift detected: ${drift.driftType} (${drift.diffSummary})`);
                }
                else if (drift.classification === 'EXPECTED_DRIFT') {
                    score -= 5;
                    reasons.push(`Expected drift noted: ${drift.driftType}`);
                }
            }
        }
        // 4. Evaluate Telemetry Metrics
        // 4. Đánh giá các chỉ số đo từ xa
        if (input.metrics) {
            const m = input.metrics;
            if (m.availability < 0.95) {
                score -= 30;
                reasons.push(`Availability below 95%: ${(m.availability * 100).toFixed(1)}%`);
            }
            else if (m.availability < 0.99) {
                score -= 15;
                reasons.push(`Availability below 99%: ${(m.availability * 100).toFixed(1)}%`);
            }
            if (m.errorRate > 0.10) {
                score -= 35;
                reasons.push(`Severe error rate above 10%: ${(m.errorRate * 100).toFixed(1)}%`);
            }
            else if (m.errorRate > 0.02) {
                score -= 15;
                reasons.push(`Elevated error rate above 2%: ${(m.errorRate * 100).toFixed(1)}%`);
            }
            if (m.latencyP95Ms > 1000) {
                score -= 20;
                reasons.push(`High latency P95: ${m.latencyP95Ms}ms`);
            }
            else if (m.latencyP95Ms > 400) {
                score -= 10;
                reasons.push(`Elevated latency P95: ${m.latencyP95Ms}ms`);
            }
            if (m.healthProbesPassing < m.totalHealthProbes) {
                score -= 20;
                reasons.push(`Failing health probes: ${m.totalHealthProbes - m.healthProbesPassing} / ${m.totalHealthProbes}`);
            }
        }
        const healthScore = Math.max(0, Math.min(100, score));
        // 5. Determine Health State Classification
        // 5. Xác định phân loại trạng thái sức khỏe
        let healthState = 'HEALTHY';
        let supervisorRecommendation = 'System operating within acceptable operational parameters. Continue monitoring.';
        if (hasCriticalInvariantViolation || hasCriticalDrift || healthScore < 40) {
            healthState = 'CRITICAL';
            supervisorRecommendation =
                'CRITICAL advisory: Severe degradation, critical drift, or security boundary violation. Escalate immediately to supervisor for human decision.';
        }
        else if (hasUnknownDrift || healthScore < 70) {
            healthState = 'UNSTABLE';
            supervisorRecommendation =
                'UNSTABLE advisory: Unresolved drift or persistent metric instability detected. Recommend supervisor inspection.';
        }
        else if (healthScore < 85) {
            healthState = 'DEGRADED';
            supervisorRecommendation =
                'DEGRADED advisory: Minor performance degradation detected. Maintain active observation mesh.';
        }
        return {
            healthState,
            healthScore,
            reasons,
            supervisorRecommendation,
        };
    }
}
