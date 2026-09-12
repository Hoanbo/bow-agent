import { type ActionClassification, PolicyDecisionPoint } from '../policyDecisionPoint.js';
import { type EnforcementContext, type EnforcementDecision, type ExecutionLeaseId } from './policyEnforcementTypes.js';
import { PolicyHotSwapEngine } from './policyHotSwapEngine.js';
import { ActivePolicyResolver } from './activePolicyResolver.js';
import { RuntimeGuardrailEnforcer } from './runtimeGuardrailEnforcer.js';
import { PolicyViolationAuditor } from './policyViolationAuditor.js';
import { FailClosedBaselineFallback } from './failClosedBaselineFallback.js';
import { PolicyCanaryRuntime } from '../policyCanary/policyCanaryRuntime.js';
export interface GovernedPEPOptions {
    readonly pdp?: PolicyDecisionPoint;
    readonly hotSwapEngine?: PolicyHotSwapEngine;
    readonly activeResolver?: ActivePolicyResolver;
    readonly guardrailEnforcer?: RuntimeGuardrailEnforcer;
    readonly auditor?: PolicyViolationAuditor;
    readonly fallbackProvider?: FailClosedBaselineFallback;
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
    readonly canaryRuntime?: PolicyCanaryRuntime;
}
export declare class GovernedPolicyEnforcementPoint {
    private readonly pdp;
    private readonly hotSwapEngine;
    private readonly activeResolver;
    private readonly guardrailEnforcer;
    private readonly auditor;
    private readonly fallbackProvider;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly canaryRuntime?;
    constructor(options?: GovernedPEPOptions);
    /**
     * Primary enforcement entrypoint evaluating and enforcing policies prior to tool execution.
     * Điểm vào thực thi chính đánh giá và thực thi chính sách trước khi thực thi công cụ.
     */
    enforce(context: EnforcementContext): EnforcementDecision;
    /**
     * Releases an execution lease after tool execution completes or fails.
     * Giải phóng hợp đồng thuê thực thi sau khi hoàn tất hoặc thất bại.
     */
    releaseLease(leaseId?: ExecutionLeaseId): boolean;
    /**
     * Helper returning the active policy classification for a tool.
     * Hàm trợ giúp trả về phân loại chính sách hoạt động cho công cụ.
     */
    getActiveActionClassification(toolName: string, tenantPartition?: string): ActionClassification;
}
export declare const globalGovernedPEP: GovernedPolicyEnforcementPoint;
