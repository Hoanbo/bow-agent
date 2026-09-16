// src/core/governedRuntimeCompliance/PolicyViolationDriftClassifier.ts
// Component 1193: PolicyViolationDriftClassifier (REAL)
//
// Classifies non-compliant events into the canonical 8-category violation taxonomy,
// tracks repeated non-compliance escalation, and computes cumulative behavioral drift.
// Phân loại các sự kiện không tuân thủ theo bảng phân loại vi phạm chuẩn gồm 8 nhóm,
// theo dõi sự leo thang vi phạm lặp lại và tính toán độ lệch hành vi tích lũy.

import {
  ComplianceEvaluationRecord,
  RuntimeBehavioralProfile,
  PolicyViolationRecord,
  PolicyViolationCategory,
  ViolationSeverity,
  CumulativeDriftState,
  computeSha256,
} from './GovernedRuntimeComplianceTypes.js';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';

export class PolicyViolationDriftClassifier {
  private readonly violationHistory: PolicyViolationRecord[] = [];
  private readonly actionViolationCounts = new Map<string, number>();

  // Classifies a compliance failure or drift anomaly into an immutable PolicyViolationRecord.
  // Phân loại lỗi tuân thủ hoặc bất thường độ lệch thành một PolicyViolationRecord bất biến.
  public classifyViolation(
    profile: RuntimeBehavioralProfile,
    evaluation: ComplianceEvaluationRecord
  ): PolicyViolationRecord | null {
    if (evaluation.verdict === 'COMPLIANT') {
      return null;
    }

    let category: PolicyViolationCategory = 'POLICY_RULE_VIOLATION';
    let severity: ViolationSeverity = 'HIGH';
    let description = evaluation.reason;

    const actionKey = `${profile.tenantId}:${profile.actionName}`;
    const priorCount = (this.actionViolationCounts.get(actionKey) ?? 0) + 1;
    this.actionViolationCounts.set(actionKey, priorCount);

    // Classification Decision Tree
    // Cây quyết định phân loại
    if (evaluation.reason.toLowerCase().includes('cross-tenant') || evaluation.violatedRules.includes('TENANT_DOMAIN_ISOLATION_RULE')) {
      category = 'TENANT_BOUNDARY_VIOLATION';
      severity = 'CRITICAL';
    } else if (evaluation.reason.toLowerCase().includes('emergency_stop') || evaluation.violatedRules.includes('EMERGENCY_STOP_RULE')) {
      category = 'SAFETY_INTERLOCK_VIOLATION';
      severity = 'CRITICAL';
    } else if (
      evaluation.violatedRules.includes('HIGH_IMPACT_APPROVAL_REQUIRED') ||
      evaluation.reason.toLowerCase().includes('approval') ||
      evaluation.reason.toLowerCase().includes('token')
    ) {
      category = 'AUTHORIZATION_VIOLATION';
      severity = 'CRITICAL';
    } else if (evaluation.violatedRules.includes('LIFECYCLE_STATE_INVARIANT')) {
      category = 'LIFECYCLE_STATE_VIOLATION';
      severity = 'HIGH';
    } else if (evaluation.reason.toLowerCase().includes('clock skew') || evaluation.reason.toLowerCase().includes('temporal')) {
      category = 'TEMPORAL_ORDER_VIOLATION';
      severity = 'MEDIUM';
    } else if (evaluation.verdict === 'DIVERGENT') {
      category = 'BEHAVIORAL_DRIFT';
      severity = 'MEDIUM';
    }

    // Repeated non-compliance escalation
    // Leo thang đối với vi phạm lặp lại
    if (priorCount >= 3 && category !== 'TENANT_BOUNDARY_VIOLATION' && category !== 'SAFETY_INTERLOCK_VIOLATION') {
      category = 'REPEATED_NONCOMPLIANCE';
      severity = 'HIGH';
      description = `[ESCALATED_REPEATED] Action '${profile.actionName}' violated policy rules ${priorCount} times. ${evaluation.reason}`;
    }

    const rawId = `${evaluation.evaluationId}:${category}:${severity}:${Date.now()}`;
    const violationId = `vio_${computeSha256(rawId).slice(0, 16)}`;

    const record: PolicyViolationRecord = Object.freeze({
      violationId,
      evaluationId: evaluation.evaluationId,
      observationId: evaluation.observationId,
      category,
      severity,
      description,
      evidenceDetails: Object.freeze({
        actionName: profile.actionName,
        divergenceScore: evaluation.divergenceScore,
        violatedRules: evaluation.violatedRules,
        violationCount: priorCount,
      }),
      detectedAt: new Date().toISOString(),
    });

    this.violationHistory.push(record);
    return record;
  }

  // Computes cumulative behavioral drift state across historical evaluations.
  // Tính toán trạng thái độ lệch hành vi tích lũy qua các lượt đánh giá lịch sử.
  public computeCumulativeDrift(
    tenantId: string,
    policyDomain: PolicyDomain,
    evaluations: readonly ComplianceEvaluationRecord[]
  ): CumulativeDriftState {
    const tenantEvaluations = evaluations.filter(
      (e) => e.tenantId === tenantId && e.policyDomain === policyDomain
    );

    const N = tenantEvaluations.length;
    if (N === 0) {
      return Object.freeze({
        tenantId,
        policyDomain,
        cumulativeMagnitude: 0.0,
        driftVelocity: 0.0,
        sampleCount: 0,
        lastEvaluatedAt: new Date().toISOString(),
      });
    }

    const totalDivergence = tenantEvaluations.reduce((sum, e) => sum + (e.divergenceScore ?? 0), 0);
    const meanDivergence = Math.min(1.0, Math.max(0.0, totalDivergence / N));

    // Calculate drift velocity (rate of change over recent vs older half)
    let driftVelocity = 0.0;
    if (N >= 4) {
      const mid = Math.floor(N / 2);
      const olderHalf = tenantEvaluations.slice(0, mid);
      const recentHalf = tenantEvaluations.slice(mid);
      const olderMean = olderHalf.reduce((s, e) => s + e.divergenceScore, 0) / olderHalf.length;
      const recentMean = recentHalf.reduce((s, e) => s + e.divergenceScore, 0) / recentHalf.length;
      driftVelocity = Math.round((recentMean - olderMean) * 10000) / 10000;
    }

    return Object.freeze({
      tenantId,
      policyDomain,
      cumulativeMagnitude: Math.round(meanDivergence * 10000) / 10000,
      driftVelocity,
      sampleCount: N,
      lastEvaluatedAt: new Date().toISOString(),
    });
  }

  public getRecordedViolations(): readonly PolicyViolationRecord[] {
    return Object.freeze([...this.violationHistory]);
  }

  public clearHistory(): void {
    this.violationHistory.length = 0;
    this.actionViolationCounts.clear();
  }
}
