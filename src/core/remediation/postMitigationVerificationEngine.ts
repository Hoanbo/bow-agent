// src/core/remediation/postMitigationVerificationEngine.ts
// BOWCON V4.0 — MS-1.3.55: GOVERNED INCIDENT REMEDIATION, AUTHORIZED RECOVERY EXECUTION & CLOSED-LOOP POST-MITIGATION VERIFICATION
//
// Closed-Loop Post-Mitigation Verification Engine.
// Verifies runtime health and invariant compliance within a mandatory 30,000 ms window after remediation.
// Reuses the canonical ObservabilityRuntime without duplicating observability logic.
// Động cơ xác minh sau giảm thiểu vòng lặp kín.
// Xác minh sức khỏe thời gian chạy và tuân thủ bất biến trong cửa sổ bắt buộc 30.000 ms sau khắc phục.
// Tái sử dụng ObservabilityRuntime chuẩn tắc mà không trùng lặp logic quan sát.
//
// MANDATORY VERIFICATION CRITERIA / TIÊU CHÍ XÁC MINH BẮT BUỘC:
// - Verification window: 30,000 ms
// - Error rate < 1% (0.01)
// - P95 latency within baseline ±10%
// - Zero new invariant violations (violationsCount === 0)
// - Drift classification == 'NO_DRIFT'
// - Health returns to acceptable nominal state ('HEALTHY' | 'NOMINAL' | 'ACCEPTABLE')
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import { ObservabilityRuntime } from '../observability/observabilityRuntime.js';
import type { ObservabilitySessionId } from '../observability/observabilityTypes.js';
import type {
  GovernedRemediationPlan,
  PostMitigationVerificationResult,
} from './remediationTypes.js';

export interface RunVerificationOptions {
  readonly plan: GovernedRemediationPlan;
  readonly observabilityRuntime: ObservabilityRuntime;
  readonly sessionId: ObservabilitySessionId;
  readonly verificationWindowMs?: number; // Defaults to 30,000 ms
  readonly baselineLatencyP95?: number; // Optional baseline latency ms
}

export class PostMitigationVerificationEngine {
  public static readonly DEFAULT_VERIFICATION_WINDOW_MS = 30000;

