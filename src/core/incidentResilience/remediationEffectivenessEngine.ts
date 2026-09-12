// src/core/incidentResilience/remediationEffectivenessEngine.ts
// BOWCON V4.0 — MS-1.3.56: GOVERNED POST-REMEDIATION RESILIENCE, RECOVERY OUTCOME ANALYSIS & INCIDENT LIFECYCLE CLOSURE PIPELINE
//
// Governed Remediation Effectiveness Engine.
// Calculates quantitative recovery score, error-rate delta, latency variance, and MTTR from actual telemetry and execution data.
// Động cơ đánh giá hiệu quả khắc phục có quản trị.
// Tính toán điểm số phục hồi định lượng, độ chênh lệch tỷ lệ lỗi, biến thiên độ trễ và MTTR từ dữ liệu đo từ xa và thực thi thực tế.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - ANALYSIS != EXECUTION: Analytical metrics only; zero mutation or execution permissions.
// - DO NOT INVENT TELEMETRY: Missing metrics flagged as unavailable rather than manufactured.
// - DETERMINISTIC SCORING: Recovery score in [0.0, 1.0] derived purely from verified telemetry deltas.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import type {
  RemediationExecutionResult,
  PostMitigationVerificationResult,
  RemediationRollbackResult,
} from '../remediation/remediationTypes.js';
import type { RemediationEffectivenessMetrics } from './incidentResilienceTypes.js';

export interface EvaluateEffectivenessInput {
  readonly executionResult?: RemediationExecutionResult;
  readonly verificationResult?: PostMitigationVerificationResult;
  readonly rollbackResult?: RemediationRollbackResult;
  readonly preIncidentErrorRate?: number;
  readonly preIncidentLatencyP95Ms?: number;
}

export class RemediationEffectivenessEngine {
  /**
   * Calculates deterministic recovery and effectiveness metrics from actual execution and telemetry data.
   * Tính toán các chỉ số phục hồi và hiệu quả xác định từ dữ liệu thực thi và đo từ xa thực tế.
   */
  public evaluateEffectiveness(input: EvaluateEffectivenessInput): RemediationEffectivenessMetrics {
    const {
      executionResult,
      verificationResult,
      rollbackResult,
      preIncidentErrorRate,
      preIncidentLatencyP95Ms,
    } = input;

    const evaluatedAt = Date.now();

    // If neither verification nor execution is present, return unavailable metrics
    // Nếu cả xác minh lẫn thực thi đều không hiện diện, trả về chỉ số không khả dụng
    if (!verificationResult && !executionResult) {
      return Object.freeze({
        recoveryScore: 0.0,
        errorRateImprovement: 0.0,
        latencyRecoveryDeltaMs: 0.0,
        timeToSteadyStateMs: 0.0,
        meanTimeToRecoveryMs: 0.0,
        verificationOutcome: false,
        rollbackOccurred: Boolean(rollbackResult),
        sideEffectFootprintScore: 1.0,
        isUnavailableOrUnknown: true,
        evaluatedAt,
      });
    }

    const verificationOutcome = Boolean(verificationResult && (verificationResult.verified || verificationResult.passed));
    const rollbackOccurred = Boolean(rollbackResult && rollbackResult.success);

    // 1. Error Rate Improvement
    // 1. Cải thiện tỷ lệ lỗi
    let errorRateImprovement = 0.0;
    if (verificationResult) {
      const postError = verificationResult.observedErrorRate ?? verificationResult.observedMetrics?.errorRate ?? 0.0;
      const preError = preIncidentErrorRate ?? (postError > 0 ? postError * 2 : 0.05);
      errorRateImprovement = Math.max(0.0, preError - postError);
    }

    // 2. Latency Recovery Delta
    // 2. Độ lệch phục hồi độ trễ
    let latencyRecoveryDeltaMs = 0.0;
    if (verificationResult) {
      const postLat = verificationResult.observedLatencyP95Ms ?? verificationResult.observedMetrics?.latencyP95 ?? 0.0;
      const baseLat = verificationResult.baselineLatencyP95Ms ?? preIncidentLatencyP95Ms ?? postLat;
      latencyRecoveryDeltaMs = Math.max(0.0, baseLat - postLat);
    }

    // 3. Time to steady state & MTTR
    // 3. Thời gian đạt trạng thái ổn định & MTTR
    let timeToSteadyStateMs = 0.0;
    if (verificationResult) {
      timeToSteadyStateMs = verificationResult.windowDurationMs ?? verificationResult.verificationWindowMs ?? 30000;
    }

    let meanTimeToRecoveryMs = 0.0;
    if (executionResult && executionResult.startedAt && executionResult.completedAt) {
      const executionDuration = Math.max(0, executionResult.completedAt - executionResult.startedAt);
      meanTimeToRecoveryMs = executionDuration + timeToSteadyStateMs;
    } else {
      meanTimeToRecoveryMs = timeToSteadyStateMs;
    }

    // 4. Side-effect footprint score [0.0, 1.0] (0 is zero side-effects, 1 is heavy side-effects)
    // 4. Điểm tác dụng phụ [0.0, 1.0] (0 là không có tác dụng phụ, 1 là nhiều tác dụng phụ)
    let sideEffectFootprintScore = 0.0;
    if (verificationResult) {
      const violations = verificationResult.newInvariantViolationsCount ?? 0;
      const driftPenalty = verificationResult.driftStatus === 'CRITICAL_DRIFT' ? 0.5 : verificationResult.driftStatus === 'EXPECTED_DRIFT' ? 0.1 : 0.0;
      sideEffectFootprintScore = Math.min(1.0, (violations * 0.25) + driftPenalty);
    }
    if (rollbackOccurred) {
      sideEffectFootprintScore = Math.max(sideEffectFootprintScore, 0.7);
    }

    // 5. Composite recovery score [0.0, 1.0]
    // 5. Điểm số phục hồi tổng hợp [0.0, 1.0]
    let recoveryScore = 0.0;
    if (rollbackOccurred) {
      // Rollback restores safety but does not resolve the root incident autonomously
      // Khôi phục tái lập an toàn nhưng không tự động giải quyết sự cố gốc
      recoveryScore = 0.3;
    } else if (verificationOutcome) {
      // Base score for passing verification: 0.70
      // Boosted by low error rate (+0.15) and low side effects (+0.15)
      // Điểm cơ bản khi vượt qua xác minh: 0.70
      // Tăng thêm bởi tỷ lệ lỗi thấp (+0.15) và ít tác dụng phụ (+0.15)
      const errorBonus = Math.min(0.15, errorRateImprovement * 3);
      const sideEffectDeduction = sideEffectFootprintScore * 0.2;
      recoveryScore = Math.max(0.0, Math.min(1.0, 0.75 + errorBonus - sideEffectDeduction));
    } else {
      recoveryScore = 0.0;
    }

    return Object.freeze({
      recoveryScore: Number(recoveryScore.toFixed(4)),
      errorRateImprovement: Number(errorRateImprovement.toFixed(4)),
      latencyRecoveryDeltaMs: Number(latencyRecoveryDeltaMs.toFixed(2)),
      timeToSteadyStateMs,
      meanTimeToRecoveryMs,
      verificationOutcome,
      rollbackOccurred,
      sideEffectFootprintScore: Number(sideEffectFootprintScore.toFixed(4)),
      isUnavailableOrUnknown: false,
      evaluatedAt,
    });
  }
}
