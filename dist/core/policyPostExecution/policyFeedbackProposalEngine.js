// src/core/policyPostExecution/policyFeedbackProposalEngine.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Governed Policy Feedback Proposal Engine.
// Synthesizes post-execution reconciliation, impact, regression, and effectiveness
// findings into immutable, governed feedback proposals for future policy evolution.
//
// Động cơ đề xuất phản hồi chính sách có quản trị.
// Tổng hợp các phát hiện về điều hòa, tác động, hồi quy và hiệu quả sau thực thi
// thành các đề xuất phản hồi bất biến, có quản trị cho sự tiến hóa chính sách tương lai.
//
// Authority Invariants:
// - ZERO_AUTONOMOUS_POLICY_MUTATION: Only creates proposals; NEVER mutates policy or candidates
// - ZERO_AUTONOMOUS_AUTHORIZATION: Proposals require human review before adoption
// - ABSOLUTE_USER_STOP_SUPREMACY: Immediate suspension when USER_STOP active
// - STRICT_TENANT_ISOLATION: Tenant isolation strictly checked
import crypto from 'node:crypto';
import path from 'node:path';
import { createFeedbackProposalId } from './policyPostExecutionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyFeedbackProposalEngine {
    baseDir;
    isUserStopActiveFn;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Feedback proposal synthesis suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('FEEDBACK_PROPOSAL_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Deterministically synthesizes a governed feedback proposal from post-execution evaluations.
     * Tổng hợp có tính xác định một đề xuất phản hồi có quản trị từ các đánh giá sau thực thi.
     */
    generateProposal(reconciliation, impact, regression, effectiveness) {
        this.assertUserStopInactive();
        this.validateTenant(reconciliation.tenantPartition);
        let proposedAction = 'RETAIN_CURRENT_POLICY';
        let rationale = '';
        // Deterministic Proposal Policy
        if (regression.regressionDetected && regression.severity === 'CRITICAL') {
            proposedAction = 'REQUEST_HUMAN_INVESTIGATION';
            rationale = 'Critical safety regression detected during remediation. Immediate human operator review required.';
        }
        else if (regression.regressionTypes.includes('REPEATED_REMEDIATION_FAILURE') || regression.regressionTypes.includes('ROLLBACK_RECURRENCE')) {
            proposedAction = 'REQUEST_ROLLBACK_REVIEW';
            rationale = 'Persistent remediation failures or repeated rollbacks require strategic baseline review.';
        }
        else if (regression.regressionTypes.includes('CANDIDATE_DEGRADATION') || effectiveness.status === 'INEFFECTIVE') {
            proposedAction = 'REQUEST_NEW_CANDIDATE';
            rationale = 'Candidate exhibited significant degradation or ineffective remediation. Request synthesis of revised candidate.';
        }
        else if (effectiveness.status === 'INCONCLUSIVE' || reconciliation.status === 'VERIFIED_UNKNOWN') {
            proposedAction = 'RE_EVALUATE_CANDIDATE';
            rationale = 'Effectiveness assessment was inconclusive. Further canary observation recommended.';
        }
        else if (impact.classification === 'BETTER_THAN_EXPECTED' || effectiveness.status === 'EFFECTIVE') {
            proposedAction = 'RETAIN_CURRENT_POLICY';
            rationale = 'Remediation was verified effective. Current policy baseline is stable and should be retained.';
        }
        else {
            proposedAction = 'INVESTIGATE_POLICY_DRIFT';
            rationale = 'Minor divergence observed without critical regression. Investigate potential policy drift.';
        }
        const proposalId = createFeedbackProposalId(`fbp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
        const proposedAt = new Date().toISOString();
        return Object.freeze({
            proposalId,
            executionId: reconciliation.executionId,
            tenantPartition: reconciliation.tenantPartition,
            candidateId: reconciliation.candidateId,
            proposedAction,
            state: 'PROPOSED',
            rationale,
            impactClassification: impact.classification,
            effectivenessStatus: effectiveness.status,
            regressionTypes: Object.freeze([...regression.regressionTypes]),
            isAutonomousMutation: false,
            proposedAt,
        });
    }
}
export const globalPolicyFeedbackProposalEngine = new PolicyFeedbackProposalEngine();
