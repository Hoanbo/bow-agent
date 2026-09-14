// src/core/governedExecution/executionTypes.ts
// BOWCON V4.0 — MS-1.5.09: GOVERNED EXECUTION WORKER & LEASE-BOUND ACTUATION ENGINE
// Component 1058 — REAL
//
// EN: Canonical domain contracts for Governed Execution, lease-bound actuation,
//     execution requests, authorization envelopes, execution results, and deterministic SHA-256 provenance.
// VI: Hợp đồng miền chuẩn mực cho Thực thi có Quản trị, bộ truyền động ràng buộc hợp đồng thuê,
//     yêu cầu thực thi, phong bì ủy quyền, kết quả thực thi và provenance mật mã SHA-256.

import crypto from 'node:crypto';
import type { GroundedPlanRiskLevel } from '../groundedPlanning/groundedPlanTypes.js';
import type { GroundedPlanTaskBinding, GroundedPlanTaskStepBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask, TaskStep } from '../taskLifecycle/agentTaskTypes.js';

export const GOVERNED_EXECUTION_SCHEMA_VERSION = '1.0.0';
export const DEFAULT_EXECUTION_LEASE_TTL_MS = 60 * 1000; // 60 seconds
export const MAX_EXECUTION_PAYLOAD_BYTES = 256 * 1024; // 256 KB

/**
 * EN: Explicit execution lifecycle state.
 * VI: Trạng thái vòng đời thực thi tường minh.
 */
export type GovernedExecutionState =
  | 'REQUESTED'
  | 'AUTHORIZATION_VERIFIED'
  | 'LEASE_ACQUIRED'
  | 'EXECUTING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'DENIED'
  | 'EXPIRED'
  | 'PREEMPTED'
  | 'CANCELLED'
  | 'INVALIDATED';

/**
 * EN: Execution outcome classifications.
 * VI: Phân loại kết quả thực thi.
 */
export type GovernedExecutionOutcome =
  | 'SUCCESS'
  | 'FAILURE'
  | 'AUTHORIZATION_DENIED'
  | 'LEASE_EXPIRED'
  | 'USER_STOP_PREEMPTED'
  | 'CONCURRENCY_CONFLICT'
  | 'VALIDATION_FAILED'
  | 'ADAPTER_ERROR';

/**
 * EN: Registered typed operation kind.
 * VI: Loại thao tác định kiểu đã đăng ký.
 */
export type ExecutionOperationKind =
  | 'INSPECT_ELEMENT'
  | 'READ_STATE'
  | 'VERIFY_ASSERTION'
  | 'SIMULATE_INTERACTION'
  | 'EXECUTE_GOVERNED_ACTION'
  | 'CUSTOM_REGISTERED';

/**
 * EN: Strongly typed execution operation specification.
 * VI: Đặc tả thao tác thực thi định kiểu chặt chẽ.
 */
export interface ExecutionOperation {
  readonly kind: ExecutionOperationKind;
  readonly operationName: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly timeoutMs?: number;
}

/**
 * EN: Cryptographically signed, time-bounded execution lease.
 * VI: Hợp đồng thuê thực thi có giới hạn thời gian, được ký mật mã.
 */
export interface ExecutionLease {
  readonly leaseId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly stepId: string;
  readonly stepIndex: number;
  readonly operationKind: ExecutionOperationKind;
  readonly riskLevel: GroundedPlanRiskLevel;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly nonce: string;
  readonly singleUse: boolean;
  readonly isConsumed: boolean;
  readonly consumedAt?: string;
  readonly signatureHash: string;
  readonly version: number;
}

/**
 * EN: Complete verified authorization chain envelope.
 * VI: Phong bì chuỗi ủy quyền đã xác minh hoàn chỉnh.
 */
export interface ExecutionAuthorizationEnvelope {
  readonly authorizationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly bindingId: string;
  readonly sourcePlanId: string;
  readonly sourcePlanProvenanceHash: string;
  readonly bindingProvenanceHash: string;
  readonly taskId: string;
  readonly taskProvenanceHash: string;
  readonly stepId: string;
  readonly stepProvenanceHash: string;
  readonly riskLevel: GroundedPlanRiskLevel;
  readonly requiresHumanConfirmation: boolean;
  readonly humanConfirmationSignature?: string;
  readonly pdpVerdict: 'PERMIT' | 'DENY' | 'REQUIRES_CONFIRMATION';
  readonly pepLeaseId: string;
  readonly verifiedAt: string;
  readonly authorizationHash: string;
}

/**
 * EN: Governed execution request submitted to ExecutionWorker.
 * VI: Yêu cầu thực thi có quản trị gửi tới ExecutionWorker.
 */
