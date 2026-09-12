import { type ShadowEvaluationRecord } from './policyCanaryTypes.js';
import type { PolicyConfiguration } from '../policyEvolution/policyEvolutionTypes.js';
export interface ShadowEvaluationInput {
    readonly tenantPartition: string;
    readonly toolName: string;
    readonly args?: Readonly<Record<string, any>>;
    readonly activeConfig: PolicyConfiguration;
    readonly candidateConfig: PolicyConfiguration;
    readonly correlationId?: string;
    readonly actorRole?: string;
    readonly requestedApprovalTimeoutMs?: number;
    readonly retryAttempt?: number;
}
export declare class PolicyShadowEvaluator {
    /**
     * Performs read-only shadow evaluation comparing active policy against candidate policy.
     * Guarantees 100% zero side effects, zero tool execution, and zero token generation.
     *
     * Thực hiện đánh giá bóng chỉ đọc so sánh chính sách hoạt động với chính sách ứng viên.
     * Đảm bảo 100% không có tác dụng phụ, không thực thi công cụ và không tạo mã xác thực.
     */
    evaluateShadow(input: ShadowEvaluationInput): ShadowEvaluationRecord;
    /**
     * Helper determining if an action classification permits automated execution.
     * Hàm trợ giúp xác định xem phân loại hành động có cho phép thực thi tự động hay không.
     */
    private isAllowedClassification;
}
export declare const globalPolicyShadowEvaluator: PolicyShadowEvaluator;
