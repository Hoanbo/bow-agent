import { type PolicyCanaryFaultType, type FaultInjectionRule, type PolicyFaultInjectionId } from './policyCanaryResilienceTypes.js';
import type { PolicyRing } from './policyCanaryTypes.js';
export interface FaultEvaluationContext {
    readonly tenantPartition?: string;
    readonly candidateId?: string;
    readonly toolName?: string;
    readonly targetRing?: PolicyRing;
}
export declare class PolicyCanaryFaultInjector {
    private readonly rules;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    /**
     * Arms a new fault injection rule.
     * Kích hoạt một quy tắc tiêm lỗi mới.
     */
    armFault(params: Omit<FaultInjectionRule, 'id'>): PolicyFaultInjectionId;
    /**
     * Disarms an active fault injection rule by ID.
     * Vô hiệu hóa một quy tắc tiêm lỗi đang hoạt động theo ID.
     */
    disarmFault(id: PolicyFaultInjectionId): boolean;
    /**
     * Disarms all active fault injection rules.
     * Vô hiệu hóa tất cả các quy tắc tiêm lỗi đang hoạt động.
     */
    disarmAll(): void;
    /**
     * Checks whether a specific fault should be injected given the context.
     * Kiểm tra xem một lỗi cụ thể có nên được tiêm trong ngữ cảnh hiện tại hay không.
     */
    shouldInject(faultType: PolicyCanaryFaultType, context?: FaultEvaluationContext): boolean;
    /**
     * Injects the fault by throwing an Error if an active matching rule exists.
     * Tiêm lỗi bằng cách ném ra Error nếu tồn tại quy tắc khớp đang kích hoạt.
     */
    triggerIfArmed(faultType: PolicyCanaryFaultType, context?: FaultEvaluationContext): void;
    /**
     * Returns all currently active rules.
     * Trả về tất cả các quy tắc hiện đang kích hoạt.
     */
    getActiveRules(): readonly FaultInjectionRule[];
}
export declare const globalPolicyCanaryFaultInjector: PolicyCanaryFaultInjector;
