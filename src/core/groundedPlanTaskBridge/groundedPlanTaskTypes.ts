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
import type { GroundedPlanRiskLevel } from '../groundedPlanning/groundedPlanTypes.js';
import type { CreateAgentTaskOptions, CreateTaskStepOptions } from '../taskLifecycle/agentTaskTypes.js';
import type { PlanPolicyEvaluationResult } from '../groundedPlanning/groundedPlanPDPBridge.js';

export const MAX_PLAN_TASK_STEPS = 10;
export const MAX_PRECONDITIONS_PER_STEP = 5;
export const HUMAN_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const GROUNDED_PLAN_TASK_SCHEMA_VERSION = '1.0.0';

/**
 * EN: Governed lifecycle state machine for Grounded Plan Task Binding.
 * VI: Máy trạng thái vòng đời có quản trị cho Ràng buộc Nhiệm vụ Kế hoạch Gắn kết.
 */
export type GroundedPlanTaskLifecycleState =
  | 'DRAFT'
  | 'BOUND'
  | 'PRECONDITIONS_VERIFIED'
  | 'HUMAN_CONFIRMATION_REQUIRED'
  | 'HUMAN_CONFIRMED'
  | 'PDP_APPROVED'
  | 'PEP_READY'
  | 'TASK_SUBMITTED'
  | 'HANDOFF_READY'
  | 'DENIED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'PREEMPTED'
  | 'INVALIDATED';

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

// ============================================================================
// TYPED ERROR TAXONOMY
// PHÂN CẤP LỖI ĐỊNH KIỂU
// ============================================================================

export class GroundedPlanTaskError extends Error {
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

export class GroundedPlanTaskValidationError extends GroundedPlanTaskError {
  public readonly validationErrors: readonly string[];

  constructor(message: string, errors: string[] = [], details?: Record<string, unknown>) {
    super('VALIDATION_FAILED', message, { ...details, errors });
    this.validationErrors = Object.freeze([...errors]);
  }
}

export class GroundedPlanTaskPreconditionError extends GroundedPlanTaskError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PRECONDITION_FAILED', message, details);
  }
}

export class GroundedPlanTaskHumanConfirmationError extends GroundedPlanTaskError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('HUMAN_CONFIRMATION_REJECTED', message, details);
  }
}

export class GroundedPlanTaskPDPError extends GroundedPlanTaskError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PDP_EVALUATION_DENIED', message, details);
  }
}

export class GroundedPlanTaskPEPError extends GroundedPlanTaskError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PEP_PREPARATION_FAILED', message, details);
  }
}

export class GroundedPlanTaskLifecycleError extends GroundedPlanTaskError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('ILLEGAL_LIFECYCLE_TRANSITION', message, details);
  }
}

export class GroundedPlanTaskUserStopError extends GroundedPlanTaskError {
  constructor(checkpoint: string) {
    super(
      'USER_STOP_PREEMPTION',
      `Operation preempted by Master Human Authority USER_STOP at checkpoint: ${checkpoint}`,
      { checkpoint }
    );
  }
}

export class GroundedPlanTaskTenantIsolationError extends GroundedPlanTaskError {
  constructor(requestedTenant: string, activeTenant: string) {
    super(
      'TENANT_ISOLATION_VIOLATION',
      `Tenant mismatch: requested "${requestedTenant}" but active partition is "${activeTenant}"`,
      { requestedTenant, activeTenant }
    );
  }
}

export class GroundedPlanTaskSessionIsolationError extends GroundedPlanTaskError {
  constructor(requestedSession: string, activeSession: string) {
    super(
      'SESSION_ISOLATION_VIOLATION',
      `Session mismatch: requested "${requestedSession}" but active is "${activeSession}"`,
      { requestedSession, activeSession }
    );
  }
}

export class GroundedPlanTaskConcurrencyError extends GroundedPlanTaskError {
  constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>) {
    super(
      'CONCURRENCY_CONFLICT',
      `OCC Conflict: expectedVersion=${expectedVersion}, actualVersion=${actualVersion}`,
      { ...details, expectedVersion, actualVersion }
    );
  }
}

export class GroundedPlanTaskProvenanceError extends GroundedPlanTaskError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROVENANCE_TAMPER_DETECTED', message, details);
  }
}

export class GroundedPlanTaskRecoveryError extends GroundedPlanTaskError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('RECOVERY_FAILED', message, details);
  }
}

// ============================================================================
// DETERMINISTIC SHA-256 PROVENANCE HELPERS
// TRỢ NĂNG PROVENANCE SHA-256 XÁC ĐỊNH
// ============================================================================

export function computeStepBindingHash(step: Omit<GroundedPlanTaskStepBinding, 'stepProvenanceHash'>): string {
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

export function computeHumanConfirmationSignature(
  rec: Omit<HumanConfirmationRecord, 'signatureHash'>
): string {
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

export function computeBindingProvenanceHash(
  binding: Omit<GroundedPlanTaskBinding, 'provenanceHash'>
): string {
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

export function computeTaskBindingSessionHash(
  doc: Omit<GroundedPlanTaskSessionDocument, 'documentHash'>
): string {
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
