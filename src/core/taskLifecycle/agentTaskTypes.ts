// src/core/taskLifecycle/agentTaskTypes.ts
// BOWCON V4.0 — MS-1.4.01: AGENT TASK LIFECYCLE & STATE ENGINE TYPES
//
// EN:
// Authoritative type definitions for the Agent Task Lifecycle & State Engine.
// Enforces explicit 9-state task lifecycle, ordered step models, tenant-partitioned
// storage contracts, optimistic concurrency control, and cryptographic provenance.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền cho Phân hệ Vòng đời & Máy Trạng thái Nhiệm vụ Agent.
// Thực thi vòng đời nhiệm vụ 9 trạng thái tường minh, mô hình bước có thứ tự, hợp đồng
// lưu trữ phân vùng theo tenant, kiểm soát đồng thời lạc quan và provenance mật mã.

import crypto from 'node:crypto';
import type { PlanRiskLevel } from '../planning/planningTypes.js';

/**
 * EN: Canonical 9-state lifecycle for an Agent Task.
 * VI: Vòng đời 9 trạng thái chuẩn mực cho một Nhiệm vụ Agent.
 */
export type TaskState =
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'PLANNING'
  | 'EXECUTING'
  | 'AWAITING_APPROVAL'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * EN: Canonical status for an individual step within an Agent Task.
 * VI: Trạng thái chuẩn mực cho từng bước riêng lẻ trong một Nhiệm vụ Agent.
 */
export type TaskStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'AWAITING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

/**
 * EN: Immutable representation of an individual execution step within an Agent Task.
 * VI: Biểu diễn bất biến của một bước thực thi riêng lẻ trong Nhiệm vụ Agent.
 */
export interface TaskStep {
  readonly stepId: string;
  readonly stepIndex: number;
  readonly description: string;
  readonly capabilityId: string;
  readonly actionName: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly riskLevel: PlanRiskLevel;
  readonly requiresApproval: boolean;
  readonly status: TaskStepStatus;
  readonly attemptCount: number;
  readonly maxAttempts: number;
  readonly executionTokenId?: string;
  readonly executionResult?: unknown;
  readonly error?: string;
}

/**
 * EN: Authoritative, immutable Agent Task representation.
 * VI: Biểu diễn Nhiệm vụ Agent có thẩm quyền và bất biến.
 */
export interface AgentTask {
  readonly taskId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly title: string;
  readonly intent: string;
  readonly riskLevel: PlanRiskLevel;
  readonly state: TaskState;
  readonly version: number;
  readonly steps: readonly TaskStep[];
  readonly currentStepIndex: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
  readonly failureReason?: string;
  readonly recoveryReason?: string;
  readonly provenanceHash: string;
  readonly previousProvenanceHash?: string;
}

/**
 * EN: Options for creating a new TaskStep.
 * VI: Các tùy chọn để tạo mới một TaskStep.
 */
export interface CreateTaskStepOptions {
  readonly description: string;
  readonly capabilityId: string;
  readonly actionName: string;
  readonly parameters?: Readonly<Record<string, unknown>>;
  readonly riskLevel?: PlanRiskLevel;
  readonly requiresApproval?: boolean;
  readonly maxAttempts?: number;
}

/**
 * EN: Options for creating a new AgentTask.
 * VI: Các tùy chọn để tạo mới một AgentTask.
 */
export interface CreateAgentTaskOptions {
  readonly tenantId: string;
  readonly userId: string;
  readonly title: string;
  readonly intent: string;
  readonly riskLevel?: PlanRiskLevel;
  readonly steps?: readonly CreateTaskStepOptions[];
  readonly customTaskId?: string;
}

/**
 * EN: Options for transitioning a task state.
 * VI: Các tùy chọn cho việc chuyển đổi trạng thái nhiệm vụ.
 */
export interface TaskTransitionOptions {
  readonly toState: TaskState;
  readonly expectedVersion: number;
  readonly reason?: string;
  readonly failureReason?: string;
  readonly recoveryReason?: string;
}

/**
 * EN: Options for updating an individual step within a task.
 * VI: Các tùy chọn để cập nhật một bước riêng lẻ trong nhiệm vụ.
 */
export interface UpdateStepOptions {
  readonly stepIndex: number;
  readonly status: TaskStepStatus;
  readonly expectedVersion: number;
  readonly executionTokenId?: string;
  readonly executionResult?: unknown;
  readonly error?: string;
}

