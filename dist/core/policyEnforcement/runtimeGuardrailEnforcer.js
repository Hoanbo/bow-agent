// src/core/policyEnforcement/runtimeGuardrailEnforcer.ts
// BOWCON V4.0 — MS-1.3.59: GOVERNED RUNTIME POLICY ENFORCEMENT POINT (PEP),
// DYNAMIC PDP SYNCHRONIZATION & LIVE GUARDRAIL EXECUTION PIPELINE
//
// Authoritative runtime guardrail execution engine.
// Strictly enforces calibrated guardrails during live tool invocation:
// - Approval timeout clamping (minApprovalTimeoutMs)
// - Retry budget accounting & exhaustion throttling (maxRetries)
// - Tenant & tool scoped concurrency bounds
// - Short-lived execution leases with leak-proof release
// Động cơ thực thi rào chắn thời gian chạy có thẩm quyền.
// Thực thi nghiêm ngặt các rào chắn đã hiệu chuẩn trong khi gọi công cụ trực tiếp.
//
// Authority Invariants:
// - Level 2 Controlled Execution Guardrails
// - GUARDRAIL_ENFORCEMENT != HARD_GATE_RELAXATION
// - USER_STOP > ALL_RUNTIME_POLICY_OPERATIONS
// - Zero autonomous token issuance, zero self-approval.
import { createExecutionLeaseId, createGuardrailEvaluationId, } from './policyEnforcementTypes.js';
export class RuntimeGuardrailEnforcer {
    defaultConcurrencyLimit;
    leaseTtlMs;
    isUserStopActiveFn;
    // Active execution leases: leaseKey -> ActiveExecutionLease
    // Các hợp đồng thuê thực thi đang hoạt động
    activeLeases = new Map();
    // Retry counters: scopeKey -> current attempt count
    // Bộ đếm thử lại
    retryCounters = new Map();
    // In-flight concurrency tracking: tenantPartition -> count
    // Theo dõi tính đồng thời đang diễn ra
    activeTenantConcurrency = new Map();
    constructor(options) {
        this.defaultConcurrencyLimit = options?.defaultConcurrencyLimit ?? 5;
        this.leaseTtlMs = options?.leaseTtlMs ?? 60000; // 60s default lease TTL
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    /**
     * Evaluates all calibrated runtime guardrails for a candidate execution.
     * Đánh giá tất cả các rào chắn thời gian chạy đã hiệu chuẩn cho lần thực thi ứng viên.
     */
    evaluateGuardrails(params) {
        const evaluationId = createGuardrailEvaluationId(`grd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
        // 1. Enforce absolute USER_STOP supremacy
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            return {
                evaluationId,
                passed: false,
                violations: ['USER_STOP is active. Operation halted immediately.'],
                enforcedGuardrails: {
                    minApprovalTimeoutMs: params.guardrails.minApprovalTimeoutMs,
                    maxRetries: params.guardrails.maxRetries,
                    currentRetries: 0,
                    concurrencyLimit: this.defaultConcurrencyLimit,
                    activeConcurrency: 0,
                },
                reason: 'OPERATION_SUSPENDED_BY_USER_STOP',
                failClosedReason: 'USER_STOP_ACTIVE',
            };
        }
        const violations = [];
        let failClosedReason;
        // 2. Validate Approval Timeout Guardrail
        if (params.requestedApprovalTimeoutMs !== undefined &&
            params.requestedApprovalTimeoutMs < params.guardrails.minApprovalTimeoutMs) {
            violations.push(`APPROVAL_TIMEOUT_TOO_LOW: Requested timeout (${params.requestedApprovalTimeoutMs}ms) is below calibrated minimum (${params.guardrails.minApprovalTimeoutMs}ms).`);
            failClosedReason = 'APPROVAL_TIMEOUT_BELOW_MINIMUM';
        }
        // 3. Validate Retry Budget Guardrail
        const retryScope = params.correlationId
            ? `${params.tenantPartition}:${params.correlationId}:${params.toolName}`
            : `${params.tenantPartition}:${params.toolName}`;
        const currentRetries = params.retryAttempt ?? (this.retryCounters.get(retryScope) ?? 0);
        if (currentRetries > params.guardrails.maxRetries) {
            violations.push(`RETRY_BUDGET_EXHAUSTED: Current retries (${currentRetries}) exceeded calibrated maxRetries (${params.guardrails.maxRetries}).`);
            failClosedReason = 'RETRY_BUDGET_EXHAUSTED';
        }
        // 4. Validate Concurrency Limits Guardrail
        this.cleanExpiredLeases();
        const activeConcurrency = this.activeTenantConcurrency.get(params.tenantPartition) ?? 0;
        if (activeConcurrency >= this.defaultConcurrencyLimit) {
            violations.push(`CONCURRENCY_LIMIT_EXCEEDED: Active tenant executions (${activeConcurrency}) reached max limit (${this.defaultConcurrencyLimit}).`);
            failClosedReason = 'CONCURRENCY_LIMIT_EXCEEDED';
        }
        const passed = violations.length === 0;
        return {
            evaluationId,
            passed,
            violations,
            enforcedGuardrails: {
                minApprovalTimeoutMs: params.guardrails.minApprovalTimeoutMs,
                maxRetries: params.guardrails.maxRetries,
                currentRetries,
                concurrencyLimit: this.defaultConcurrencyLimit,
                activeConcurrency,
            },
            reason: passed ? 'All runtime guardrails satisfied.' : violations.join('; '),
            failClosedReason,
        };
    }
    /**
     * Acquires an execution lease for a tool invocation.
     * Guarantees race-free concurrency accounting and single-lease acquisition.
     * Thu được hợp đồng thuê thực thi cho việc gọi công cụ.
     */
    acquireExecutionLease(params) {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot acquire lease during emergency stop.');
        }
        this.cleanExpiredLeases();
        const leaseKey = params.correlationId
            ? `${params.tenantPartition}:${params.correlationId}:${params.toolName}`
            : `${params.tenantPartition}:${params.toolName}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        if (this.activeLeases.has(leaseKey)) {
            throw new Error(`LEASE_ACQUISITION_CONFLICT: An active lease already exists for key '${leaseKey}'.`);
        }
        const leaseId = createExecutionLeaseId(`lease_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
        const now = Date.now();
        const lease = {
            leaseId,
            leaseKey,
            tenantPartition: params.tenantPartition,
            toolName: params.toolName,
            acquiredAt: now,
            expiresAt: now + this.leaseTtlMs,
        };
        this.activeLeases.set(leaseKey, lease);
        const currentCount = this.activeTenantConcurrency.get(params.tenantPartition) ?? 0;
        this.activeTenantConcurrency.set(params.tenantPartition, currentCount + 1);
        return leaseId;
    }
    /**
     * Releases an execution lease upon successful completion or failure.
     * Giải phóng hợp đồng thuê thực thi khi hoàn thành thành công hoặc thất bại.
     */
    releaseExecutionLease(leaseId) {
        for (const [key, lease] of this.activeLeases.entries()) {
            if (lease.leaseId === leaseId) {
                this.activeLeases.delete(key);
                const currentCount = this.activeTenantConcurrency.get(lease.tenantPartition) ?? 1;
                this.activeTenantConcurrency.set(lease.tenantPartition, Math.max(0, currentCount - 1));
                return true;
            }
        }
        return false;
    }
    /**
     * Records a retry attempt for an execution scope.
     * Ghi lại một lần thử lại cho phạm vi thực thi.
     */
    recordRetry(scopeKey) {
        const nextCount = (this.retryCounters.get(scopeKey) ?? 0) + 1;
        this.retryCounters.set(scopeKey, nextCount);
        return nextCount;
    }
    /**
     * Resets retry counters for an execution scope upon success.
     * Đặt lại bộ đếm thử lại cho phạm vi thực thi khi thành công.
     */
    resetRetries(scopeKey) {
        this.retryCounters.delete(scopeKey);
    }
    /**
     * Garbage collects expired leases to prevent deadlocks.
     * Thu gom các hợp đồng thuê đã hết hạn để tránh bế tắc.
     */
    cleanExpiredLeases() {
        const now = Date.now();
        for (const [key, lease] of this.activeLeases.entries()) {
            if (now > lease.expiresAt) {
                this.activeLeases.delete(key);
                const currentCount = this.activeTenantConcurrency.get(lease.tenantPartition) ?? 1;
                this.activeTenantConcurrency.set(lease.tenantPartition, Math.max(0, currentCount - 1));
            }
        }
    }
    /**
     * Returns the count of active leases.
     * Trả về số lượng hợp đồng thuê đang hoạt động.
     */
    getActiveLeaseCount() {
        this.cleanExpiredLeases();
        return this.activeLeases.size;
    }
}
export const globalRuntimeGuardrailEnforcer = new RuntimeGuardrailEnforcer();
