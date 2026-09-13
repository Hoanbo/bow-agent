// src/core/policyPostExecution/policyRemediationEffectivenessEngine.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Governed Policy Remediation Effectiveness Engine.
// Evaluates whether an executed remediation actually resolved the underlying governance issue.
// Enforces:
// 1. SUCCESS != EFFECTIVE: An execution returning SUCCESS does NOT automatically imply EFFECTIVE
// 2. Empirical proof requirement: Real evidence of problem resolution required
// 3. States: EFFECTIVE, PARTIALLY_EFFECTIVE, INEFFECTIVE, INCONCLUSIVE, UNKNOWN
// 4. Absolute USER_STOP supremacy
// 5. Strict tenant isolation
//
// Động cơ hiệu quả khắc phục chính sách có quản trị.
// Đánh giá liệu một hành động khắc phục đã thực thi có thực sự giải quyết được vấn đề quản trị cơ bản hay không.
//
// Authority Invariants:
// - ZERO_BLIND_ASSUMPTION: Never infer EFFECTIVE solely because execution returned SUCCESS
// - EVIDENCE_BACKED_EFFECTIVENESS: Requires verifiable evidence of metric or state recovery
import crypto from 'node:crypto';
import path from 'node:path';
import { createEffectivenessAssessmentId } from './policyPostExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyRemediationEffectivenessEngine {
    baseDir;
    isUserStopActiveFn;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Effectiveness assessment suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('EFFECTIVENESS_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Assesses the effectiveness of an executed remediation.
     * Đánh giá hiệu quả của một hành động khắc phục đã thực thi.
     */
    assessEffectiveness(reconciliation, impact, regression, context) {
        this.assertUserStopInactive();
        this.validateTenant(reconciliation.tenantPartition);
        const executionSuccess = reconciliation.status === 'VERIFIED_SUCCESS';
        const evidenceCount = context?.empiricalEvidenceCount ?? 0;
        let status = 'UNKNOWN';
        let issueResolved = false;
        let rationale = '';
        // 1. Check for failed or blocked execution
        if (reconciliation.status === 'VERIFIED_FAILURE' || reconciliation.status === 'VERIFIED_BLOCKED') {
            status = 'INEFFECTIVE';
            issueResolved = false;
            rationale = `Remediation execution failed (${reconciliation.status}); underlying issue remains unaddressed.`;
        }
        else if (reconciliation.status === 'VERIFIED_UNKNOWN' || reconciliation.status === 'RECONCILIATION_INVALID') {
            status = 'UNKNOWN';
            issueResolved = false;
            rationale = 'Execution outcome is ambiguous or unverifiable; effectiveness cannot be determined.';
        }
        else if (regression.regressionDetected && regression.severity === 'CRITICAL') {
            // Critical regression induced by remediation
            status = 'INEFFECTIVE';
            issueResolved = false;
            rationale = 'Remediation induced critical safety or policy regressions.';
        }
        else if (impact.classification === 'NO_EFFECT') {
            status = 'INEFFECTIVE';
            issueResolved = false;
            rationale = 'Execution completed but yielded zero measurable effect on the target problem.';
        }
        else if (evidenceCount === 0) {
            // CRITICAL INVARIANT: SUCCESS != EFFECTIVE without evidence
            status = 'INCONCLUSIVE';
            issueResolved = false;
            rationale = 'Execution succeeded but zero empirical follow-up evidence was provided. Inconclusive assessment.';
        }
        else if (context?.underlyingIssueResolved === true && context?.healthRestored === true) {
            status = 'EFFECTIVE';
            issueResolved = true;
            rationale = 'Empirical evidence confirms the investigated issue was resolved and health was restored.';
        }
        else if (impact.classification === 'PARTIAL_EFFECT' || reconciliation.status === 'VERIFIED_PARTIAL') {
            status = 'PARTIALLY_EFFECTIVE';
            issueResolved = false;
            rationale = 'Remediation achieved partial stabilization but issue is not fully resolved.';
        }
        else {
            status = 'INEFFECTIVE';
            issueResolved = false;
            rationale = 'Remediation executed but underlying issue was not confirmed resolved.';
        }
        const assessmentId = createEffectivenessAssessmentId(`eff_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
        const assessedAt = new Date().toISOString();
        return Object.freeze({
            assessmentId,
            executionId: reconciliation.executionId,
            tenantPartition: reconciliation.tenantPartition,
            candidateId: reconciliation.candidateId,
            status,
            executionSuccess,
            issueResolved,
            rationale,
            empiricalEvidenceCount: evidenceCount,
            assessedAt,
        });
    }
}
export const globalPolicyRemediationEffectivenessEngine = new PolicyRemediationEffectivenessEngine();