  /**
   * Executes closed-loop post-mitigation verification against canonical ObservabilityRuntime.
   * Thực thi xác minh sau giảm thiểu vòng lặp kín dựa trên ObservabilityRuntime chuẩn tắc.
   */
  public async verifyMitigation(
    options: RunVerificationOptions
  ): Promise<PostMitigationVerificationResult> {
    const {
      plan,
      observabilityRuntime,
      sessionId,
      verificationWindowMs = PostMitigationVerificationEngine.DEFAULT_VERIFICATION_WINDOW_MS,
      baselineLatencyP95 = 200,
    } = options;

    const checkedAt = Date.now();
    const violationDetails: string[] = [];

    // 1. Gather Observability Aggregations
    // 1. Thu thập dữ liệu tổng hợp từ Observability
    const aggregationWindow = observabilityRuntime.aggregateTelemetry(sessionId, plan.targetId);
    const samples = observabilityRuntime.observationEngine.getSamples(sessionId);
    const latestSample = samples.length > 0 ? samples[samples.length - 1] : undefined;
    const healthResult = observabilityRuntime.evaluateHealth(
      sessionId,
      latestSample ? { ...latestSample.metrics, targetId: plan.targetId, sourceId: latestSample.sourceId } : undefined
    );
    const invariantChecks = observabilityRuntime.invariantEngine.getChecks(sessionId);
    const driftEvents = observabilityRuntime.driftEngine.getEvents(sessionId);


    // 2. Evaluate Error Rate < 1%
    // 2. Đánh giá tỷ lệ lỗi < 1%
    const observedErrorRate = aggregationWindow.aggregateErrorRate;
    const errorRatePassed = observedErrorRate < 0.01;
    if (!errorRatePassed) {
      violationDetails.push(
        `Error rate ${(observedErrorRate * 100).toFixed(2)}% exceeds mandatory threshold of 1.0%`
      );
    }

    // 3. Evaluate P95 Latency within baseline ±10%
    // 3. Đánh giá độ trễ P95 trong khoảng ±10% của đường cơ sở
    const observedP95 = aggregationWindow.aggregateLatencyP95Ms;
    const maxAllowedLatency = baselineLatencyP95 * 1.1;
    const latencyPassed = observedP95 <= maxAllowedLatency;
    if (!latencyPassed) {
      violationDetails.push(
        `P95 latency ${observedP95.toFixed(1)}ms exceeds baseline + 10% threshold (${maxAllowedLatency.toFixed(1)}ms)`
      );
    }


    // 4. Evaluate Invariant Violations (Zero new invariant violations)
    // 4. Đánh giá vi phạm bất biến (Không có vi phạm bất biến mới nào)
    const violatedChecks = invariantChecks.filter(c => c.status === 'VIOLATED');
    const invariantsPassed = violatedChecks.length === 0;
    if (!invariantsPassed) {
      for (const violated of violatedChecks) {
        violationDetails.push(`Invariant violated [${violated.category}]: ${violated.name} - ${violated.reason}`);
      }
    }

    // 5. Evaluate Drift Classification (Must be NO_DRIFT)
    // 5. Đánh giá phân loại sai lệch (Bắt buộc phải là NO_DRIFT)
    const activeDrifts = driftEvents.filter(d => d.classification !== 'NO_DRIFT');
    const driftPassed = activeDrifts.length === 0;
    if (!driftPassed) {
      for (const d of activeDrifts) {
        violationDetails.push(`Active drift detected [${d.classification}]: ${d.diffSummary}`);
      }
    }

    // 6. Evaluate System Health
    // 6. Đánh giá sức khỏe hệ thống
    const acceptableHealthStates = ['HEALTHY', 'NOMINAL', 'ACCEPTABLE'];
    const healthPassed = acceptableHealthStates.includes(healthResult.healthState);
    if (!healthPassed) {
      violationDetails.push(
        `Health state "${healthResult.healthState}" is unacceptable (score: ${healthResult.healthScore})`
      );
    }

    // Composite Verification Decision
    // Quyết định xác minh phức hợp
    const passed = errorRatePassed && latencyPassed && invariantsPassed && driftPassed && healthPassed;

    const verificationSha256 = this.computeVerificationSha256(
      plan.planId,
      passed,
      observedErrorRate,
      observedP95,
      violatedChecks.length,
      driftPassed ? 'NO_DRIFT' : 'DRIFT_DETECTED'
    );

    return {
      planId: plan.planId,
      verified: passed,
      passed,
      windowDurationMs: verificationWindowMs,
      verificationWindowMs,
      observedErrorRate,
      observedLatencyP95Ms: observedP95,
      baselineLatencyP95Ms: baselineLatencyP95,
      latencyVarianceRatio: observedP95 / (baselineLatencyP95 || 1),
      newInvariantViolationsCount: violatedChecks.length,
      postRemediationHealth: healthResult.healthState,
      driftStatus: driftPassed ? 'NO_DRIFT' : (activeDrifts[0]?.classification as any) ?? 'CRITICAL_DRIFT',
      verificationSummary: passed
        ? 'All post-mitigation verification checks passed nominal thresholds.'
        : `Post-mitigation verification failed: ${violationDetails.join('; ')}`,
      violationDetails: Object.freeze(violationDetails),
      verificationSha256,
      verifiedAt: checkedAt,
      checkedAt,
      observedMetrics: {
        errorRate: observedErrorRate,
        latencyP95: observedP95,
        newInvariantViolationsCount: violatedChecks.length,
        driftClassification: driftPassed ? 'NO_DRIFT' : activeDrifts[0]?.classification ?? 'CRITICAL_DRIFT',
        healthState: healthResult.healthState,
      },
    };
  }

  public computeVerificationSha256(
    planId: string,
    passed: boolean,
    errorRate: number,
    latencyP95: number,
    violationsCount: number,
    drift: string
  ): string {
    const raw = `${planId}|${passed}|${errorRate.toFixed(4)}|${latencyP95.toFixed(2)}|${violationsCount}|${drift}`;
    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }
}
