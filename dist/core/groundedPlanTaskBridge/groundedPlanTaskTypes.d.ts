import type { GroundedPlanRiskLevel } from '../groundedPlanning/groundedPlanTypes.js';
import type { CreateAgentTaskOptions, CreateTaskStepOptions } from '../taskLifecycle/agentTaskTypes.js';
import type { PlanPolicyEvaluationResult } from '../groundedPlanning/groundedPlanPDPBridge.js';
export declare const MAX_PLAN_TASK_STEPS = 10;
export declare const MAX_PRECONDITIONS_PER_STEP = 5;
export declare const HUMAN_TOKEN_TTL_MS: number;
export declare const GROUNDED_PLAN_TASK_SCHEMA_VERSION = "1.0.0";
/**
 * EN: Governed lifecycle state machine for Grounded Plan Task Binding.
 * VI: Máy trạng thái vòng đời có quản trị cho Ràng buộc Nhiệm vụ Kế hoạch Gắn kết.
 */
export type GroundedPlanTaskLifecycleState = 'DRAFT' | 'BOUND' | 'PRECONDITIONS_VERIFIED' | 'HUMAN_CONFIRMATION_REQUIRED' | 'HUMAN_CONFIRMED' | 'PDP_APPROVED' | 'PEP_READY' | 'TASK_SUBMITTED' | 'HANDOFF_READY' | 'DENIED' | 'REJECTED' | 'CANCELLED' | 'PREEMPTED' | 'INVALIDATED';
/**
 * EN: Precondition verification evaluation status.
 * VI: Trạng thái đánh giá xác minh tiền điều kiện.
 */
export type PreconditionVerificationStatus = 'SATISFIED' | 'FAILED' | 'UNKNOWN';
/**
 * EN: Precondition verification evaluation result.
 * VI: Kết quả đánh giá xác minh tiền điều kiện.
 */
export interface PreconditionVerificationResult {
    readonly precondition: string;
    readonly status: PreconditionVerificationStatus;
    readonly satisfied: boolean;
    readonly reason: string;
    readonly evaluatedAt: string;
    readonly evidence?: Readonly<Record<string, unknown>>;
}
/**
 * EN: Human confirmation request envelope.
 * VI: Phong bì yêu cầu xác nhận từ con người.
 */
export interface HumanConfirmationRequest {
    readonly requestId: string;
    readonly bindingId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly planId: string;
    readonly planProvenanceHash: string;
    readonly riskLevel: GroundedPlanRiskLevel;
    readonly sensitiveActionsSummary: readonly string[];
    readonly requestedAt: string;
    readonly expiresAt: string;
}
/**
 * EN: Immutable record of genuine human operator confirmation.
 * VI: Bản ghi bất biến về sự xác nhận chính thức từ người vận hành con người.
 */
export interface HumanConfirmationRecord {
    readonly confirmationId: string;
    readonly bindingId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly planId: string;
    readonly planProvenanceHash: string;
    readonly operatorId: string;
    readonly token: string;
    readonly confirmedAt: string;
    readonly expiresAt: string;
    readonly signatureHash: string;
}
/**
 * EN: PEP execution-readiness declaration envelope.
 * VI: Phong bì khai báo tính sẵn sàng thực thi của PEP.
 */
export interface PEPReadinessRecord {
    readonly readinessId: string;
    readonly bindingId: string;
    readonly tenantId: string;
    readonly allPermitted: boolean;
    readonly requiresApproval: boolean;
    readonly preparedLeaseId?: string;
    readonly policySummary: string;
    readonly evaluatedAt: string;
}
/**
 * EN: Step-level task binding mapping between GroundedActionStep and TaskStep.
 * VI: Ánh xạ ràng buộc nhiệm vụ cấp bước giữa GroundedActionStep và TaskStep.
 */
export interface GroundedPlanTaskStepBinding {
    readonly stepBindingId: string;
    readonly sourceStepId: string;
    readonly stepIndex: number;
    readonly taskStepOptions: CreateTaskStepOptions;
    readonly preconditions: readonly string[];
    readonly preconditionResults: readonly PreconditionVerificationResult[];
    readonly riskLevel: GroundedPlanRiskLevel;
    readonly requiresApproval: boolean;
    readonly isQuarantinedText: boolean;
    readonly stepProvenanceHash: string;
}
/**
 * EN: Authoritative Plan-to-Task binding envelope.
 * VI: Phong bì ràng buộc Kế hoạch sang Nhiệm vụ có thẩm quyền.
 */
export interface GroundedPlanTaskBinding {
    readonly bindingId: string;
    readonly schemaVersion: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly sourcePlanId: string;
    readonly sourcePlanVersion: number;
    readonly sourcePlanProvenanceHash: string;
    readonly taskSpecification: CreateAgentTaskOptions;
    readonly stepBindings: readonly GroundedPlanTaskStepBinding[];
    readonly preconditionResults: readonly PreconditionVerificationResult[];
    readonly riskLevel: GroundedPlanRiskLevel;
    readonly requiresHumanConfirmation: boolean;
    readonly humanConfirmation?: HumanConfirmationRecord;
    readonly pdpDecision?: PlanPolicyEvaluationResult;
    readonly pepReadiness?: PEPReadinessRecord;
    readonly agentTaskId?: string;
    readonly lifecycleState: GroundedPlanTaskLifecycleState;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly sessionVersion: number;
    readonly provenanceHash: string;
}
/**
 * EN: Multi-tenant session storage document container.
 * VI: Bộ chứa tài liệu lưu trữ phiên đa bên thuê.
 */
export interface GroundedPlanTaskSessionDocument {
    readonly schemaVersion: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly sessionVersion: number;
    readonly bindings: readonly GroundedPlanTaskBinding[];
    readonly activeBindingId?: string;
    readonly updatedAt: string;
    readonly documentHash: string;
}
export declare class GroundedPlanTaskError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanTaskValidationError extends GroundedPlanTaskError {
    readonly validationErrors: readonly string[];
    constructor(message: string, errors?: string[], details?: Record<string, unknown>);
}
export declare class GroundedPlanTaskPreconditionError extends GroundedPlanTaskError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanTaskHumanConfirmationError extends GroundedPlanTaskError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanTaskPDPError extends GroundedPlanTaskError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanTaskPEPError extends GroundedPlanTaskError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanTaskLifecycleError extends GroundedPlanTaskError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanTaskUserStopError extends GroundedPlanTaskError {
    constructor(checkpoint: string);
}
export declare class GroundedPlanTaskTenantIsolationError extends GroundedPlanTaskError {
    constructor(requestedTenant: string, activeTenant: string);
}
export declare class GroundedPlanTaskSessionIsolationError extends GroundedPlanTaskError {
    constructor(requestedSession: string, activeSession: string);
}
export declare class GroundedPlanTaskConcurrencyError extends GroundedPlanTaskError {
    constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>);
}
export declare class GroundedPlanTaskProvenanceError extends GroundedPlanTaskError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanTaskRecoveryError extends GroundedPlanTaskError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare function computeStepBindingHash(step: Omit<GroundedPlanTaskStepBinding, 'stepProvenanceHash'>): string;
export declare function computeHumanConfirmationSignature(rec: Omit<HumanConfirmationRecord, 'signatureHash'>): string;
export declare function computeBindingProvenanceHash(binding: Omit<GroundedPlanTaskBinding, 'provenanceHash'>): string;
export declare function computeTaskBindingSessionHash(doc: Omit<GroundedPlanTaskSessionDocument, 'documentHash'>): string;
