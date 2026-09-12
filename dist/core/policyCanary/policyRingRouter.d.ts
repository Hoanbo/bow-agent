import { type PolicyRing, type PolicyCandidatePackage, type PolicyRingAssignment, type PolicyCanaryFailureReason } from './policyCanaryTypes.js';
import type { PolicyConfiguration } from '../policyEvolution/policyEvolutionTypes.js';
import { FailClosedBaselineFallback } from '../policyEnforcement/failClosedBaselineFallback.js';
export interface PolicyRoutingDecision {
    readonly tenantPartition: string;
    readonly ring: PolicyRing;
    readonly effectivePolicyConfig: PolicyConfiguration;
    readonly isCandidate: boolean;
    readonly candidatePackage?: PolicyCandidatePackage;
    readonly isBaselineFallback: boolean;
    readonly shadowCandidateConfig?: PolicyConfiguration;
    readonly reason: string;
    readonly failClosedReason?: PolicyCanaryFailureReason;
}
export interface PolicyRingRouterOptions {
    readonly fallbackProvider?: FailClosedBaselineFallback;
    readonly isUserStopActive?: () => boolean;
    readonly baseDir?: string;
}
export declare class PolicyRingRouter {
    private readonly fallbackProvider;
    private readonly isUserStopActiveFn?;
    private readonly baseDir?;
    private readonly assignments;
    private readonly candidates;
    constructor(options?: PolicyRingRouterOptions);
    /**
     * Registers a candidate package for routing.
     * Đăng ký một gói ứng viên để định tuyến.
     */
    registerCandidate(candidate: PolicyCandidatePackage): void;
    /**
     * Assigns a tenant partition to a specific candidate and ring.
     * Gán một phân vùng người thuê vào một ứng viên và vòng cụ thể.
     */
    assignTenantRing(assignment: PolicyRingAssignment): void;
    /**
     * Removes ring assignment for a tenant.
     * Xóa gán vòng cho một người thuê.
     */
    unassignTenant(tenantPartition: string): boolean;
    /**
     * Clears all assignments and candidates (used during rollback or reset).
     * Xóa tất cả gán và ứng viên (sử dụng khi hoàn nguyên hoặc đặt lại).
     */
    clearAll(): void;
    /**
     * Resolves the ring assignment for a tenant.
     * Giải quyết gán vòng cho một người thuê.
     */
    getRingAssignment(tenantPartition: string): PolicyRingAssignment | undefined;
    /**
     * Resolves candidate package for a tenant.
     * Giải quyết gói ứng viên cho một người thuê.
     */
    resolveCandidate(tenantPartition: string): PolicyCandidatePackage | undefined;
    /**
     * Resolves whether the candidate should be used for execution for a tenant.
     * Giải quyết xem ứng viên có nên được sử dụng để thực thi cho người thuê hay không.
     */
    shouldUseCandidate(tenantPartition: string): boolean;
    /**
     * Resolves the effective policy configuration to use for live execution.
     * Applies fail-closed invariants and routes candidate vs active policy.
     *
     * Giải quyết cấu hình chính sách hiệu lực để sử dụng cho thực thi trực tiếp.
     * Áp dụng các bất biến đóng an toàn và định tuyến chính sách ứng viên vs hoạt động.
     */
    resolvePolicyForTenant(userId: string, activePolicyConfig: PolicyConfiguration, toolName?: string): PolicyRoutingDecision;
    /**
     * Cryptographically verifies candidate policy checksum.
     * Xác minh mã kiểm tra chính sách ứng viên theo mật mã học.
     */
    private verifyCandidateChecksum;
}
export declare const globalPolicyRingRouter: PolicyRingRouter;
