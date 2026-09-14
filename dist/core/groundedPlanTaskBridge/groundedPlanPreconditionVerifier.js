// src/core/groundedPlanTaskBridge/groundedPlanPreconditionVerifier.ts
// BOWCON V4.0 — MS-1.5.08: GROUNDED PLAN PRECONDITION VERIFIER
// Component 1051 — REAL
//
// EN: Read-only deterministic evaluator for plan and step preconditions.
//     Fails closed on unknown/unverified conditions with zero execution side-effects.
// VI: Trình đánh giá xác định chỉ đọc cho các tiền điều kiện của kế hoạch và bước.
//     Đóng an toàn khi gặp điều kiện không rõ/chưa xác minh, không có tác dụng phụ thực thi.
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { GroundedPlanTaskUserStopError, } from './groundedPlanTaskTypes.js';
export class GroundedPlanPreconditionVerifier {
    userStopProvider;
    customEvaluators;
    constructor(options) {
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this.customEvaluators = new Map();
        if (options?.customEvaluators) {
            for (const [key, fn] of Object.entries(options.customEvaluators)) {
                this.customEvaluators.set(key.toLowerCase(), fn);
            }
        }
    }
    /**
     * EN: Evaluates all preconditions declared on the binding and its steps.
     * VI: Đánh giá tất cả tiền điều kiện được khai báo trên ràng buộc và các bước của nó.
     */
    verifyBindingPreconditions(binding, context = {}) {
        if (this.userStopProvider()) {
            throw new GroundedPlanTaskUserStopError('verify_binding_preconditions');
        }
        const results = [];
        let allSatisfied = true;
        // 1. Gather all unique preconditions across all steps
        const preconditionsSet = new Set();
        for (const step of binding.stepBindings) {
            for (const pre of step.preconditions) {
                preconditionsSet.add(pre.trim());
            }
        }
        // 2. Evaluate each precondition deterministically
        for (const pre of preconditionsSet) {
            if (this.userStopProvider()) {
                throw new GroundedPlanTaskUserStopError('verify_step_precondition');
            }
            const evalResult = this.evaluateSinglePrecondition(pre, {
                ...context,
                bindingId: binding.bindingId,
                tenantId: binding.tenantId,
                sessionId: binding.sessionId,
                sourcePlanId: binding.sourcePlanId,
                sourcePlanProvenanceHash: binding.sourcePlanProvenanceHash,
            });
            results.push(evalResult);
            if (!evalResult.satisfied) {
                allSatisfied = false;
            }
        }
        return Object.freeze({
            allSatisfied,
            results: Object.freeze(results),
        });
    }
    /**
     * EN: Evaluates a single declarative precondition with fails-closed default.
     * VI: Đánh giá một tiền điều kiện mang tính khai báo với mặc định đóng an toàn.
     */
    evaluateSinglePrecondition(precondition, context) {
        const normalized = precondition.trim();
        const now = new Date().toISOString();
        if (!normalized) {
            return Object.freeze({
                precondition,
                status: 'FAILED',
                satisfied: false,
                reason: 'Precondition declaration is empty',
                evaluatedAt: now,
            });
        }
        const lower = normalized.toLowerCase();
        // 1. Check custom evaluators first
        if (this.customEvaluators.has(lower)) {
            try {
                const customRes = this.customEvaluators.get(lower)(normalized, context);
                return Object.freeze({
                    precondition: normalized,
                    status: customRes.satisfied ? 'SATISFIED' : 'FAILED',
                    satisfied: customRes.satisfied,
                    reason: customRes.reason,
                    evaluatedAt: now,
                    evidence: customRes.evidence ? Object.freeze({ ...customRes.evidence }) : undefined,
                });
            }
            catch (err) {
                return Object.freeze({
                    precondition: normalized,
                    status: 'FAILED',
                    satisfied: false,
                    reason: `Custom evaluator failed closed with error: ${err instanceof Error ? err.message : String(err)}`,
                    evaluatedAt: now,
                });
            }
        }
        // 2. Standard canonical read-only predicate evaluations
        if (lower.startsWith('tenant_match') || lower.startsWith('valid_tenant')) {
            const activeTenant = context.tenantId;
            const satisfied = typeof activeTenant === 'string' && activeTenant.trim().length > 0;
            return Object.freeze({
                precondition: normalized,
                status: satisfied ? 'SATISFIED' : 'FAILED',
                satisfied,
                reason: satisfied ? `Tenant validated: ${activeTenant}` : 'No active tenant found in evaluation context',
                evaluatedAt: now,
            });
        }
        if (lower.startsWith('session_active') || lower.startsWith('valid_session')) {
            const activeSession = context.sessionId;
            const satisfied = typeof activeSession === 'string' && activeSession.trim().length > 0;
            return Object.freeze({
                precondition: normalized,
                status: satisfied ? 'SATISFIED' : 'FAILED',
                satisfied,
                reason: satisfied ? `Session validated: ${activeSession}` : 'No active session found in evaluation context',
                evaluatedAt: now,
            });
        }
        if (lower.startsWith('provenance_valid') || lower.startsWith('hash_verified')) {
            const provHash = context.sourcePlanProvenanceHash;
            const satisfied = typeof provHash === 'string' && /^[a-f0-9]{64}$/.test(provHash);
            return Object.freeze({
                precondition: normalized,
                status: satisfied ? 'SATISFIED' : 'FAILED',
                satisfied,
                reason: satisfied ? 'Plan provenance hash is structurally valid' : 'Plan provenance hash is missing or malformed',
                evaluatedAt: now,
            });
        }
        if (lower.startsWith('target_element_exists') || lower.startsWith('visual_target_valid')) {
            const targetExists = context.targetElementPresent === true;
            return Object.freeze({
                precondition: normalized,
                status: targetExists ? 'SATISFIED' : 'FAILED',
                satisfied: targetExists,
                reason: targetExists ? 'Visual target element verified present' : 'Visual target element could not be verified in context',
                evaluatedAt: now,
            });
        }
        // 3. Fallback: UNKNOWN condition -> FAILS CLOSED
        return Object.freeze({
            precondition: normalized,
            status: 'UNKNOWN',
            satisfied: false,
            reason: `Unknown precondition "${normalized}" failed closed; no deterministic read-only evaluator registered`,
            evaluatedAt: now,
        });
    }
}
