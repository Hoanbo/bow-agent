// src/core/policyPostExecution/policyPostExecutionTypes.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Canonical types, branded identifiers, lifecycle states, and DTO contracts
// for Governed Post-Execution Reconciliation, Impact Analysis, Regression Detection,
// Remediation Effectiveness, and Policy Feedback Proposals.
//
// Các kiểu canonical, định danh có thương hiệu, trạng thái vòng đời và hợp đồng DTO
// cho điều hòa sau thực thi có quản trị, phân tích tác động, phát hiện hồi quy,
// hiệu quả khắc phục và đề xuất phản hồi chính sách.
//
// STRICT INVARIANTS:
// - OBSERVATION != EVIDENCE != INVESTIGATION != DECISION != AUTHORIZATION != EXECUTION != VERIFICATION != FEEDBACK PROPOSAL != POLICY MUTATION
// - ZERO_AUTONOMOUS_POLICY_MUTATION: Proposes only; never mutates active or candidate policies directly
// - ABSOLUTE_USER_STOP_SUPREMACY: Immediate fail-closed suspension on USER_STOP
// - STRICT_TENANT_ISOLATION: Tenant-partitioned records; no cross-tenant inspection
export function createReconciliationId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_RECONCILIATION_ID: ReconciliationId must be a non-empty string');
    }
    return val.trim();
}
export const createPolicyReconciliationId = createReconciliationId;
export function createImpactAnalysisId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_IMPACT_ANALYSIS_ID: ImpactAnalysisId must be a non-empty string');
    }
    return val.trim();
}
export function createEffectivenessAssessmentId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_EFFECTIVENESS_ASSESSMENT_ID: EffectivenessAssessmentId must be a non-empty string');
    }
    return val.trim();
}
export function createRegressionDetectionId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_REGRESSION_DETECTION_ID: RegressionDetectionId must be a non-empty string');
    }
    return val.trim();
}
export function createFeedbackProposalId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_FEEDBACK_PROPOSAL_ID: FeedbackProposalId must be a non-empty string');
    }
    return val.trim();
}
export function createPostExecutionProvenanceId(val) {
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
        throw new Error('INVALID_POST_EXECUTION_PROVENANCE_ID: PostExecutionProvenanceId must be a non-empty string');
    }
    return val.trim();
}
