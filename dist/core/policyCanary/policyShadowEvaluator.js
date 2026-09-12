// src/core/policyCanary/policyShadowEvaluator.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Governed Policy Shadow Evaluator.
// Executes dual-evaluation in Ring 0 (Shadow Mode) by evaluating the candidate policy
// in parallel with the active policy against real runtime traffic WITHOUT executing tools.
//
// Bộ đánh giá bóng chính sách có quản trị.
// Thực thi đánh giá kép trong Vòng 0 (Chế độ Shadow) bằng cách đánh giá chính sách ứng viên
// song song với chính sách hoạt động trên lưu lượng thời gian chạy thực mà KHÔNG thực thi công cụ.
//
// Critical Safety Invariants:
// - ZERO_TOOL_EXECUTION: Never calls tool.execute() or world-action primitives.
// - ZERO_TOKEN_ISSUANCE: Never calls issueToken() or generates approval tokens.
// - ZERO_APPROVAL_GRANT: Never approves actions or alters human gates.
// - ZERO_STATE_MUTATION: Purely observational; produces telemetry records only.
// - HARD_FORBIDDEN_IMMUTABILITY: Permanently flags and rejects any attempted downgrade.
import { createPolicyCanaryObservationId, } from './policyCanaryTypes.js';
import { CANONICAL_HARD_FORBIDDEN_ACTIONS } from '../policyEnforcement/policyEnforcementTypes.js';
export class PolicyShadowEvaluator {
    /**
     * Performs read-only shadow evaluation comparing active policy against candidate policy.
     * Guarantees 100% zero side effects, zero tool execution, and zero token generation.
     *
     * Thực hiện đánh giá bóng chỉ đọc so sánh chính sách hoạt động với chính sách ứng viên.
     * Đảm bảo 100% không có tác dụng phụ, không thực thi công cụ và không tạo mã xác thực.
     */
    evaluateShadow(input) {
        const { tenantPartition, toolName, activeConfig, candidateConfig, correlationId, actorRole, requestedApprovalTimeoutMs, retryAttempt, } = input;
        const observationId = createPolicyCanaryObservationId(`obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
        const timestamp = new Date().toISOString();
        // 1. Evaluate Active Policy Classification & Decision
        const isHardForbidden = CANONICAL_HARD_FORBIDDEN_ACTIONS.includes(toolName);
        let activeClassification;
        let activeDecisionAllowed;
        let activeGuardrailPassed = true;
        if (isHardForbidden) {
            activeClassification = 'FORBIDDEN';
            activeDecisionAllowed = false;
        }
        else {
            activeClassification = activeConfig.actionClassifications[toolName] || 'HIGH_IMPACT';
            activeDecisionAllowed = this.isAllowedClassification(activeClassification, actorRole);
            // Check active guardrails
            if (requestedApprovalTimeoutMs && activeConfig.guardrails.minApprovalTimeoutMs) {
                if (requestedApprovalTimeoutMs < activeConfig.guardrails.minApprovalTimeoutMs) {
                    activeGuardrailPassed = false;
                }
            }
            if (retryAttempt !== undefined && activeConfig.guardrails.maxRetries !== undefined) {
                if (retryAttempt > activeConfig.guardrails.maxRetries) {
                    activeGuardrailPassed = false;
                }
            }
        }
        // 2. Evaluate Candidate Policy Classification & Decision
        let candidateClassification;
        let candidateDecisionAllowed;
        let candidateGuardrailPassed = true;
        let hardForbiddenDowngradeAttempt = false;
        if (isHardForbidden) {
            const declaredCandidateClass = candidateConfig.actionClassifications[toolName];
            if (declaredCandidateClass && declaredCandidateClass !== 'FORBIDDEN') {
                hardForbiddenDowngradeAttempt = true;
            }
            // Immutable safety floor overrides any illegal classification
            candidateClassification = 'FORBIDDEN';
            candidateDecisionAllowed = false;
        }
        else {
            candidateClassification = candidateConfig.actionClassifications[toolName] || 'HIGH_IMPACT';
            candidateDecisionAllowed = this.isAllowedClassification(candidateClassification, actorRole);
            // Check candidate guardrails
            if (requestedApprovalTimeoutMs && candidateConfig.guardrails.minApprovalTimeoutMs) {
                if (requestedApprovalTimeoutMs < candidateConfig.guardrails.minApprovalTimeoutMs) {
                    candidateGuardrailPassed = false;
                }
            }
            if (retryAttempt !== undefined && candidateConfig.guardrails.maxRetries !== undefined) {
                if (retryAttempt > candidateConfig.guardrails.maxRetries) {
                    candidateGuardrailPassed = false;
                }
            }
        }
        // 3. Compute Divergence and Deltas
        const classificationChanged = activeClassification !== candidateClassification;
        const allowedDecisionChanged = activeDecisionAllowed !== candidateDecisionAllowed;
        const guardrailChanged = activeGuardrailPassed !== candidateGuardrailPassed;
        const divergence = classificationChanged || allowedDecisionChanged || guardrailChanged || hardForbiddenDowngradeAttempt;
        const highImpactEscalation = activeClassification !== 'HIGH_IMPACT' && candidateClassification === 'HIGH_IMPACT';
        let divergenceReason;
        if (divergence) {
            const reasons = [];
            if (hardForbiddenDowngradeAttempt) {
                reasons.push(`CRITICAL: Attempted illegal downgrade of hard-forbidden action '${toolName}'`);
            }
            if (classificationChanged) {
                reasons.push(`Classification changed from '${activeClassification}' to '${candidateClassification}'`);
            }
            if (allowedDecisionChanged) {
                reasons.push(`Execution permission changed: active=${activeDecisionAllowed}, candidate=${candidateDecisionAllowed}`);
            }
            if (guardrailChanged) {
                reasons.push(`Guardrail pass state changed: active=${activeGuardrailPassed}, candidate=${candidateGuardrailPassed}`);
            }
            divergenceReason = reasons.join('; ');
        }
        return {
            observationId,
            tenantPartition,
            toolName,
            activeVersion: activeConfig.versionId,
            candidateVersion: candidateConfig.versionId,
            activeClassification,
            candidateClassification,
            activeDecisionAllowed,
            candidateDecisionAllowed,
            divergence,
            divergenceReason,
            activeGuardrailPassed,
            candidateGuardrailPassed,
            highImpactEscalation,
            hardForbiddenDowngradeAttempt,
            timestamp,
            correlationId,
        };
    }
    /**
     * Helper determining if an action classification permits automated execution.
     * Hàm trợ giúp xác định xem phân loại hành động có cho phép thực thi tự động hay không.
     */
    isAllowedClassification(classification, actorRole) {
        if (classification === 'OBSERVE' || classification === 'RECOMMEND') {
            return true;
        }
        if (classification === 'REVERSIBLE') {
            return actorRole === 'owner' || actorRole === 'admin' || actorRole === 'desktop_agent';
        }
        // HIGH_IMPACT and FORBIDDEN cannot execute automatically
        return false;
    }
}
export const globalPolicyShadowEvaluator = new PolicyShadowEvaluator();