export interface GovernedExecutionRequest {
  readonly requestId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly stepId: string;
  readonly stepIndex: number;
  readonly operation: ExecutionOperation;
  readonly authorization: ExecutionAuthorizationEnvelope;
  readonly lease: ExecutionLease;
  readonly bindingSnapshot: GroundedPlanTaskBinding;
  readonly taskSnapshot: AgentTask;
  readonly requestedAt: string;
  readonly requestHash: string;
}

export type ExecutionRequest = GovernedExecutionRequest;

/**
 * EN: Execution telemetry record for performance and audit tracking.
 * VI: Bản ghi viễn trắc thực thi phục vụ theo dõi hiệu năng và kiểm toán.
 */
export interface ExecutionTelemetry {
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMs: number;
  readonly memoryUsageBytes?: number;
  readonly retryCount: number;
}

/**
 * EN: Structured failure descriptor.
 * VI: Bộ mô tả thất bại có cấu trúc.
 */
export interface ExecutionFailure {
  readonly code: string;
  readonly message: string;
  readonly category: 'SECURITY' | 'POLICY' | 'PRECONDITION' | 'ADAPTER' | 'TIMEOUT' | 'USER_STOP' | 'SYSTEM';
  readonly recoverable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly failedAt: string;
}

/**
 * EN: Authoritative, immutable result envelope returned after execution attempt.
 * VI: Phong bì kết quả bất biến, có thẩm quyền được trả về sau nỗ lực thực thi.
 */
export interface GovernedExecutionResultEnvelope {
  readonly executionId: string;
  readonly requestId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly stepId: string;
  readonly stepIndex: number;
  readonly state: GovernedExecutionState;
  readonly outcome: GovernedExecutionOutcome;
  readonly success: boolean;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly failure?: ExecutionFailure;
  readonly telemetry: ExecutionTelemetry;
  readonly leaseId: string;
  readonly completedAt: string;
  readonly provenanceHash: string;
  readonly sessionVersion: number;
}

/**
 * EN: Execution context provided to registered execution adapters.
 * VI: Ngữ cảnh thực thi cung cấp cho các bộ chuyển đổi thực thi đã đăng ký.
 */
export interface ExecutionContext {
  readonly executionId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly stepId: string;
  readonly operation: ExecutionOperation;
  readonly riskLevel: GroundedPlanRiskLevel;
  readonly isUserStopActive: () => boolean;
}

/**
 * EN: Contract for registered typed execution adapters.
 * VI: Hợp đồng cho các bộ chuyển đổi thực thi định kiểu đã đăng ký.
 */
export interface GovernedExecutionAdapter {
  readonly adapterId: string;
  readonly supportedKinds: readonly ExecutionOperationKind[];
  execute(context: ExecutionContext): Promise<Readonly<Record<string, unknown>>>;
}

/**
 * EN: Multi-tenant persistence container for execution sessions.
 * VI: Bộ chứa lưu trữ đa bên thuê cho các phiên thực thi.
 */
export interface GovernedExecutionSessionDocument {
  readonly schemaVersion: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly sessionVersion: number;
  readonly activeLeases: readonly ExecutionLease[];
  readonly executionResults: readonly GovernedExecutionResultEnvelope[];
  readonly updatedAt: string;
  readonly documentHash: string;
}

// ============================================================================
// TYPED ERROR HIERARCHY
// PHÂN CẤP LỖI ĐỊNH KIỂU
// ============================================================================

export class GovernedExecutionError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = 'GovernedExecutionError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ExecutionValidationError extends GovernedExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('EXECUTION_VALIDATION_ERROR', message, details);
    this.name = 'ExecutionValidationError';
  }
}

export class ExecutionAuthorizationError extends GovernedExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('EXECUTION_AUTHORIZATION_ERROR', message, details);
    this.name = 'ExecutionAuthorizationError';
  }
}

export class ExecutionLeaseError extends GovernedExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('EXECUTION_LEASE_ERROR', message, details);
    this.name = 'ExecutionLeaseError';
  }
}

export class ExecutionTenantIsolationError extends GovernedExecutionError {
  constructor(requestedTenant: string, targetTenant: string) {
    super(
      'EXECUTION_TENANT_ISOLATION_ERROR',
      `Tenant access violation: requested tenant "${requestedTenant}" does not match target "${targetTenant}"`,
      { requestedTenant, targetTenant }
    );
    this.name = 'ExecutionTenantIsolationError';
  }
}

export class ExecutionSessionIsolationError extends GovernedExecutionError {
  constructor(requestedSession: string, targetSession: string) {
    super(
      'EXECUTION_SESSION_ISOLATION_ERROR',
      `Session access violation: requested session "${requestedSession}" does not match target "${targetSession}"`,
      { requestedSession, targetSession }
    );
    this.name = 'ExecutionSessionIsolationError';
  }
}

