import { type PolicyRing, type PolicyCandidatePackage, type RollbackResult, type PolicyCandidateId, type PolicyCanaryFailureReason } from './policyCanaryTypes.js';
import { PolicyRingRouter } from './policyRingRouter.js';
import { PolicyCanaryCircuitBreaker } from './policyCanaryCircuitBreaker.js';
import { PolicyHotSwapEngine } from '../policyEnforcement/policyHotSwapEngine.js';
import { FailClosedBaselineFallback } from '../policyEnforcement/failClosedBaselineFallback.js';
export interface PolicyCanaryRollbackEngineOptions {
    readonly router?: PolicyRingRouter;
    readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
    readonly hotSwapEngine?: PolicyHotSwapEngine;
    readonly fallbackProvider?: FailClosedBaselineFallback;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyCanaryRollbackEngine {
    private readonly router;
    private readonly circuitBreaker;
    private readonly hotSwapEngine;
    private readonly fallbackProvider;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyCanaryRollbackEngineOptions);
    /**
     * Reverts a single tenant from a canary candidate back to active baseline.
     * Hoàn nguyên một người thuê duy nhất từ ứng viên canary về đường cơ sở hoạt động.
     */
    rollbackTenant(input: {
        readonly tenantPartition: string;
        readonly candidateId: PolicyCandidateId;
        readonly reason: PolicyCanaryFailureReason;
        readonly details?: string;
        readonly operatorUserId?: string;
    }): RollbackResult;
    /**
     * Demotes a candidate to an earlier ring (e.g., Ring 2 -> Ring 1 or Ring 1 -> Ring 0).
     * Hạ cấp một ứng viên xuống vòng trước đó (ví dụ: Vòng 2 -> Vòng 1 hoặc Vòng 1 -> Vòng 0).
     */
    demoteRing(candidate: PolicyCandidatePackage, targetRing: PolicyRing, reason: PolicyCanaryFailureReason, affectedTenants?: readonly string[]): {
        readonly updatedCandidate: PolicyCandidatePackage;
        readonly result: RollbackResult;
    };
    /**
     * Completely cancels a candidate across all rings and tenants.
     * Hủy bỏ hoàn toàn một ứng viên trên tất cả các vòng và người thuê.
     */
    cancelCanary(candidate: PolicyCandidatePackage, reason: PolicyCanaryFailureReason, affectedTenants?: readonly string[], operatorUserId?: string): {
        readonly updatedCandidate: PolicyCandidatePackage;
        readonly result: RollbackResult;
    };
    /**
     * Emergency fail-safe clearing all active canary routing assignments.
     * Khóa an toàn khẩn cấp xóa tất cả các gán định tuyến canary đang hoạt động.
     */
    rollbackAllCanaryAssignments(reason: PolicyCanaryFailureReason): void;
}
export declare const globalPolicyCanaryRollbackEngine: PolicyCanaryRollbackEngine;
