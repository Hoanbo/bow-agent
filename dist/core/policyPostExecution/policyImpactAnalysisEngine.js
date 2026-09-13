// src/core/policyPostExecution/policyImpactAnalysisEngine.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Governed Policy Impact Analysis Engine.
// Deterministically compares expected remediation intent against actual verified post-execution outcomes.
// Enforces:
// 1. Rigorous classification: EXPECTED, BETTER_THAN_EXPECTED, WORSE_THAN_EXPECTED,
//    NO_EFFECT, PARTIAL_EFFECT, UNKNOWN_IMPACT, SAFETY_REGRESSION
// 2. Empirical ground truth: No fabricated measurements or unobserved metric deltas
// 3. Absolute USER_STOP supremacy
// 4. Strict tenant isolation
//
// Động cơ phân tích tác động chính sách có quản trị.
// So sánh có tính xác định ý định khắc phục dự kiến với kết quả sau thực thi đã xác minh thực tế.
//
// Authority Invariants:
// - ZERO_FABRICATED_IMPACT: Classifications derived strictly from verified inputs
// - FAIL_CLOSED_SAFETY: Safety state regressions immediately escalate to SAFETY_REGRESSION
import crypto from 'node:crypto';
import path from 'node:path';
import { createImpactAnalysisId, } from './policyPostExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyImpactAnalysisEngine {
    baseDir;
    isUserStopActiveFn;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Impact analysis suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('IMPACT_ANALYSIS_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Evaluates and classifies the expected vs actual impact of an executed remediation.
     * Đánh giá và phân loại tác động dự kiến so với thực tế của một hành động khắc phục đã thực thi.
     */
    analyzeImpact(reconciliation, context) {
        this.assertUserStopInactive();
        this.validateTenant(reconciliation.tenantPartition);
        const metricsDelta = context.metricsDelta ?? {};
        let classification = 'UNKNOWN_IMPACT';
        const actualEffect = context.observedEffect ?? `Observed state matching ${reconciliation.status}`;
        // 1. Safety State Regression Priority Check
        if (context.safetyStateDegraded === true) {
            classification = 'SAFETY_REGRESSION';
        }
        else if (reconciliation.status === 'VERIFIED_UNKNOWN' || reconciliation.status === 'RECONCILIATION_INVALID') {
            classification = 'UNKNOWN_IMPACT';
        }
        else if (reconciliation.status === 'VERIFIED_FAILURE' || reconciliation.status === 'VERIFIED_BLOCKED') {
            classification = 'WORSE_THAN_EXPECTED';
        }
        else if (reconciliation.status === 'VERIFIED_PARTIAL') {
            classification = 'PARTIAL_EFFECT';
        }
        else if (reconciliation.status === 'VERIFIED_SUCCESS') {
            // Check if metrics actually shifted or if it was a no-effect execution
            const totalMetricShift = Object.values(metricsDelta).reduce((sum, val) => sum + Math.abs(val), 0);
            if (Object.keys(metricsDelta).length > 0 && totalMetricShift === 0) {
                classification = 'NO_EFFECT';
            }
            else if (metricsDelta.errorRateReduction && metricsDelta.errorRateReduction >= 1.0) {
                classification = 'BETTER_THAN_EXPECTED';
            }
            else {
                classification = 'EXPECTED';
            }
        }
        else {
            classification = 'UNKNOWN_IMPACT';
        }
        const impactId = createImpactAnalysisId(`imp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
        const analyzedAt = new Date().toISOString();
        return Object.freeze({
            impactId,
            executionId: reconciliation.executionId,
            tenantPartition: reconciliation.tenantPartition,
            candidateId: reconciliation.candidateId,
            classification,
            expectedEffect: context.expectedEffect,
            actualEffect,
            targetRing: context.targetRing,
            observedRing: context.observedRing,
            metricsDelta: Object.freeze({ ...metricsDelta }),
            analyzedAt,
        });
    }
}
export const globalPolicyImpactAnalysisEngine = new PolicyImpactAnalysisEngine();
