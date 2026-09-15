import { GovernedAgent, AgentTrustProfile } from './multiAgentFederationTypes.js';
export interface TrustEvaluationInput {
    readonly agent: GovernedAgent;
    readonly delegationDepth: number;
    readonly historicalFailures: number;
    readonly hasValidLease: boolean;
    readonly isIdentityVerified: boolean;
}
export declare class AgentTrustGovernanceEngine {
    /**
     * EN: Evaluates agent trust profile deterministically from governance parameters.
     * VI: Đánh giá hồ sơ độ tin cậy của tác tử một cách xác định từ các tham số quản trị.
     */
    evaluateTrust(input: TrustEvaluationInput): AgentTrustProfile;
    /**
     * EN: Asserts agent trust is sufficient for requested risk tier.
     * VI: Khẳng định độ tin cậy của tác tử là đủ cho mức độ rủi ro được yêu cầu.
     */
    assertTrustSufficiency(agent: GovernedAgent, requiredRiskTier: string, delegationDepth: number): void;
}
