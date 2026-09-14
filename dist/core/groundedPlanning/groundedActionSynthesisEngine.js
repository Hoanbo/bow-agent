// src/core/groundedPlanning/groundedActionSynthesisEngine.ts
// BOWCON V4.0 — MS-1.5.07: GROUNDED ACTION SYNTHESIS ENGINE
// Component 1040 — REAL
//
// EN: Synthesizes multi-modal cognitive state (deliberated hypotheses, priority goals,
//     visually grounded elements) into structured, advisory GroundedActionPlans with zero execution authority.
// VI: Tổng hợp trạng thái nhận thức đa phương thức (giả thuyết cân nhắc, mục tiêu ưu tiên,
//     phần tử thị giác gắn kết) thành các Kế hoạch Hành động Gắn kết có cấu trúc, chỉ mang tính cố vấn và không có quyền thực thi.
import crypto from 'node:crypto';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { GROUNDED_PLAN_BOUNDS, GROUNDED_PLAN_SCHEMA_VERSION, GroundedPlanUserStopError, computeDeterministicStepId, computeStepHash, computePlanProvenanceHash, } from './groundedPlanTypes.js';
import { GroundedPlanValidator } from './groundedPlanValidator.js';
import { PlanDependencyGraphEngine } from './planDependencyGraphEngine.js';
import { PlanRiskAssessmentEngine } from './planRiskAssessmentEngine.js';
export class GroundedActionSynthesisEngine {
    userStopProvider;
    defaultMinConfidence;
    constructor(options) {
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this.defaultMinConfidence = options?.defaultMinConfidence ?? 0.70;
    }
    /**
     * EN: Synthesizes a grounded action plan from multi-modal inputs.
     * VI: Tổng hợp kế hoạch hành động gắn kết từ các đầu vào đa phương thức.
     */
    synthesizePlan(request, options) {
        // 1. Synchronous USER_STOP Preemption Gate (Cổng kiểm tra quyền dừng khẩn cấp đồng bộ)
        if (this.userStopProvider()) {
            throw new GroundedPlanUserStopError('grounded_action_synthesis_entry');
        }
        // 2. Strict Request Validation (Kiểm tra nghiêm ngặt yêu cầu đầu vào)
        GroundedPlanValidator.validateSynthesisRequest(request);
        const planId = `plan_${crypto
            .createHash('sha256')
            .update(`${request.tenantId}:${request.sessionId}:${request.goal.goalId}:${Date.now()}`, 'utf8')
            .digest('hex')
            .slice(0, 16)}`;
        // 3. Build Steps (Xây dựng các bước hành động)
        const rawSteps = [];
        const intentType = request.intentType ?? 'INSPECT';
        // Primary Step derived from Goal & Grounded Target (Bước chính rút ra từ Mục tiêu & Phần tử thị giác)
        const primaryDesc = request.description ?? `Perform ${intentType} on ${request.targetElement ? request.targetElement.regionType : 'target'} for goal: ${request.goal.title}`;
        const sanitizedDesc = globalDiagnosisSanitizer.sanitize(primaryDesc);
        // Sanitize payload (Làm sạch tải trọng chứa dữ liệu)
        const sanitizedPayload = {};
        if (request.payload) {
            for (const [k, v] of Object.entries(request.payload)) {
                sanitizedPayload[k] = typeof v === 'string' ? globalDiagnosisSanitizer.sanitize(v) : v;
            }
        }
        const isQuarantined = Boolean(request.isQuarantinedText);
        const confidence = request.targetElement ? request.targetElement.detectionConfidence : 0.90;
        const stepId0 = computeDeterministicStepId(planId, 0, intentType);
        const stepRisk0 = PlanRiskAssessmentEngine.classifyStepRisk(intentType, sanitizedPayload, isQuarantined);
        const step0Draft = {
            stepId: stepId0,
            stepIndex: 0,
            intentType,
            description: sanitizedDesc,
            targetElementId: request.targetElement?.elementId,
            targetElementHash: request.targetElement?.visualProvenanceHash,
            goalId: request.goal.goalId,
            hypothesisId: request.hypothesis?.hypothesisId,
            payload: Object.freeze(sanitizedPayload),
            dependsOnStepIds: Object.freeze([]),
            preconditions: Object.freeze(request.proposedPreconditions ?? ['PRE_SYSTEM_ONLINE']),
            postconditions: Object.freeze(request.proposedPostconditions ?? ['POST_OBSERVATION_COLLECTED']),
            riskLevel: stepRisk0,
            stepConfidence: confidence,
            isQuarantinedText: isQuarantined,
            visualProvenanceHash: request.targetElement?.visualProvenanceHash,
        };
        rawSteps.push(Object.freeze({
            ...step0Draft,
            stepHash: computeStepHash(step0Draft),
        }));
        // Additional steps if supplied (Các bước bổ sung nếu được cung cấp)
        if (options?.additionalSteps) {
            options.additionalSteps.forEach((extra, idx) => {
                const stepIdx = idx + 1;
                const sId = computeDeterministicStepId(planId, stepIdx, extra.intentType);
                const sRisk = PlanRiskAssessmentEngine.classifyStepRisk(extra.intentType, extra.payload, extra.isQuarantinedText);
                const sDraft = {
                    stepId: sId,
                    stepIndex: stepIdx,
                    intentType: extra.intentType,
                    description: globalDiagnosisSanitizer.sanitize(extra.description),
                    targetElementId: extra.targetElementId,
                    targetElementHash: extra.targetElementHash,
                    goalId: extra.goalId,
                    hypothesisId: extra.hypothesisId,
                    payload: Object.freeze({ ...extra.payload }),
                    dependsOnStepIds: Object.freeze([...extra.dependsOnStepIds]),
                    preconditions: Object.freeze([...extra.preconditions]),
                    postconditions: Object.freeze([...extra.postconditions]),
                    riskLevel: sRisk,
                    stepConfidence: extra.stepConfidence,
                    isQuarantinedText: extra.isQuarantinedText,
                    visualProvenanceHash: extra.visualProvenanceHash,
                };
                rawSteps.push(Object.freeze({
                    ...sDraft,
                    stepHash: computeStepHash(sDraft),
                }));
            });
        }
        // 4. DAG & Dependency Validation (Xác thực cấu trúc đồ thị phụ thuộc DAG)
        PlanDependencyGraphEngine.validateAndSort(rawSteps);
        // 5. Overall Risk & Human Confirmation Assessment (Đánh giá mức rủi ro chung & xác nhận từ con người)
        const overallRisk = PlanRiskAssessmentEngine.calculateOverallRisk(rawSteps);
        const requiresConfirmation = overallRisk === 'HIGH' ||
            overallRisk === 'CRITICAL' ||
            isQuarantined ||
            confidence < GROUNDED_PLAN_BOUNDS.AMBIGUITY_CONFIRMATION_THRESHOLD;
        const now = new Date().toISOString();
        const planDraft = {
            planId,
            schemaVersion: GROUNDED_PLAN_SCHEMA_VERSION,
            tenantId: request.tenantId,
            sessionId: request.sessionId,
            goalId: request.goal.goalId,
            hypothesisId: request.hypothesis?.hypothesisId,
            title: globalDiagnosisSanitizer.sanitize(`Grounded Action Plan for Goal: ${request.goal.title}`),
            description: sanitizedDesc,
            status: 'SYNTHESIZED',
            steps: Object.freeze(rawSteps),
            overallRiskLevel: overallRisk,
            requiresHumanConfirmation: requiresConfirmation,
            rationale: globalDiagnosisSanitizer.sanitize(`Synthesized from goal '${request.goal.title}' with confidence ${confidence}`),
            createdAt: now,
            updatedAt: now,
            planVersion: 1,
        };
        const provenanceHash = computePlanProvenanceHash(planDraft);
        const finalPlan = Object.freeze({
            ...planDraft,
            provenanceHash,
        });
        GroundedPlanValidator.validatePlan(finalPlan);
        return finalPlan;
    }
}
