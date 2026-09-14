// src/core/groundedPlanTaskBridge/groundedPlanTaskTypes.ts
// BOWCON V4.0 — MS-1.5.08: GROUNDED PLAN TASK TYPES & ONTOLOGY
// Component 1048 — REAL
//
// EN: Canonical domain contracts for Grounded Action Plan execution preparation,
//     plan-to-task structural bindings, human confirmation tokens, precondition
//     evaluations, typed errors, and deterministic SHA-256 provenance helpers.
// VI: Hợp đồng miền chuẩn mực cho việc chuẩn bị thực thi Kế hoạch Hành động Gắn kết,
//     ràng buộc cấu trúc kế hoạch sang nhiệm vụ, mã xác nhận con người, đánh giá
//     tiền điều kiện, phân cấp lỗi định kiểu và trợ năng provenance SHA-256 xác định.
import crypto from 'node:crypto';
export const MAX_PLAN_TASK_STEPS = 10;
export const MAX_PRECONDITIONS_PER_STEP = 5;
export const HUMAN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const GROUNDED_PLAN_TASK_SCHEMA_VERSION = '1.0.0';
// ============================================================================
// TYPED ERROR TAXONOMY
// PHÂN CẤP LỖI ĐỊNH KIỂU
// ============================================================================
export class GroundedPlanTaskError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class GroundedPlanTaskValidationError extends GroundedPlanTaskError {
    validationErrors;
    constructor(message, errors = [], details) {
        super('VALIDATION_FAILED', message, { ...details, errors });
        this.validationErrors = Object.freeze([...errors]);
    }
}
export class GroundedPlanTaskPreconditionError extends GroundedPlanTaskError {
    constructor(message, details) {
        super('PRECONDITION_FAILED', message, details);
    }
}
export class GroundedPlanTaskHumanConfirmationError extends GroundedPlanTaskError {
    constructor(message, details) {
        super('HUMAN_CONFIRMATION_REJECTED', message, details);
    }
}
export class GroundedPlanTaskPDPError extends GroundedPlanTaskError {
    constructor(message, details) {
        super('PDP_EVALUATION_DENIED', message, details);
    }
}
export class GroundedPlanTaskPEPError extends GroundedPlanTaskError {
    constructor(message, details) {
        super('PEP_PREPARATION_FAILED', message, details);
    }
}
export class GroundedPlanTaskLifecycleError extends GroundedPlanTaskError {
    constructor(message, details) {
        super('ILLEGAL_LIFECYCLE_TRANSITION', message, details);
    }
}
export class GroundedPlanTaskUserStopError extends GroundedPlanTaskError {
    constructor(checkpoint) {
        super('USER_STOP_PREEMPTION', `Operation preempted by Master Human Authority USER_STOP at checkpoint: ${checkpoint}`, { checkpoint });
    }
}
export class GroundedPlanTaskTenantIsolationError extends GroundedPlanTaskError {
    constructor(requestedTenant, activeTenant) {
        super('TENANT_ISOLATION_VIOLATION', `Tenant mismatch: requested "${requestedTenant}" but active partition is "${activeTenant}"`, { requestedTenant, activeTenant });
    }
}
export class GroundedPlanTaskSessionIsolationError extends GroundedPlanTaskError {
    constructor(requestedSession, activeSession) {
        super('SESSION_ISOLATION_VIOLATION', `Session mismatch: requested "${requestedSession}" but active is "${activeSession}"`, { requestedSession, activeSession });
    }
}
export class GroundedPlanTaskConcurrencyError extends GroundedPlanTaskError {
    constructor(expectedVersion, actualVersion, details) {
        super('CONCURRENCY_CONFLICT', `OCC Conflict: expectedVersion=${expectedVersion}, actualVersion=${actualVersion}`, { ...details, expectedVersion, actualVersion });
    }
}
export class GroundedPlanTaskProvenanceError extends GroundedPlanTaskError {
    constructor(message, details) {
        super('PROVENANCE_TAMPER_DETECTED', message, details);
    }
}
export class GroundedPlanTaskRecoveryError extends GroundedPlanTaskError {
    constructor(message, details) {
        super('RECOVERY_FAILED', message, details);
    }
}
// ============================================================================
// DETERMINISTIC SHA-256 PROVENANCE HELPERS
// TRỢ NĂNG PROVENANCE SHA-256 XÁC ĐỊNH
// ============================================================================
export function computeStepBindingHash(step) {
    const canonical = JSON.stringify({
        stepBindingId: step.stepBindingId,
        sourceStepId: step.sourceStepId,
        stepIndex: step.stepIndex,
        taskStepOptions: step.taskStepOptions,
        preconditions: step.preconditions,
        preconditionResults: step.preconditionResults.map(r => ({
            precondition: r.precondition,
            status: r.status,
            satisfied: r.satisfied,
            reason: r.reason,
        })),
        riskLevel: step.riskLevel,
        requiresApproval: step.requiresApproval,
        isQuarantinedText: step.isQuarantinedText,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeHumanConfirmationSignature(rec) {
    const canonical = JSON.stringify({
        confirmationId: rec.confirmationId,
        bindingId: rec.bindingId,
        tenantId: rec.tenantId,
        sessionId: rec.sessionId,
        planId: rec.planId,
        planProvenanceHash: rec.planProvenanceHash,
        operatorId: rec.operatorId,
        token: rec.token,
        confirmedAt: rec.confirmedAt,
        expiresAt: rec.expiresAt,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeBindingProvenanceHash(binding) {
    const canonical = JSON.stringify({
        bindingId: binding.bindingId,
        schemaVersion: binding.schemaVersion,
        tenantId: binding.tenantId,
        sessionId: binding.sessionId,
        sourcePlanId: binding.sourcePlanId,
        sourcePlanVersion: binding.sourcePlanVersion,
        sourcePlanProvenanceHash: binding.sourcePlanProvenanceHash,
        taskSpecification: binding.taskSpecification,
        stepBindings: binding.stepBindings.map(s => s.stepProvenanceHash),
        preconditionResults: binding.preconditionResults.map(r => ({
            precondition: r.precondition,
            status: r.status,
            satisfied: r.satisfied,
        })),
        riskLevel: binding.riskLevel,
        requiresHumanConfirmation: binding.requiresHumanConfirmation,
        humanConfirmation: binding.humanConfirmation?.signatureHash,
        pdpDecisionAllPermitted: binding.pdpDecision?.allPermitted,
        pepReadinessPermitted: binding.pepReadiness?.allPermitted,
        agentTaskId: binding.agentTaskId,
        lifecycleState: binding.lifecycleState,
        sessionVersion: binding.sessionVersion,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
export function computeTaskBindingSessionHash(doc) {
    const canonical = JSON.stringify({
        schemaVersion: doc.schemaVersion,
        tenantId: doc.tenantId,
        sessionId: doc.sessionId,
        sessionVersion: doc.sessionVersion,
        bindings: doc.bindings.map(b => b.provenanceHash),
        activeBindingId: doc.activeBindingId,
        updatedAt: doc.updatedAt,
    });
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}
