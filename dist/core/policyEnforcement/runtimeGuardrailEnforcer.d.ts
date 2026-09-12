import { type PolicyGuardrailConfig } from '../policyEvolution/policyEvolutionTypes.js';
import { type GuardrailEvaluationResult, type ExecutionLeaseId } from './policyEnforcementTypes.js';
export interface GuardrailEnforcerOptions {
    readonly defaultConcurrencyLimit?: number;
    readonly leaseTtlMs?: number;
    readonly isUserStopActive?: () => boolean;
}
export interface ActiveExecutionLease {
    readonly leaseId: ExecutionLeaseId;
    readonly leaseKey: string;
    readonly tenantPartition: string;
    readonly toolName: string;
    readonly acquiredAt: number;
    readonly expiresAt: number;
}
export declare class RuntimeGuardrailEnforcer {
    private readonly defaultConcurrencyLimit;
    private readonly leaseTtlMs;
    private readonly isUserStopActiveFn?;
    private readonly activeLeases;
    private readonly retryCounters;
    private readonly activeTenantConcurrency;
    constructor(options?: GuardrailEnforcerOptions);
    /**
     * Evaluates all calibrated runtime guardrails for a candidate execution.
     * Đánh giá tất cả các rào chắn thời gian chạy đã hiệu chuẩn cho lần thực thi ứng viên.
     */
    evaluateGuardrails(params: {
        readonly tenantPartition: string;
        readonly toolName: string;
        readonly guardrails: PolicyGuardrailConfig;
        readonly correlationId?: string;
        readonly requestedApprovalTimeoutMs?: number;
        readonly retryAttempt?: number;
    }): GuardrailEvaluationResult;
    /**
     * Acquires an execution lease for a tool invocation.
     * Guarantees race-free concurrency accounting and single-lease acquisition.
     * Thu được hợp đồng thuê thực thi cho việc gọi công cụ.
     */
    acquireExecutionLease(params: {
        readonly tenantPartition: string;
        readonly toolName: string;
        readonly correlationId?: string;
    }): ExecutionLeaseId;
    /**
     * Releases an execution lease upon successful completion or failure.
     * Giải phóng hợp đồng thuê thực thi khi hoàn thành thành công hoặc thất bại.
     */
    releaseExecutionLease(leaseId: ExecutionLeaseId): boolean;
    /**
     * Records a retry attempt for an execution scope.
     * Ghi lại một lần thử lại cho phạm vi thực thi.
     */
    recordRetry(scopeKey: string): number;
    /**
     * Resets retry counters for an execution scope upon success.
     * Đặt lại bộ đếm thử lại cho phạm vi thực thi khi thành công.
     */
    resetRetries(scopeKey: string): void;
    /**
     * Garbage collects expired leases to prevent deadlocks.
     * Thu gom các hợp đồng thuê đã hết hạn để tránh bế tắc.
     */
    cleanExpiredLeases(): void;
    /**
     * Returns the count of active leases.
     * Trả về số lượng hợp đồng thuê đang hoạt động.
     */
    getActiveLeaseCount(): number;
}
export declare const globalRuntimeGuardrailEnforcer: RuntimeGuardrailEnforcer;
