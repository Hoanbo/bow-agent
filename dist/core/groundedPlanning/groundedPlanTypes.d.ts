import type { VisualElement } from '../vision/visionTypes.js';
import type { GovernedGoal } from '../goal/goalTypes.js';
import type { DeliberationHypothesis } from '../deliberation/deliberationTypes.js';
/**
 * EN: Bounded constants and architectural limits for grounded action plans.
 * VI: Các hằng số và giới hạn kiến trúc cho kế hoạch hành động gắn kết.
 */
export declare const GROUNDED_PLAN_BOUNDS: Readonly<{
    MAX_PLAN_STEPS: 10;
    MAX_PRECONDITIONS_PER_STEP: 5;
    MAX_POSTCONDITIONS_PER_STEP: 5;
    MAX_DEPENDENCY_DEPTH: 8;
    MAX_PLAN_BYTES: number;
    MAX_PAYLOAD_KEYS: 25;
    MAX_PAYLOAD_STRING_LENGTH: 2000;
    MAX_DESCRIPTION_LENGTH: 1000;
    MAX_TITLE_LENGTH: 200;
    AMBIGUITY_CONFIRMATION_THRESHOLD: 0.85;
}>;
export declare const GROUNDED_PLAN_SCHEMA_VERSION = "4.0.0-MS-1.5.07";
/**
 * EN: High-level intention types for a plan step. Advisory only; no direct execution.
 * VI: Các loại ý định mức cao cho một bước kế hoạch. Chỉ mang tính cố vấn; không thực thi trực tiếp.
 */
export type GroundedPlanIntentType = 'NAVIGATE' | 'INSPECT' | 'INPUT_TEXT' | 'SELECT_ELEMENT' | 'CONFIRM' | 'CANCEL' | 'CUSTOM';
/**
 * EN: Multi-dimensional risk levels for safety classification.
 * VI: Các mức rủi ro đa chiều cho phân loại an toàn.
 */
export type GroundedPlanRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/**
 * EN: Governed lifecycle statuses for a GroundedActionPlan.
 * VI: Các trạng thái vòng đời có kiểm soát cho một GroundedActionPlan.
 */
export type GroundedPlanStatus = 'DRAFT' | 'SYNTHESIZED' | 'VALIDATED' | 'SUBMITTED_TO_PDP' | 'REJECTED' | 'SUPERSEDED';
/**
 * EN: An individual step within a synthesized grounded action plan.
 * VI: Một bước riêng lẻ bên trong kế hoạch hành động gắn kết đã tổng hợp.
 */
export interface GroundedActionStep {
    readonly stepId: string;
    readonly stepIndex: number;
    readonly intentType: GroundedPlanIntentType;
    readonly description: string;
    readonly targetElementId?: string;
    readonly targetElementHash?: string;
    readonly goalId: string;
    readonly hypothesisId?: string;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly dependsOnStepIds: readonly string[];
    readonly preconditions: readonly string[];
    readonly postconditions: readonly string[];
    readonly riskLevel: GroundedPlanRiskLevel;
    readonly stepConfidence: number;
    readonly isQuarantinedText: boolean;
    readonly visualProvenanceHash?: string;
    readonly stepHash: string;
}
/**
 * EN: Complete grounded action plan domain entity.
 * VI: Thực thể miền kế hoạch hành động gắn kết hoàn chỉnh.
 */
export interface GroundedActionPlan {
    readonly planId: string;
    readonly schemaVersion: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly goalId: string;
    readonly hypothesisId?: string;
    readonly title: string;
    readonly description: string;
    readonly status: GroundedPlanStatus;
    readonly steps: readonly GroundedActionStep[];
    readonly overallRiskLevel: GroundedPlanRiskLevel;
    readonly requiresHumanConfirmation: boolean;
    readonly rationale: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly planVersion: number;
    readonly provenanceHash: string;
}
/**
 * EN: Input request payload to synthesize a grounded action plan.
 * VI: Tải trọng yêu cầu đầu vào để tổng hợp một kế hoạch hành động gắn kết.
 */
export interface GroundedPlanSynthesisRequest {
    readonly tenantId: string;
    readonly sessionId: string;
    readonly goal: GovernedGoal;
    readonly hypothesis?: DeliberationHypothesis;
    readonly targetElement?: VisualElement;
    readonly rawObservedText?: string;
    readonly isQuarantinedText?: boolean;
    readonly intentType?: GroundedPlanIntentType;
    readonly description?: string;
    readonly payload?: Record<string, unknown>;
    readonly proposedPreconditions?: readonly string[];
    readonly proposedPostconditions?: readonly string[];
    readonly minConfidenceThreshold?: number;
}
/**
 * EN: Persisted session document container for multi-tenant storage.
 * VI: Bộ chứa tài liệu phiên lưu trữ bền vững cho kho lưu đa bên thuê.
 */
export interface GroundedPlanSessionDocument {
    readonly schemaVersion: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly sessionVersion: number;
    readonly plans: readonly GroundedActionPlan[];
    readonly updatedAt: string;
    readonly provenanceHash: string;
}
export declare class GroundedPlanError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanValidationError extends GroundedPlanError {
    readonly errors: readonly string[];
    constructor(message: string, errors?: string[], details?: Record<string, unknown>);
}
export declare class GroundedPlanCapacityError extends GroundedPlanError {
    constructor(current: number, max: number, entity?: string);
}
export declare class GroundedPlanSecurityError extends GroundedPlanError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanUserStopError extends GroundedPlanError {
    constructor(checkpoint: string);
}
export declare class CrossTenantGroundedPlanError extends GroundedPlanError {
    constructor(requestedTenant: string, activeTenant: string);
}
export declare class GroundedPlanConcurrencyError extends GroundedPlanError {
    constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>);
}
export declare class GroundedPlanIntegrityError extends GroundedPlanError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GroundedPlanCycleError extends GroundedPlanError {
    constructor(cyclePath: readonly string[]);
}
export declare class GroundedPlanPersistenceError extends GroundedPlanError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * EN: Computes deterministic step ID: step_<sha256(planId:index:intent)[0..15]>.
 * VI: Tính toán ID bước tất định: step_<sha256(planId:index:intent)[0..15]>.
 */
export declare function computeDeterministicStepId(planId: string, stepIndex: number, intentType: GroundedPlanIntentType): string;
/**
 * EN: Computes deterministic SHA-256 hash of a single GroundedActionStep.
 * VI: Tính toán mã băm SHA-256 tất định cho một GroundedActionStep riêng lẻ.
 */
export declare function computeStepHash(step: Omit<GroundedActionStep, 'stepHash'>): string;
/**
 * EN: Computes deterministic SHA-256 provenance hash of an entire GroundedActionPlan.
 * VI: Tính toán mã băm nguồn gốc SHA-256 tất định cho toàn bộ GroundedActionPlan.
 */
export declare function computePlanProvenanceHash(plan: Omit<GroundedActionPlan, 'provenanceHash'>): string;
/**
 * EN: Computes deterministic SHA-256 provenance hash for GroundedPlanSessionDocument.
 * VI: Tính toán mã băm nguồn gốc SHA-256 tất định cho GroundedPlanSessionDocument.
 */
export declare function computePlanSessionDocumentHash(doc: Omit<GroundedPlanSessionDocument, 'provenanceHash'>): string;
