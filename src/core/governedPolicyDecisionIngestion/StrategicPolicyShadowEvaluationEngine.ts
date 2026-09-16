// src/core/governedPolicyDecisionIngestion/StrategicPolicyShadowEvaluationEngine.ts
// Component 1174: StrategicPolicyShadowEvaluationEngine (REAL)
//
// Read-only in-memory shadow evaluation sandbox for proposed strategic policies.
// Projects candidate policies against historical decision traces with strictly zero operational side-effects.
// Môi trường đánh giá bóng (shadow) chỉ đọc trên bộ nhớ cho các chính sách chiến lược đề xuất;
// đối chiếu chính sách ứng viên với các vết quyết định lịch sử mà không gây ra bất kỳ tác dụng phụ nào.

import {
  MAX_SHADOW_EVAL_TRACES,
  computeShadowEvaluationReportHash,
  type CanonicalStrategicPolicy,
  type ShadowEvaluationReport,
} from './GovernedPolicyDecisionIngestionTypes.js';

export interface HistoricalDecisionTrace {
  traceId: string;
  action: string;
  parameters: Record<string, any>;
  baselineDecision: 'ALLOW' | 'DENY' | 'REQUIRE_HUMAN_APPROVAL';
  timestamp: number;
}

export class StrategicPolicyShadowEvaluationEngine {
  /**
   * Evaluate a candidate policy against historical traces in a bounded, isolated, side-effect-free manner.
   * Đánh giá chính sách ứng viên so với các vết lịch sử trong môi trường cô lập, giới hạn và phi tác dụng phụ.
   */
  public evaluateShadow(
    candidatePolicy: CanonicalStrategicPolicy,
    historicalTraces: HistoricalDecisionTrace[],
    maxPermittedDivergence = 0.5
  ): ShadowEvaluationReport {
    const startTime = Date.now();
    const boundedTraces = historicalTraces.slice(0, MAX_SHADOW_EVAL_TRACES);

    let mismatchCount = 0;

    for (const trace of boundedTraces) {
      const candidateDecision = this.evaluateActionAgainstPolicy(trace.action, trace.parameters, candidatePolicy);
      if (candidateDecision !== trace.baselineDecision) {
        mismatchCount++;
      }
    }

    const totalCount = boundedTraces.length;
    const divergenceRate = totalCount > 0 ? mismatchCount / totalCount : 0.0;
    const latencyOverheadMs = Date.now() - startTime;
    const passed = divergenceRate <= maxPermittedDivergence;

    const reportId = `shadow_${candidatePolicy.policyId}_${Date.now()}`;
    const rawReport: Omit<ShadowEvaluationReport, 'reportHash'> = {
      reportId,
      policyId: candidatePolicy.policyId,
      tenantId: candidatePolicy.tenantId,
      policyDomain: candidatePolicy.policyDomain,
      evaluatedTracesCount: totalCount,
      mismatchCount,
      divergenceRate,
      latencyOverheadMs,
      passed,
      evaluatedAt: Date.now(),
    };

    const reportHash = computeShadowEvaluationReportHash(rawReport);

    return Object.freeze({
      ...rawReport,
      reportHash,
    });
  }

  private evaluateActionAgainstPolicy(
    action: string,
    params: Record<string, any>,
    policy: CanonicalStrategicPolicy
  ): 'ALLOW' | 'DENY' | 'REQUIRE_HUMAN_APPROVAL' {
    const cleanAction = action.trim();
    const ruleKey = `rule_${cleanAction.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    const rule = policy.rules[ruleKey];
    if (rule) {
      return rule.action;
    }

    // Default conservative fallback
    return 'REQUIRE_HUMAN_APPROVAL';
  }
}
