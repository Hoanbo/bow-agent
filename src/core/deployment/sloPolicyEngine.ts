// src/core/deployment/sloPolicyEngine.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Configurable deterministic SLO degradation policy engine.
// Động cơ chính sách suy giảm SLO xác định có thể cấu hình.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - SLO_HEALTH != AUTHORITY
// - POLICIES ARE EXPLICIT IMMUTABLE DATA.
// - NO SILENT THRESHOLD ALTERATION DURING DEPLOYMENT.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import {
  type SloPolicyConfig,
  type SloEvaluationResult,
  type CanaryObservationWindow,
} from './deploymentTypes.js';

export const DEFAULT_PRODUCTION_SLO: SloPolicyConfig = {
  policyId: 'slo_prod_standard',
  name: 'Standard Production Tier-1 SLO',
  maxErrorRate: 0.01, // 1% error rate cap
  maxLatencyP95Ms: 350, // 350ms p95 latency cap
  maxLatencyP99Ms: 800, // 800ms p99 latency cap
  minAvailability: 0.999, // 99.9% availability floor
  maxConsecutiveDegradations: 2, // Trip breaker after 2 consecutive degraded windows
  maxHealthCheckFailures: 1, // Max 1 failed health probe allowed
  minObservationWindowMs: 30_000, // Minimum 30s observation duration
  minSampleCount: 50, // Minimum 50 requests/samples required
};

export class SloPolicyEngine {
  /**
   * Evaluates a canary observation window against the active SLO policy config.
   * Đánh giá cửa sổ quan sát canary theo cấu hình chính sách SLO đang hoạt động.
   */
  public evaluateWindow(
    window: CanaryObservationWindow,
    policy: SloPolicyConfig = DEFAULT_PRODUCTION_SLO
  ): SloEvaluationResult {
    const violations: string[] = [];
    const duration = window.endTime - window.startTime;

    // 1. Enforce minimum sample count and window duration for statistical validity.
    // 1. Thực thi số mẫu tối thiểu và thời lượng cửa sổ cho tính hợp lệ thống kê.
    if (window.totalSamples < policy.minSampleCount) {
      violations.push(
        `Insufficient sample count: observed ${window.totalSamples} < required ${policy.minSampleCount}.`
      );
    }

    if (duration < policy.minObservationWindowMs) {
      violations.push(
        `Insufficient observation duration: observed ${duration}ms < required ${policy.minObservationWindowMs}ms.`
      );
    }

    // 2. Evaluate error rate.
    // 2. Đánh giá tỷ lệ lỗi.
    if (window.aggregateErrorRate > policy.maxErrorRate) {
      violations.push(
        `Error rate breached: observed ${(window.aggregateErrorRate * 100).toFixed(2)}% > threshold ${(policy.maxErrorRate * 100).toFixed(2)}%.`
      );
    }

    // 3. Evaluate latency.
    // 3. Đánh giá độ trễ.
    if (window.aggregateLatencyP95Ms > policy.maxLatencyP95Ms) {
      violations.push(
        `P95 latency breached: observed ${window.aggregateLatencyP95Ms.toFixed(1)}ms > threshold ${policy.maxLatencyP95Ms}ms.`
      );
    }

    // 4. Evaluate availability.
    // 4. Đánh giá độ khả dụng.
    if (window.aggregateAvailability < policy.minAvailability) {
      violations.push(
        `Availability breached: observed ${(window.aggregateAvailability * 100).toFixed(3)}% < floor ${(policy.minAvailability * 100).toFixed(3)}%.`
      );
    }

    // 5. Evaluate individual observation health failures.
    // 5. Đánh giá các lỗi sức khỏe quan sát riêng lẻ.
    let totalHealthFailures = 0;
    for (const obs of window.observations) {
      totalHealthFailures += obs.healthCheckFailures;
    }
    if (totalHealthFailures > policy.maxHealthCheckFailures) {
      violations.push(
        `Health check failures breached: observed ${totalHealthFailures} > allowed ${policy.maxHealthCheckFailures}.`
      );
    }

    const isPassing = violations.length === 0;
    const consecutiveDegradations = isPassing ? 0 : window.consecutiveDegradationCount + 1;
    const shouldTripCircuitBreaker = consecutiveDegradations >= policy.maxConsecutiveDegradations;

    return {
      isPassing,
      violations,
      consecutiveDegradations,
      shouldTripCircuitBreaker,
      evaluatedAt: Date.now(),
    };
  }
}
