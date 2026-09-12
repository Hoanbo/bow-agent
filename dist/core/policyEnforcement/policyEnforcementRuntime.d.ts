import { PolicySnapshotStore } from '../policyEvolution/policySnapshotStore.js';
import { ActivePolicyResolver } from './activePolicyResolver.js';
import { PolicyHotSwapEngine } from './policyHotSwapEngine.js';
import { RuntimeGuardrailEnforcer } from './runtimeGuardrailEnforcer.js';
import { PolicyDriftReconciler } from './policyDriftReconciler.js';
import { PolicyViolationAuditor } from './policyViolationAuditor.js';
import { FailClosedBaselineFallback } from './failClosedBaselineFallback.js';
import { GovernedPolicyEnforcementPoint } from './governedPolicyEnforcementPoint.js';
import { type EnforcementContext, type EnforcementDecision, type PolicyDriftReport, type RuntimePolicyState, type ExecutionLeaseId } from './policyEnforcementTypes.js';
export interface PolicyEnforcementRuntimeOptions {
    readonly baseDir?: string;
    readonly snapshotStore?: PolicySnapshotStore;
    readonly activeResolver?: ActivePolicyResolver;
    readonly hotSwapEngine?: PolicyHotSwapEngine;
    readonly guardrailEnforcer?: RuntimeGuardrailEnforcer;
    readonly driftReconciler?: PolicyDriftReconciler;
    readonly auditor?: PolicyViolationAuditor;
    readonly fallbackProvider?: FailClosedBaselineFallback;
    readonly pep?: GovernedPolicyEnforcementPoint;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyEnforcementRuntime {
    private readonly baseDir;
    private readonly snapshotStore;
    private readonly activeResolver;
    private readonly hotSwapEngine;
    private readonly guardrailEnforcer;
    private readonly driftReconciler;
    private readonly auditor;
    private readonly fallbackProvider;
    private readonly pep;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyEnforcementRuntimeOptions);
    /**
     * Initializes or refreshes runtime active policy from durable store for a tenant.
     * Khởi tạo hoặc làm mới chính sách hoạt động thời gian chạy từ kho lưu trữ bền vững cho người thuê.
     */
    synchronizeTenantPolicy(userId: string): {
        readonly success: boolean;
        readonly tenantPartition: string;
        readonly versionId: string;
        readonly isFallback: boolean;
        readonly reason?: string;
    };
    /**
     * Evaluates enforcement context prior to tool execution.
     * Đánh giá ngữ cảnh thực thi trước khi gọi công cụ.
     */
    enforce(context: EnforcementContext): EnforcementDecision;
    /**
     * Releases an execution lease after execution completes or fails.
     * Giải phóng hợp đồng thuê thực thi sau khi hoàn tất hoặc thất bại.
     */
    releaseLease(leaseId?: ExecutionLeaseId): boolean;
    /**
     * Reconciles policy drift for a tenant between durable store and memory.
     * Đối soát độ lệch chính sách cho người thuê giữa kho bền vững và bộ nhớ.
     */
    reconcileDrift(userId: string): PolicyDriftReport;
    /**
     * Gets in-memory runtime policy state for a tenant.
     * Lấy trạng thái chính sách thời gian chạy trong bộ nhớ cho người thuê.
     */
    getRuntimeState(userId: string): RuntimePolicyState;
    getGovernedPEP(): GovernedPolicyEnforcementPoint;
    getActiveResolver(): ActivePolicyResolver;
    getHotSwapEngine(): PolicyHotSwapEngine;
    getGuardrailEnforcer(): RuntimeGuardrailEnforcer;
    getDriftReconciler(): PolicyDriftReconciler;
    getAuditor(): PolicyViolationAuditor;
    getFallbackProvider(): FailClosedBaselineFallback;
}
export declare const globalPolicyEnforcementRuntime: PolicyEnforcementRuntime;
