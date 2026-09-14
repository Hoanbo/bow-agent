// src/core/groundedPlanning/groundedPlanTypes.ts
// BOWCON V4.0 — MS-1.5.07: NATIVE GROUNDED ACTION PLAN SYNTHESIS & GOVERNED PROPOSAL ENGINE
// Component 1038 — REAL
//
// EN: Canonical domain ontology, bounded parameters, typed error taxonomy,
//     and deterministic SHA-256 provenance functions for grounded action planning.
// VI: Bản thể học miền chuẩn, các tham số có giới hạn, phân loại lỗi có kiểu,
//     và các hàm băm nguồn gốc SHA-256 tất định cho việc lập kế hoạch hành động gắn kết thực tế.

import crypto from 'node:crypto';
import type { VisualElement } from '../vision/visionTypes.js';
import type { GovernedGoal } from '../goal/goalTypes.js';
import type { DeliberationHypothesis } from '../deliberation/deliberationTypes.js';

/**
 * EN: Bounded constants and architectural limits for grounded action plans.
 * VI: Các hằng số và giới hạn kiến trúc cho kế hoạch hành động gắn kết.
 */
export const GROUNDED_PLAN_BOUNDS = Object.freeze({
  MAX_PLAN_STEPS: 10,
  MAX_PRECONDITIONS_PER_STEP: 5,
  MAX_POSTCONDITIONS_PER_STEP: 5,
  MAX_DEPENDENCY_DEPTH: 8,
  MAX_PLAN_BYTES: 512 * 1024, // 512 KB
  MAX_PAYLOAD_KEYS: 25,
  MAX_PAYLOAD_STRING_LENGTH: 2000,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_TITLE_LENGTH: 200,
  AMBIGUITY_CONFIRMATION_THRESHOLD: 0.85,
});

export const GROUNDED_PLAN_SCHEMA_VERSION = '4.0.0-MS-1.5.07';

/**
 * EN: High-level intention types for a plan step. Advisory only; no direct execution.
 * VI: Các loại ý định mức cao cho một bước kế hoạch. Chỉ mang tính cố vấn; không thực thi trực tiếp.
 */
export type GroundedPlanIntentType =
  | 'NAVIGATE'
  | 'INSPECT'
  | 'INPUT_TEXT'
  | 'SELECT_ELEMENT'
  | 'CONFIRM'
  | 'CANCEL'
  | 'CUSTOM';

/**
 * EN: Multi-dimensional risk levels for safety classification.
 * VI: Các mức rủi ro đa chiều cho phân loại an toàn.
 */
export type GroundedPlanRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * EN: Governed lifecycle statuses for a GroundedActionPlan.
 * VI: Các trạng thái vòng đời có kiểm soát cho một GroundedActionPlan.
 */
export type GroundedPlanStatus =
  | 'DRAFT'
  | 'SYNTHESIZED'
  | 'VALIDATED'
  | 'SUBMITTED_TO_PDP'
  | 'REJECTED'
  | 'SUPERSEDED';

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

// ----------------------------------------------------------------------------
// TYPED ERROR TAXONOMY
// ----------------------------------------------------------------------------

export class GroundedPlanError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GroundedPlanValidationError extends GroundedPlanError {
  public readonly errors: readonly string[];

  constructor(message: string, errors: string[] = [], details?: Record<string, unknown>) {
    super('GROUNDED_PLAN_VALIDATION_ERROR', message, { ...details, validationErrors: errors });
    this.errors = Object.freeze([...errors]);
  }
}

export class GroundedPlanCapacityError extends GroundedPlanError {
  constructor(current: number, max: number, entity = 'steps') {
    super(
      'GROUNDED_PLAN_CAPACITY_ERROR',
      `Grounded plan capacity exceeded for ${entity}: current ${current}, maximum permitted ${max}`,
      { current, max, entity }
    );
  }
}

export class GroundedPlanSecurityError extends GroundedPlanError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GROUNDED_PLAN_SECURITY_ERROR', message, details);
  }
}

export class GroundedPlanUserStopError extends GroundedPlanError {
  constructor(checkpoint: string) {
    super(
      'GROUNDED_PLAN_USER_STOP_PREEMPTED',
      `Grounded planning operation preempted by active Master Human USER_STOP at checkpoint: ${checkpoint}`,
      { checkpoint }
    );
  }
}

export class CrossTenantGroundedPlanError extends GroundedPlanError {
  constructor(requestedTenant: string, activeTenant: string) {
    super(
      'CROSS_TENANT_GROUNDED_PLAN_REJECTED',
      `Cross-tenant access rejected: attempted to operate on tenant '${requestedTenant}' within active partition '${activeTenant}'`,
      { requestedTenant, activeTenant }
    );
  }
}

