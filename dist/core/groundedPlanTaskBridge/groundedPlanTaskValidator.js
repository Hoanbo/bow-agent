// src/core/groundedPlanTaskBridge/groundedPlanTaskValidator.ts
// BOWCON V4.0 — MS-1.5.08: GROUNDED PLAN TASK VALIDATOR
// Component 1049 — REAL
//
// EN: Pure fails-closed validator enforcing plan-task binding schemas, step bounds,
//     prototype pollution defense, chain-of-thought (CoT) prohibition, and identifier safety.
// VI: Trình xác thực thuần túy đóng an toàn thực thi các lược đồ ràng buộc kế hoạch-nhiệm vụ,
//     giới hạn bước, phòng thủ ô nhiễm prototype, cấm suy luận CoT và an toàn định danh.
import { MAX_PLAN_TASK_STEPS, MAX_PRECONDITIONS_PER_STEP, GroundedPlanTaskValidationError, } from './groundedPlanTaskTypes.js';
const FORBIDDEN_OBJECT_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);
const FORBIDDEN_COT_TOKENS = Object.freeze([
    '<thought>',
    '</thought>',
    '[scratchpad]',
    'internalreasoning',
    'chainofthought',
    'reasoning_trace',
    'hidden_reasoning',
    'privatedeliberation',
    'modelthinking',
]);
const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-.:]{1,128}$/;
export class GroundedPlanTaskValidator {
    /**
     * EN: Validates a source GroundedActionPlan before binding preparation.
     * VI: Xác thực GroundedActionPlan nguồn trước khi chuẩn bị ràng buộc.
     */
    static validateSourcePlan(plan) {
        const errors = [];
        if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
            throw new GroundedPlanTaskValidationError('Source GroundedActionPlan must be a non-null object', ['NOT_AN_OBJECT']);
        }
        const p = plan;
        // 1. Prototype Pollution Defense
        this.assertNoPrototypePollution(p, errors, 'sourcePlan');
        // 2. Chain-of-Thought Prohibition
        this.assertNoForbiddenCoT(p, errors, 'sourcePlan');
        // 3. ID and Tenant Validation
        if (typeof p.planId !== 'string' || !SAFE_ID_REGEX.test(p.planId)) {
            errors.push(`Invalid planId: "${p.planId}"`);
        }
        if (typeof p.tenantId !== 'string' || !SAFE_ID_REGEX.test(p.tenantId)) {
            errors.push(`Invalid tenantId: "${p.tenantId}"`);
        }
        if (typeof p.sessionId !== 'string' || !SAFE_ID_REGEX.test(p.sessionId)) {
            errors.push(`Invalid sessionId: "${p.sessionId}"`);
        }
        // 4. Status Check
        if (p.status !== 'APPROVED_FOR_EXECUTION' && p.status !== 'VALIDATED' && p.status !== 'SUBMITTED_TO_PDP') {
            errors.push(`Source plan status "${p.status}" is not eligible for task binding preparation`);
        }
        // 5. Steps Bounds
        if (!Array.isArray(p.steps) || p.steps.length === 0) {
            errors.push('Source plan must contain at least 1 step');
        }
        else if (p.steps.length > MAX_PLAN_TASK_STEPS) {
            errors.push(`Step count ${p.steps.length} exceeds ceiling of ${MAX_PLAN_TASK_STEPS}`);
        }
        if (errors.length > 0) {
            throw new GroundedPlanTaskValidationError('Source GroundedActionPlan validation failed', errors);
        }
    }
    /**
     * EN: Validates a complete GroundedPlanTaskBinding.
     * VI: Xác thực hoàn chỉnh một GroundedPlanTaskBinding.
     */
    static validateBinding(binding) {
        const errors = [];
        if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
            throw new GroundedPlanTaskValidationError('GroundedPlanTaskBinding must be a non-null object', ['NOT_AN_OBJECT']);
        }
        const b = binding;
        // 1. Security defenses
        this.assertNoPrototypePollution(b, errors, 'binding');
        this.assertNoForbiddenCoT(b, errors, 'binding');
        // 2. Identifiers
        if (typeof b.bindingId !== 'string' || !SAFE_ID_REGEX.test(b.bindingId)) {
            errors.push(`Invalid bindingId: "${b.bindingId}"`);
        }
        if (typeof b.tenantId !== 'string' || !SAFE_ID_REGEX.test(b.tenantId)) {
            errors.push(`Invalid tenantId: "${b.tenantId}"`);
        }
        if (typeof b.sessionId !== 'string' || !SAFE_ID_REGEX.test(b.sessionId)) {
            errors.push(`Invalid sessionId: "${b.sessionId}"`);
        }
        if (typeof b.sourcePlanId !== 'string' || !SAFE_ID_REGEX.test(b.sourcePlanId)) {
            errors.push(`Invalid sourcePlanId: "${b.sourcePlanId}"`);
        }
        // 3. Provenance Hash format
        if (typeof b.provenanceHash !== 'string' || !/^[a-f0-9]{64}$/.test(b.provenanceHash)) {
            errors.push('Binding provenanceHash must be a valid 64-char hex SHA-256 string');
        }
        // 4. Step Bindings
        if (!Array.isArray(b.stepBindings) || b.stepBindings.length === 0) {
            errors.push('Binding must contain at least 1 step binding');
        }
        else {
            if (b.stepBindings.length > MAX_PLAN_TASK_STEPS) {
                errors.push(`Step binding count ${b.stepBindings.length} exceeds ceiling of ${MAX_PLAN_TASK_STEPS}`);
            }
            for (const step of b.stepBindings) {
                this.validateStepBinding(step, errors);
            }
        }
        // 5. Version
        if (typeof b.sessionVersion !== 'number' || !Number.isInteger(b.sessionVersion) || b.sessionVersion < 1) {
            errors.push(`Invalid sessionVersion: ${b.sessionVersion}`);
        }
        if (errors.length > 0) {
            throw new GroundedPlanTaskValidationError('GroundedPlanTaskBinding validation failed', errors);
        }
    }
    /**
     * EN: Validates an individual step binding.
     * VI: Xác thực một ràng buộc bước riêng lẻ.
     */
    static validateStepBinding(step, errors) {
        if (!step || typeof step !== 'object' || Array.isArray(step)) {
            errors.push('Step binding must be a non-null object');
            return;
        }
        const s = step;
        if (typeof s.stepBindingId !== 'string' || !SAFE_ID_REGEX.test(s.stepBindingId)) {
            errors.push(`Invalid stepBindingId: "${s.stepBindingId}"`);
        }
        if (typeof s.sourceStepId !== 'string' || !SAFE_ID_REGEX.test(s.sourceStepId)) {
            errors.push(`Invalid sourceStepId: "${s.sourceStepId}"`);
        }
        if (typeof s.stepIndex !== 'number' || s.stepIndex < 0) {
            errors.push(`Invalid stepIndex: ${s.stepIndex}`);
        }
        if (Array.isArray(s.preconditions) && s.preconditions.length > MAX_PRECONDITIONS_PER_STEP) {
            errors.push(`Precondition count ${s.preconditions.length} exceeds maximum of ${MAX_PRECONDITIONS_PER_STEP}`);
        }
        if (typeof s.stepProvenanceHash !== 'string' || !/^[a-f0-9]{64}$/.test(s.stepProvenanceHash)) {
            errors.push('stepProvenanceHash must be a valid 64-char hex SHA-256 string');
        }
    }
    /**
     * EN: Validates human confirmation record structure.
     * VI: Xác thực cấu trúc bản ghi xác nhận con người.
     */
    static validateHumanConfirmation(rec) {
        const errors = [];
        if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
            throw new GroundedPlanTaskValidationError('HumanConfirmationRecord must be a non-null object', ['NOT_AN_OBJECT']);
        }
        const r = rec;
        if (typeof r.confirmationId !== 'string' || !SAFE_ID_REGEX.test(r.confirmationId)) {
            errors.push(`Invalid confirmationId: "${r.confirmationId}"`);
        }
        if (typeof r.bindingId !== 'string' || !SAFE_ID_REGEX.test(r.bindingId)) {
            errors.push(`Invalid bindingId: "${r.bindingId}"`);
        }
        if (typeof r.operatorId !== 'string' || r.operatorId.trim().length === 0) {
            errors.push('operatorId cannot be empty');
        }
        if (typeof r.token !== 'string' || r.token.trim().length === 0) {
            errors.push('token cannot be empty');
        }
        if (typeof r.signatureHash !== 'string' || !/^[a-f0-9]{64}$/.test(r.signatureHash)) {
            errors.push('signatureHash must be a valid 64-char hex SHA-256 string');
        }
        if (errors.length > 0) {
            throw new GroundedPlanTaskValidationError('HumanConfirmationRecord validation failed', errors);
        }
    }
    /**
     * EN: Recursive check for prototype pollution keys.
     * VI: Kiểm tra đệ quy các khóa gây ô nhiễm prototype.
     */
    static assertNoPrototypePollution(obj, errors, path, depth = 0) {
        if (depth > 12)
            return; // bounded depth recursion
        if (!obj || typeof obj !== 'object')
            return;
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                this.assertNoPrototypePollution(obj[i], errors, `${path}[${i}]`, depth + 1);
            }
            return;
        }
        const keys = Object.keys(obj);
        for (const key of keys) {
            if (FORBIDDEN_OBJECT_KEYS.includes(key)) {
                errors.push(`Prototype pollution key "${key}" detected at ${path}`);
            }
            this.assertNoPrototypePollution(obj[key], errors, `${path}.${key}`, depth + 1);
        }
    }
    /**
     * EN: Recursive check prohibiting Chain-of-Thought (CoT) reasoning markers.
     * VI: Kiểm tra đệ quy cấm các dấu vết suy luận Chain-of-Thought (CoT).
     */
    static assertNoForbiddenCoT(obj, errors, path, depth = 0) {
        if (depth > 12)
            return;
        if (!obj)
            return;
        if (typeof obj === 'string') {
            const lower = obj.toLowerCase();
            for (const token of FORBIDDEN_COT_TOKENS) {
                if (lower.includes(token)) {
                    errors.push(`Forbidden Chain-of-Thought marker "${token}" detected at ${path}`);
                    break;
                }
            }
            return;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                this.assertNoForbiddenCoT(obj[i], errors, `${path}[${i}]`, depth + 1);
            }
            return;
        }
        if (typeof obj === 'object') {
            for (const [k, v] of Object.entries(obj)) {
                const lowerKey = k.toLowerCase();
                for (const token of FORBIDDEN_COT_TOKENS) {
                    if (lowerKey.includes(token)) {
                        errors.push(`Forbidden Chain-of-Thought property key "${k}" detected at ${path}.${k}`);
                        break;
                    }
                }
                this.assertNoForbiddenCoT(v, errors, `${path}.${k}`, depth + 1);
            }
        }
    }
}