export class ExecutionConcurrencyError extends GovernedExecutionError {
  constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>) {
    super(
      'EXECUTION_CONCURRENCY_ERROR',
      `OCC CAS mismatch: expected version ${expectedVersion}, found ${actualVersion}`,
      { expectedVersion, actualVersion, ...details }
    );
    this.name = 'ExecutionConcurrencyError';
  }
}

export class ExecutionUserStopError extends GovernedExecutionError {
  constructor(checkpoint: string) {
    super('EXECUTION_USER_STOP_PREEMPTED', `Execution terminated by USER_STOP at checkpoint "${checkpoint}"`, { checkpoint });
    this.name = 'ExecutionUserStopError';
  }
}

export class ExecutionAdapterError extends GovernedExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('EXECUTION_ADAPTER_ERROR', message, details);
    this.name = 'ExecutionAdapterError';
  }
}

export class ExecutionPersistenceError extends GovernedExecutionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('EXECUTION_PERSISTENCE_ERROR', message, details);
    this.name = 'ExecutionPersistenceError';
  }
}

// ============================================================================
// DETERMINISTIC SHA-256 PROVENANCE FUNCTIONS
// CÁC HÀM PROVENANCE SHA-256 XÁC ĐỊNH
// ============================================================================

export function computeLeaseSignatureHash(lease: Omit<ExecutionLease, 'signatureHash'>): string {
  const content = JSON.stringify({
    leaseId: lease.leaseId,
    tenantId: lease.tenantId,
    sessionId: lease.sessionId,
    taskId: lease.taskId,
    stepId: lease.stepId,
    stepIndex: lease.stepIndex,
    operationKind: lease.operationKind,
    riskLevel: lease.riskLevel,
    issuedAt: lease.issuedAt,
    expiresAt: lease.expiresAt,
    nonce: lease.nonce,
    singleUse: lease.singleUse,
    isConsumed: lease.isConsumed,
    version: lease.version,
  });
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function computeAuthorizationHash(auth: Omit<ExecutionAuthorizationEnvelope, 'authorizationHash'>): string {
  const content = JSON.stringify({
    authorizationId: auth.authorizationId,
    tenantId: auth.tenantId,
    sessionId: auth.sessionId,
    bindingId: auth.bindingId,
    sourcePlanId: auth.sourcePlanId,
    sourcePlanProvenanceHash: auth.sourcePlanProvenanceHash,
    bindingProvenanceHash: auth.bindingProvenanceHash,
    taskId: auth.taskId,
    taskProvenanceHash: auth.taskProvenanceHash,
    stepId: auth.stepId,
    stepProvenanceHash: auth.stepProvenanceHash,
    riskLevel: auth.riskLevel,
    requiresHumanConfirmation: auth.requiresHumanConfirmation,
    humanConfirmationSignature: auth.humanConfirmationSignature ?? '',
    pdpVerdict: auth.pdpVerdict,
    pepLeaseId: auth.pepLeaseId,
    verifiedAt: auth.verifiedAt,
  });
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function computeRequestHash(req: Omit<ExecutionRequest, 'requestHash'>): string {
  const content = JSON.stringify({
    requestId: req.requestId,
    tenantId: req.tenantId,
    sessionId: req.sessionId,
    taskId: req.taskId,
    stepId: req.stepId,
    stepIndex: req.stepIndex,
    operation: req.operation,
    authorizationHash: req.authorization.authorizationHash,
    leaseId: req.lease.leaseId,
    bindingId: req.bindingSnapshot.bindingId,
    requestedAt: req.requestedAt,
  });
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function computeExecutionResultProvenanceHash(res: Omit<GovernedExecutionResultEnvelope, 'provenanceHash'>): string {
  const content = JSON.stringify({
    executionId: res.executionId,
    requestId: res.requestId,
    tenantId: res.tenantId,
    sessionId: res.sessionId,
    taskId: res.taskId,
    stepId: res.stepId,
    stepIndex: res.stepIndex,
    state: res.state,
    outcome: res.outcome,
    success: res.success,
    output: res.output ?? null,
    failure: res.failure ?? null,
    leaseId: res.leaseId,
    completedAt: res.completedAt,
    sessionVersion: res.sessionVersion,
  });
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

export function computeExecutionSessionDocumentHash(doc: Omit<GovernedExecutionSessionDocument, 'documentHash'>): string {
  const content = JSON.stringify({
    schemaVersion: doc.schemaVersion,
    tenantId: doc.tenantId,
    sessionId: doc.sessionId,
    sessionVersion: doc.sessionVersion,
    activeLeases: doc.activeLeases.map((l) => l.signatureHash),
    executionResults: doc.executionResults.map((r) => r.provenanceHash),
    updatedAt: doc.updatedAt,
  });
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