/**
 * EN: Input parameters for calculating cryptographic SHA-256 provenance.
 * VI: Tham số đầu vào để tính toán provenance mật mã SHA-256.
 */
export interface ProvenanceCalculationInput {
  readonly taskId: string;
  readonly tenantId: string;
  readonly state: string;
  readonly version: number;
  readonly timestamp: string;
  readonly previousHash: string;
}

/**
 * EN: Result of rehydrating tasks during startup or recovery.
 * VI: Kết quả tái lập trạng thái nhiệm vụ trong quá trình khởi động hoặc phục hồi.
 */
export interface RehydrationResult {
  readonly rehydrated: readonly AgentTask[];
  readonly recovered: readonly AgentTask[];
  readonly errors: readonly string[];
}

// ============================================================================
// ERROR CONTRACTS (Các Hợp đồng Lỗi)
// ============================================================================

export class IllegalStateTransitionError extends Error {
  public readonly fromState: TaskState;
  public readonly toState: TaskState;
  public readonly taskId?: string;

  constructor(fromState: TaskState, toState: TaskState, taskId?: string, details?: string) {
    super(
      `[ILLEGAL_TASK_TRANSITION] Cannot transition task${taskId ? ` '${taskId}'` : ''} from '${fromState}' to '${toState}'${details ? `: ${details}` : ''}`
    );
    this.name = 'IllegalStateTransitionError';
    this.fromState = fromState;
    this.toState = toState;
    this.taskId = taskId;
  }
}

export class ConcurrencyConflictError extends Error {
  public readonly taskId: string;
  public readonly currentVersion: number;
  public readonly expectedVersion: number;

  constructor(taskId: string, currentVersion: number, expectedVersion: number) {
    super(
      `[CONCURRENCY_CONFLICT] Task '${taskId}' version mismatch: expected version ${expectedVersion}, but current version is ${currentVersion}`
    );
    this.name = 'ConcurrencyConflictError';
    this.taskId = taskId;
    this.currentVersion = currentVersion;
    this.expectedVersion = expectedVersion;
  }
}

export class CrossTenantAccessViolationError extends Error {
  public readonly requestedTenantId: string;
  public readonly actualTenantId: string;
  public readonly taskId: string;

  constructor(requestedTenantId: string, actualTenantId: string, taskId: string) {
    super(
      `[CROSS_TENANT_ACCESS_VIOLATION] Access denied: tenant '${requestedTenantId}' attempted to access task '${taskId}' belonging to tenant '${actualTenantId}'`
    );
    this.name = 'CrossTenantAccessViolationError';
    this.requestedTenantId = requestedTenantId;
    this.actualTenantId = actualTenantId;
    this.taskId = taskId;
  }
}

export class ProvenanceTamperError extends Error {
  public readonly taskId: string;
  public readonly calculatedHash: string;
  public readonly recordedHash: string;

  constructor(taskId: string, calculatedHash: string, recordedHash: string) {
    super(
      `[PROVENANCE_TAMPER_DETECTED] Task '${taskId}' provenance integrity check failed: calculated hash '${calculatedHash}' != recorded hash '${recordedHash}'`
    );
    this.name = 'ProvenanceTamperError';
    this.taskId = taskId;
    this.calculatedHash = calculatedHash;
    this.recordedHash = recordedHash;
  }
}

export class UserStopActiveError extends Error {
  constructor(operation: string) {
    super(`[USER_STOP_ACTIVE] Operation '${operation}' denied because USER_STOP is currently active`);
    this.name = 'UserStopActiveError';
  }
}

export class TaskNotFoundError extends Error {
  public readonly taskId: string;
  public readonly tenantId: string;

  constructor(taskId: string, tenantId: string) {
    super(`[TASK_NOT_FOUND] Task '${taskId}' not found in tenant partition '${tenantId}'`);
    this.name = 'TaskNotFoundError';
    this.taskId = taskId;
    this.tenantId = tenantId;
  }
}

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(`[TASK_VALIDATION_ERROR] ${message}`);
    this.name = 'TaskValidationError';
  }
}

// ============================================================================
// DETERMINISTIC IDENTIFIER GENERATORS
// ============================================================================

export function createTaskId(tenantId: string, timestamp?: number, rand?: string): string {
  const ts = timestamp ?? Date.now();
  const rnd = rand ?? crypto.randomBytes(4).toString('hex');
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  return `task_${safeTenant}_${ts}_${rnd}`;
}

export function createStepId(taskId: string, index: number): string {
  return `step_${taskId}_${index}`;
}
