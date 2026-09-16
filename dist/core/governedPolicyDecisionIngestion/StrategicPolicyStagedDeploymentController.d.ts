import { type CanonicalStrategicPolicy, type PolicyDeploymentRecord, type CanaryRing, type ShadowEvaluationReport } from './GovernedPolicyDecisionIngestionTypes.js';
import type { StrategicPolicyVersionStore } from './StrategicPolicyVersionStore.js';
import type { HumanDecisionRecord, HumanDecisionToken } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export declare class StrategicPolicyStagedDeploymentController {
    private readonly versionStore;
    private readonly deploymentLocks;
    private readonly activeDeployments;
    private readonly deploymentAuthorizations;
    private readonly trippedCircuitBreakers;
    private readonly isUserStopActiveFn?;
    private readonly isEmergencyStopActiveFn?;
    constructor(versionStore: StrategicPolicyVersionStore, options?: {
        isUserStopActive?: (tenantId?: string) => boolean;
        isEmergencyStopActive?: (domain?: string) => boolean;
    });
    /**
     * Initiate staged deployment of a ratified, compiled canonical policy.
     * Khởi động quy trình triển khai phân tầng cho chính sách chuẩn đã phê chuẩn.
     */
    initiateDeployment(policy: CanonicalStrategicPolicy, shadowReport: ShadowEvaluationReport, authorization?: {
        token: HumanDecisionToken;
        record: HumanDecisionRecord;
    }): PolicyDeploymentRecord;
    /**
     * Promote deployment to the next canary ring.
     * Nâng cấp triển khai lên vòng canary tiếp theo.
     */
    promoteRing(deploymentId: string, targetRing: CanaryRing, policy: CanonicalStrategicPolicy, healthMetricScore?: number, // 0.0 - 1.0 (1.0 = completely healthy)
    authorization?: {
        token: HumanDecisionToken;
        record: HumanDecisionRecord;
    }): PolicyDeploymentRecord;
    /**
     * Trip circuit breaker for a tenant and domain.
     */
    tripCircuitBreaker(tenantId: string, policyDomain: string, reason: string): void;
    /**
     * Reset circuit breaker with authorized token.
     */
    resetCircuitBreaker(tenantId: string, policyDomain: string): void;
    isCircuitBreakerTripped(tenantId: string, policyDomain: string): boolean;
    getDeploymentRecord(deploymentId: string): PolicyDeploymentRecord | undefined;
    releaseLock(tenantId: string, policyDomain: string): void;
    private assertInterlocks;
}
