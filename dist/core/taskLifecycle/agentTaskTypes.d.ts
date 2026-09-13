import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Canonical 9-state lifecycle for an Agent Task.
 * VI: Vòng đời 9 trạng thái chuẩn mực cho một Nhiệm vụ Agent.
 */
export type TaskState = 'SUBMITTED' | 'ACCEPTED' | 'PLANNING' | 'EXECUTING' | 'AWAITING_APPROVAL' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
/**
 * EN: Canonical status for an individual step within an Agent Task.
 * VI: Trạng thái chuẩn mực cho từng bước riêng lẻ trong một Nhiệm vụ Agent.
 */
export type TaskStepStatus = 'PENDING' | 'RUNNING' | 'AWAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
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
export declare class IllegalStateTransitionError extends Error {
    readonly fromState: TaskState;
    readonly toState: TaskState;
    readonly taskId?: string;
    constructor(fromState: TaskState, toState: TaskState, taskId?: string, details?: string);
}
export declare class ConcurrencyConflictError extends Error {
    readonly taskId: string;
    readonly currentVersion: number;
    readonly expectedVersion: number;
    constructor(taskId: string, currentVersion: number, expectedVersion: number);
}
export declare class CrossTenantAccessViolationError extends Error {
    readonly requestedTenantId: string;
    readonly actualTenantId: string;
    readonly taskId: string;
    constructor(requestedTenantId: string, actualTenantId: string, taskId: string);
}
export declare class ProvenanceTamperError extends Error {
    readonly taskId: string;
    readonly calculatedHash: string;
    readonly recordedHash: string;
    constructor(taskId: string, calculatedHash: string, recordedHash: string);
}
export declare class UserStopActiveError extends Error {
    constructor(operation: string);
}
export declare class TaskNotFoundError extends Error {
    readonly taskId: string;
    readonly tenantId: string;
    constructor(taskId: string, tenantId: string);
}
export declare class TaskValidationError extends Error {
    constructor(message: string);
}
export declare function createTaskId(tenantId: string, timestamp?: number, rand?: string): string;
export declare function createStepId(taskId: string, index: number): string;
