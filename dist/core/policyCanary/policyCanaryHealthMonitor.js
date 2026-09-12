// src/core/policyCanary/policyCanaryHealthMonitor.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Governed Policy Canary Health Monitor.
// Evaluates candidate policy health (HEALTHY, DEGRADED, CRITICAL) and produces strictly advisory
// recommendations (PROMOTE, HOLD, DEMOTE, ROLLBACK) based on real-time telemetry against calibrated SLOs.
//
// Bộ giám sát sức khỏe canary chính sách có quản trị.
// Đánh giá sức khỏe chính sách ứng viên (HEALTHY, DEGRADED, CRITICAL) và tạo các khuyến nghị
// mang tính cố vấn nghiêm ngặt (PROMOTE, HOLD, DEMOTE, ROLLBACK) dựa trên đo lường từ xa thời gian thực.
//
// Authority Invariants:
// - Level 1 Advisory Diagnostics: Health monitoring is strictly observational.
// - ZERO_AUTONOMOUS_PROMOTION: Positive health scores alone MUST NEVER autonomously promote a candidate.
// - IMMEDIATE_CRITICAL_ON_SAFETY_VIOLATIONS: Checksum mismatch, drift, or hard-forbidden downgrade triggers CRITICAL.
import { createPolicyCanaryHealthId, } from './policyCanaryTypes.js';
export const DEFAULT_CANARY_HEALTH_THRESHOLDS = Object.freeze({
    maxMismatchRate: 0.35,
    maxDenyRateDelta: 0.15,
    maxHighImpactEscalations: 5,
    maxGuardrailViolations: 3,
    maxApprovalTimeouts: 2,
    maxLatencyRegressionMs: 500,
    minEvaluationsForPromotion: 3,
});
export class PolicyCanaryHealthMonitor {
    thresholds;
    constructor(thresholds) {
        this.thresholds = {
            ...DEFAULT_CANARY_HEALTH_THRESHOLDS,
            ...thresholds,
        };
    }
    /**
     * Evaluates telemetry metrics and produces an advisory CanaryHealthReport.
     * NEVER triggers promotion autonomously.
     *
     * Đánh giá các chỉ số đo lường từ xa và tạo Báo cáo Sức khỏe Canary có tính cố vấn.
     * KHÔNG BAO GIỜ kích hoạt thăng hạng một cách tự động.
     */
    evaluateHealth(input) {
        const { candidateId, tenantPartition, ring, metrics } = input;
        const healthId = createPolicyCanaryHealthId(`hlth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
        const evaluatedAt = new Date().toISOString();
        const reasons = [];
        // 1. Critical Hard Failures (Immediate CRITICAL + Circuit Breaker)
        if (metrics.safetyRegressionCount > 0) {
            reasons.push(`CRITICAL: Detected ${metrics.safetyRegressionCount} safety regression(s) or hard-forbidden downgrade attempt(s)`);
        }
        if (metrics.checksumFailureCount > 0) {
            reasons.push(`CRITICAL: Detected ${metrics.checksumFailureCount} cryptographic checksum failure(s)`);
        }
        if (metrics.policyDriftCount > 0) {
            reasons.push(`CRITICAL: Detected ${metrics.policyDriftCount} active policy drift event(s)`);
        }
        if (reasons.length > 0) {
            return {
                healthId,
                candidateId,
                tenantPartition,
                ring,
                health: 'CRITICAL',
                recommendation: 'ROLLBACK',
                metrics,
                evaluatedAt,
                reasons,
                circuitBreakerRecommended: true,
            };
        }
        // 2. Degraded State Evaluation
        let degraded = false;
        const mismatchRate = metrics.totalEvaluations > 0
            ? metrics.decisionMismatchCount / metrics.totalEvaluations
            : 0;
        if (this.thresholds.maxMismatchRate !== undefined && mismatchRate > this.thresholds.maxMismatchRate) {
            degraded = true;
            reasons.push(`DEGRADED: Decision mismatch rate (${(mismatchRate * 100).toFixed(1)}%) exceeds threshold (${(this.thresholds.maxMismatchRate * 100).toFixed(1)}%)`);
        }
        if (this.thresholds.maxDenyRateDelta !== undefined && metrics.denyRateDelta > this.thresholds.maxDenyRateDelta) {
            degraded = true;
            reasons.push(`DEGRADED: Deny rate delta (+${(metrics.denyRateDelta * 100).toFixed(1)}%) indicates unexpected execution rejections`);
        }
        if (this.thresholds.maxHighImpactEscalations !== undefined && metrics.highImpactEscalationCount > this.thresholds.maxHighImpactEscalations) {
            degraded = true;
            reasons.push(`DEGRADED: High-impact escalation count (${metrics.highImpactEscalationCount}) exceeds threshold (${this.thresholds.maxHighImpactEscalations})`);
        }
        if (this.thresholds.maxGuardrailViolations !== undefined && metrics.guardrailViolationCount > this.thresholds.maxGuardrailViolations) {
            degraded = true;
            reasons.push(`DEGRADED: Guardrail violations (${metrics.guardrailViolationCount}) exceed threshold (${this.thresholds.maxGuardrailViolations})`);
        }
        if (this.thresholds.maxApprovalTimeouts !== undefined && metrics.approvalTimeoutCount > this.thresholds.maxApprovalTimeouts) {
            degraded = true;
            reasons.push(`DEGRADED: Approval timeouts (${metrics.approvalTimeoutCount}) indicate severe operator friction`);
        }
        const latencyDelta = metrics.candidateLatencyMs - metrics.activeLatencyMs;
        if (this.thresholds.maxLatencyRegressionMs !== undefined && latencyDelta > this.thresholds.maxLatencyRegressionMs) {
            degraded = true;
            reasons.push(`DEGRADED: Latency regression (+${latencyDelta.toFixed(1)}ms) exceeds threshold (${this.thresholds.maxLatencyRegressionMs}ms)`);
        }
        if (degraded) {
            return {
                healthId,
                candidateId,
                tenantPartition,
                ring,
                health: 'DEGRADED',
                recommendation: 'HOLD',
                metrics,
                evaluatedAt,
                reasons,
                circuitBreakerRecommended: false,
            };
        }
        // 3. Healthy State
        const minEvals = this.thresholds.minEvaluationsForPromotion ?? 3;
        if (metrics.totalEvaluations < minEvals) {
            reasons.push(`HEALTHY: Observational window active (${metrics.totalEvaluations}/${minEvals} evaluations gathered; continue observation)`);
            return {
                healthId,
                candidateId,
                tenantPartition,
                ring,
                health: 'HEALTHY',
                recommendation: 'HOLD',
                metrics,
                evaluatedAt,
                reasons,
                circuitBreakerRecommended: false,
            };
        }
        reasons.push(`HEALTHY: All safety criteria and SLO thresholds met with ${metrics.totalEvaluations} verified evaluations`);
        return {
            healthId,
            candidateId,
            tenantPartition,
            ring,
            health: 'HEALTHY',
            recommendation: 'PROMOTE',
            metrics,
            evaluatedAt,
            reasons,
            circuitBreakerRecommended: false,
        };
    }
}
export const globalPolicyCanaryHealthMonitor = new PolicyCanaryHealthMonitor();