export class GroundedPlanConcurrencyError extends GroundedPlanError {
  constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>) {
    super(
      'GROUNDED_PLAN_CONCURRENCY_ERROR',
      `Optimistic Concurrency Control (OCC) mismatch: expected planVersion ${expectedVersion}, but found ${actualVersion}`,
      { expectedVersion, actualVersion, ...details }
    );
  }
}

export class GroundedPlanIntegrityError extends GroundedPlanError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GROUNDED_PLAN_INTEGRITY_ERROR', message, details);
  }
}

export class GroundedPlanCycleError extends GroundedPlanError {
  constructor(cyclePath: readonly string[]) {
    super(
      'GROUNDED_PLAN_CYCLE_ERROR',
      `Cyclic dependency detected in grounded action plan step graph: ${cyclePath.join(' -> ')}`,
      { cyclePath }
    );
  }
}

export class GroundedPlanPersistenceError extends GroundedPlanError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GROUNDED_PLAN_PERSISTENCE_ERROR', message, details);
  }
}

// ----------------------------------------------------------------------------
// DETERMINISTIC PROVENANCE FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * EN: Computes deterministic step ID: step_<sha256(planId:index:intent)[0..15]>.
 * VI: Tính toán ID bước tất định: step_<sha256(planId:index:intent)[0..15]>.
 */
export function computeDeterministicStepId(
  planId: string,
  stepIndex: number,
  intentType: GroundedPlanIntentType
): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${planId.trim()}:${stepIndex}:${intentType}`, 'utf8')
    .digest('hex')
    .slice(0, 16);
  return `step_${hash}`;
}

/**
 * EN: Computes deterministic SHA-256 hash of a single GroundedActionStep.
 * VI: Tính toán mã băm SHA-256 tất định cho một GroundedActionStep riêng lẻ.
 */
export function computeStepHash(
  step: Omit<GroundedActionStep, 'stepHash'>
): string {
  const material = {
    stepId: step.stepId,
    stepIndex: step.stepIndex,
    intentType: step.intentType,
    description: step.description,
    targetElementId: step.targetElementId ?? null,
    targetElementHash: step.targetElementHash ?? null,
    goalId: step.goalId,
    hypothesisId: step.hypothesisId ?? null,
    payload: step.payload,
    dependsOnStepIds: [...step.dependsOnStepIds].sort(),
    preconditions: [...step.preconditions].sort(),
    postconditions: [...step.postconditions].sort(),
    riskLevel: step.riskLevel,
    stepConfidence: step.stepConfidence,
    isQuarantinedText: step.isQuarantinedText,
    visualProvenanceHash: step.visualProvenanceHash ?? null,
  };
  return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}

/**
 * EN: Computes deterministic SHA-256 provenance hash of an entire GroundedActionPlan.
 * VI: Tính toán mã băm nguồn gốc SHA-256 tất định cho toàn bộ GroundedActionPlan.
 */
export function computePlanProvenanceHash(
  plan: Omit<GroundedActionPlan, 'provenanceHash'>
): string {
  const material = {
    planId: plan.planId,
    schemaVersion: plan.schemaVersion,
    tenantId: plan.tenantId,
    sessionId: plan.sessionId,
    goalId: plan.goalId,
    hypothesisId: plan.hypothesisId ?? null,
    title: plan.title,
    description: plan.description,
    status: plan.status,
    stepHashes: plan.steps.map((s) => `${s.stepId}:${s.stepHash}`),
    overallRiskLevel: plan.overallRiskLevel,
    requiresHumanConfirmation: plan.requiresHumanConfirmation,
    rationale: plan.rationale,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    planVersion: plan.planVersion,
  };
  return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}

/**
 * EN: Computes deterministic SHA-256 provenance hash for GroundedPlanSessionDocument.
 * VI: Tính toán mã băm nguồn gốc SHA-256 tất định cho GroundedPlanSessionDocument.
 */
export function computePlanSessionDocumentHash(
  doc: Omit<GroundedPlanSessionDocument, 'provenanceHash'>
): string {
  const material = {
    schemaVersion: doc.schemaVersion,
    tenantId: doc.tenantId,
    sessionId: doc.sessionId,
    sessionVersion: doc.sessionVersion,
    planHashes: doc.plans.map((p) => p.provenanceHash).sort(),
    updatedAt: doc.updatedAt,
  };
  return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}
