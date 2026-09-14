// src/core/groundedPlanning/groundedPlanValidator.ts
// BOWCON V4.0 — MS-1.5.07: GROUNDED PLAN VALIDATOR (FAILS-CLOSED)
// Component 1039 — REAL
//
// EN: Enforces strict fails-closed validation across grounded action plans, steps,
//     payload bounds, prototype pollution attempts, and forbidden Chain-of-Thought markers.
// VI: Thực thi kiểm tra nghiêm ngặt đóng-khi-lỗi đối với kế hoạch hành động gắn kết,
//     các bước, giới hạn tải trọng, phòng thủ ô nhiễm prototype và cấm các dấu vết suy luận CoT.
import { GROUNDED_PLAN_BOUNDS, GroundedPlanValidationError, GroundedPlanCapacityError, GroundedPlanSecurityError, } from './groundedPlanTypes.js';
const VALID_INTENT_TYPES = new Set([
    'NAVIGATE',
    'INSPECT',
    'INPUT_TEXT',
    'SELECT_ELEMENT',
    'CONFIRM',
    'CANCEL',
    'CUSTOM',
]);
const VALID_RISK_LEVELS = new Set([
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
]);
const VALID_STATUSES = new Set([
    'DRAFT',
    'SYNTHESIZED',
    'VALIDATED',
    'SUBMITTED_TO_PDP',
    'REJECTED',
    'SUPERSEDED',
]);
const FORBIDDEN_COT_TAGS = Object.freeze([
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
const FORBIDDEN_OBJECT_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);
export class GroundedPlanValidator {
    /**
     * EN: Validates a complete GroundedActionPlan object fails-closed.
     * VI: Xác thực đối tượng GroundedActionPlan hoàn chỉnh theo nguyên tắc đóng-khi-lỗi.
     */
    static validatePlan(plan) {
        if (!plan || typeof plan !== 'object') {
            throw new GroundedPlanValidationError('Grounded action plan must be a non-null object', ['INVALID_PLAN_OBJECT']);
        }
        this.assertNoPrototypePollutionOrCoT(plan, 'GroundedActionPlan');
        const p = plan;
        const errors = [];
        // 1. Identifiers & Metadata (Định danh và siêu dữ liệu)
        if (typeof p.planId !== 'string' || !p.planId.trim())
            errors.push('planId must be non-empty string');
        if (typeof p.schemaVersion !== 'string' || !p.schemaVersion.trim())
            errors.push('schemaVersion must be non-empty string');
        if (typeof p.tenantId !== 'string' || !p.tenantId.trim())
            errors.push('tenantId must be non-empty string');
        if (typeof p.sessionId !== 'string' || !p.sessionId.trim())
            errors.push('sessionId must be non-empty string');
        if (typeof p.goalId !== 'string' || !p.goalId.trim())
            errors.push('goalId must be non-empty string');
        // 2. Text Bounds (Giới hạn độ dài văn bản)
        if (typeof p.title !== 'string' || !p.title.trim()) {
            errors.push('title must be non-empty string');
        }
        else if (p.title.length > GROUNDED_PLAN_BOUNDS.MAX_TITLE_LENGTH) {
            errors.push(`title exceeds maximum length of ${GROUNDED_PLAN_BOUNDS.MAX_TITLE_LENGTH}`);
        }
        if (typeof p.description !== 'string') {
            errors.push('description must be a string');
        }
        else if (p.description.length > GROUNDED_PLAN_BOUNDS.MAX_DESCRIPTION_LENGTH) {
            errors.push(`description exceeds maximum length of ${GROUNDED_PLAN_BOUNDS.MAX_DESCRIPTION_LENGTH}`);
        }
        // 3. Status & Risk (Trạng thái và mức rủi ro)
        if (typeof p.status !== 'string' || !VALID_STATUSES.has(p.status)) {
            errors.push(`Invalid plan status: '${p.status}'`);
        }
        if (typeof p.overallRiskLevel !== 'string' || !VALID_RISK_LEVELS.has(p.overallRiskLevel)) {
            errors.push(`Invalid overallRiskLevel: '${p.overallRiskLevel}'`);
        }
        // 4. Timestamps & Version (Dấu thời gian và phiên bản)
        if (typeof p.createdAt !== 'string' || isNaN(Date.parse(p.createdAt)))
            errors.push('createdAt must be valid ISO timestamp');
        if (typeof p.updatedAt !== 'string' || isNaN(Date.parse(p.updatedAt)))
            errors.push('updatedAt must be valid ISO timestamp');
        if (typeof p.planVersion !== 'number' || !Number.isInteger(p.planVersion) || p.planVersion < 1) {
            errors.push('planVersion must be positive integer >= 1');
        }
        if (typeof p.provenanceHash !== 'string' || !/^[a-f0-9]{64}$/i.test(p.provenanceHash)) {
            errors.push('provenanceHash must be valid 64-character hex SHA-256 string');
        }
        // 5. Steps Capacity & Step Validation (Dung lượng và kiểm tra từng bước)
        if (!Array.isArray(p.steps)) {
            errors.push('steps must be an array');
        }
        else {
            if (p.steps.length > GROUNDED_PLAN_BOUNDS.MAX_PLAN_STEPS) {
                throw new GroundedPlanCapacityError(p.steps.length, GROUNDED_PLAN_BOUNDS.MAX_PLAN_STEPS, 'steps');
            }
            p.steps.forEach((step, idx) => {
                try {
                    this.validateStep(step, idx);
                }
                catch (err) {
                    if (err instanceof GroundedPlanValidationError) {
                        errors.push(...err.errors.map((e) => `Step[${idx}]: ${e}`));
                    }
                    else if (err instanceof Error) {
                        errors.push(`Step[${idx}]: ${err.message}`);
                    }
                }
            });
        }
        if (errors.length > 0) {
            throw new GroundedPlanValidationError(`Grounded action plan validation failed with ${errors.length} errors`, errors);
        }
    }
    /**
     * EN: Validates a single GroundedActionStep object fails-closed.
     * VI: Xác thực một bước GroundedActionStep riêng lẻ theo nguyên tắc đóng-khi-lỗi.
     */
    static validateStep(step, expectedIndex) {
        if (!step || typeof step !== 'object') {
            throw new GroundedPlanValidationError('Step must be a non-null object', ['INVALID_STEP_OBJECT']);
        }
        this.assertNoPrototypePollutionOrCoT(step, 'GroundedActionStep');
        const s = step;
        const errors = [];
        if (typeof s.stepId !== 'string' || !s.stepId.trim())
            errors.push('stepId must be non-empty string');
        if (typeof s.stepIndex !== 'number' || !Number.isInteger(s.stepIndex) || s.stepIndex < 0) {
            errors.push('stepIndex must be non-negative integer');
        }
        else if (expectedIndex !== undefined && s.stepIndex !== expectedIndex) {
            errors.push(`stepIndex ${s.stepIndex} does not match expected position ${expectedIndex}`);
        }
        if (typeof s.intentType !== 'string' || !VALID_INTENT_TYPES.has(s.intentType)) {
            errors.push(`Invalid intentType: '${s.intentType}'`);
        }
        if (typeof s.description !== 'string' || !s.description.trim()) {
            errors.push('description must be non-empty string');
        }
        else if (s.description.length > GROUNDED_PLAN_BOUNDS.MAX_DESCRIPTION_LENGTH) {
            errors.push(`description exceeds limit of ${GROUNDED_PLAN_BOUNDS.MAX_DESCRIPTION_LENGTH}`);
        }
        if (typeof s.goalId !== 'string' || !s.goalId.trim())
            errors.push('goalId must be non-empty string');
        if (typeof s.riskLevel !== 'string' || !VALID_RISK_LEVELS.has(s.riskLevel)) {
            errors.push(`Invalid riskLevel: '${s.riskLevel}'`);
        }
        // Numeric confidence [0.0, 1.0] (Độ tin cậy dạng số)
        if (typeof s.stepConfidence !== 'number' ||
            isNaN(s.stepConfidence) ||
            !isFinite(s.stepConfidence) ||
            s.stepConfidence < 0.0 ||
            s.stepConfidence > 1.0) {
            errors.push('stepConfidence must be finite number in range [0.0, 1.0]');
        }
        // Preconditions & Postconditions (Điều kiện tiên quyết và hậu điều kiện)
        if (Array.isArray(s.preconditions)) {
            if (s.preconditions.length > GROUNDED_PLAN_BOUNDS.MAX_PRECONDITIONS_PER_STEP) {
                errors.push(`preconditions exceed ceiling of ${GROUNDED_PLAN_BOUNDS.MAX_PRECONDITIONS_PER_STEP}`);
            }
        }
        else {
            errors.push('preconditions must be an array');
        }
        if (Array.isArray(s.postconditions)) {
            if (s.postconditions.length > GROUNDED_PLAN_BOUNDS.MAX_POSTCONDITIONS_PER_STEP) {
                errors.push(`postconditions exceed ceiling of ${GROUNDED_PLAN_BOUNDS.MAX_POSTCONDITIONS_PER_STEP}`);
            }
        }
        else {
            errors.push('postconditions must be an array');
        }
        // Dependencies (Sự phụ thuộc giữa các bước)
        if (!Array.isArray(s.dependsOnStepIds)) {
            errors.push('dependsOnStepIds must be an array');
        }
        // Payload bounds (Giới hạn tải trọng)
        if (s.payload && typeof s.payload === 'object') {
            const keys = Object.keys(s.payload);
            if (keys.length > GROUNDED_PLAN_BOUNDS.MAX_PAYLOAD_KEYS) {
                errors.push(`payload contains ${keys.length} keys, exceeding limit of ${GROUNDED_PLAN_BOUNDS.MAX_PAYLOAD_KEYS}`);
            }
        }
        else {
            errors.push('payload must be an object');
        }
        if (typeof s.stepHash !== 'string' || !/^[a-f0-9]{64}$/i.test(s.stepHash)) {
            errors.push('stepHash must be valid 64-character hex SHA-256 string');
        }
        if (errors.length > 0) {
            throw new GroundedPlanValidationError(`Step validation failed with ${errors.length} errors`, errors);
        }
    }
    /**
     * EN: Validates a synthesis request fails-closed.
     * VI: Xác thực yêu cầu tổng hợp kế hoạch theo nguyên tắc đóng-khi-lỗi.
     */
    static validateSynthesisRequest(req) {
        if (!req || typeof req !== 'object') {
            throw new GroundedPlanValidationError('Synthesis request must be a non-null object', ['INVALID_SYNTHESIS_REQUEST']);
        }
        this.assertNoPrototypePollutionOrCoT(req, 'GroundedPlanSynthesisRequest');
        const r = req;
        const errors = [];
        if (typeof r.tenantId !== 'string' || !r.tenantId.trim())
            errors.push('tenantId must be non-empty string');
        if (typeof r.sessionId !== 'string' || !r.sessionId.trim())
            errors.push('sessionId must be non-empty string');
        if (!r.goal || typeof r.goal !== 'object')
            errors.push('goal object is required');
        if (r.intentType !== undefined) {
            if (typeof r.intentType !== 'string' || !VALID_INTENT_TYPES.has(r.intentType)) {
                errors.push(`Invalid intentType: '${r.intentType}'`);
            }
        }
        if (r.minConfidenceThreshold !== undefined) {
            if (typeof r.minConfidenceThreshold !== 'number' ||
                isNaN(r.minConfidenceThreshold) ||
                !isFinite(r.minConfidenceThreshold) ||
                r.minConfidenceThreshold < 0.0 ||
                r.minConfidenceThreshold > 1.0) {
                errors.push('minConfidenceThreshold must be finite number in range [0.0, 1.0]');
            }
        }
        if (errors.length > 0) {
            throw new GroundedPlanValidationError(`Synthesis request validation failed with ${errors.length} errors`, errors);
        }
    }
    /**
     * EN: Recursive defense against prototype pollution and forbidden Chain-of-Thought (CoT) markers.
     * VI: Phòng thủ đệ quy ngăn ô nhiễm prototype và các token suy luận CoT bị cấm.
     */
    static assertNoPrototypePollutionOrCoT(obj, context, depth = 0) {
        if (!obj || typeof obj !== 'object' || depth > 10)
            return;
        if (Array.isArray(obj)) {
            for (const item of obj) {
                this.assertNoPrototypePollutionOrCoT(item, context, depth + 1);
            }
            return;
        }
        const rec = obj;
        for (const key of Object.keys(rec)) {
            if (FORBIDDEN_OBJECT_KEYS.includes(key)) {
                throw new GroundedPlanSecurityError(`Prototype pollution key '${key}' detected in ${context}`, { key, context });
            }
            const val = rec[key];
            if (typeof val === 'string') {
                const valLower = val.toLowerCase();
                for (const forbiddenTag of FORBIDDEN_COT_TAGS) {
                    if (valLower.includes(forbiddenTag)) {
                        throw new GroundedPlanSecurityError(`Forbidden Chain-of-Thought (CoT) marker '${forbiddenTag}' detected in ${context} field '${key}'`, { forbiddenTag, key, context });
                    }
                }
            }
            else if (typeof val === 'object' && val !== null) {
                this.assertNoPrototypePollutionOrCoT(val, `${context}.${key}`, depth + 1);
            }
        }
    }
}
