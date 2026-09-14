import type { GroundedPlanRiskLevel } from '../groundedPlanning/groundedPlanTypes.js';
import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
export declare const GOVERNED_EXECUTION_SCHEMA_VERSION = "1.0.0";
export declare const DEFAULT_EXECUTION_LEASE_TTL_MS: number;
export declare const MAX_EXECUTION_PAYLOAD_BYTES: number;
/**
 * EN: Explicit execution lifecycle state.
 * VI: Trạng thái vòng đời thực thi tường minh.
 */
export type GovernedExecutionState = 'REQUESTED' | 'AUTHORIZATION_VERIFIED' | 'LEASE_ACQUIRED' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED' | 'DENIED' | 'EXPIRED' | 'PREEMPTED' | 'CANCELLED' | 'INVALIDATED';
/**
 * EN: Execution outcome classifications.
 * VI: Phân loại kết quả thực thi.
 */
export type GovernedExecutionOutcome = 'SUCCESS' | 'FAILURE' | 'AUTHORIZATION_DENIED' | 'LEASE_EXPIRED' | 'USER_STOP_PREEMPTED' | 'CONCURRENCY_CONFLICT' | 'VALIDATION_FAILED' | 'ADAPTER_ERROR';
/**
 * EN: Registered typed operation kind.
 * VI: Loại thao tác định kiểu đã đăng ký.
 */
export type ExecutionOperationKind = 'INSPECT_ELEMENT' | 'READ_STATE' | 'VERIFY_ASSERTION' | 'SIMULATE_INTERACTION' | 'EXECUTE_GOVERNED_ACTION' | 'CUSTOM_REGISTERED';
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
export declare class GovernedExecutionError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class ExecutionValidationError extends GovernedExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ExecutionAuthorizationError extends GovernedExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ExecutionLeaseError extends GovernedExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ExecutionTenantIsolationError extends GovernedExecutionError {
    constructor(requestedTenant: string, targetTenant: string);
}
export declare class ExecutionSessionIsolationError extends GovernedExecutionError {
    constructor(requestedSession: string, targetSession: string);
}
export declare class ExecutionConcurrencyError extends GovernedExecutionError {
    constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>);
}
export declare class ExecutionUserStopError extends GovernedExecutionError {
    constructor(checkpoint: string);
}
export declare class ExecutionAdapterError extends GovernedExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ExecutionPersistenceError extends GovernedExecutionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare function computeLeaseSignatureHash(lease: Omit<ExecutionLease, 'signatureHash'>): string;
export declare function computeAuthorizationHash(auth: Omit<ExecutionAuthorizationEnvelope, 'authorizationHash'>): string;
export declare function computeRequestHash(req: Omit<ExecutionRequest, 'requestHash'>): string;
export declare function computeExecutionResultProvenanceHash(res: Omit<GovernedExecutionResultEnvelope, 'provenanceHash'>): string;
export declare function computeExecutionSessionDocumentHash(doc: Omit<GovernedExecutionSessionDocument, 'documentHash'>): string;
