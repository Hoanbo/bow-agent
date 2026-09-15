// src/core/multiAgentFederation/agentTrustGovernanceEngine.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1114 — REAL
//
// EN: Agent trust governance engine evaluating deterministic governance metadata and trust scores.
//     Strictly guarantees that trust scores NEVER equal authority and NEVER bypass policy or safety gates.
// VI: Động cơ quản trị độ tin cậy tác tử đánh giá siêu dữ liệu quản trị và điểm tin cậy xác định.
//     Đảm bảo nghiêm ngặt rằng điểm tin cậy KHÔNG BAO GIỜ bằng quyền hạn và KHÔNG BAO GIỜ bỏ qua chính sách hay cổng an toàn.
import { MultiAgentFederationTrustError, } from './multiAgentFederationTypes.js';
export class AgentTrustGovernanceEngine {
    /**
     * EN: Evaluates agent trust profile deterministically from governance parameters.
     * VI: Đánh giá hồ sơ độ tin cậy của tác tử một cách xác định từ các tham số quản trị.
     */
    evaluateTrust(input) {
        let identityScore = input.isIdentityVerified ? 1.0 : 0.0;
        let governanceComplianceScore = 1.0;
        // Depth penalty (higher delegation depth decreases trust)
        if (input.delegationDepth > 0) {
            governanceComplianceScore -= input.delegationDepth * 0.1;
        }
        // Failure penalty
        if (input.historicalFailures > 0) {
            governanceComplianceScore -= Math.min(0.5, input.historicalFailures * 0.15);
        }
        // Lease validity
        if (!input.hasValidLease) {
            governanceComplianceScore -= 0.2;
        }
        identityScore = Math.max(0, Math.min(1.0, identityScore));
        governanceComplianceScore = Math.max(0, Math.min(1.0, governanceComplianceScore));
        const historicalSuccessRate = input.historicalFailures === 0 ? 1.0 : Math.max(0, 1.0 - input.historicalFailures * 0.2);
        const isTrustedForHighRisk = identityScore >= 0.9 && governanceComplianceScore >= 0.8 && input.delegationDepth <= 2;
        return {
            identityScore,
            governanceComplianceScore,
            historicalSuccessRate,
            lastAssessedAt: Date.now(),
            isTrustedForHighRisk,
            trustFactors: {
                delegationDepth: input.delegationDepth,
                historicalFailures: input.historicalFailures,
                hasValidLease: input.hasValidLease,
                isIdentityVerified: input.isIdentityVerified,
            },
        };
    }
    /**
     * EN: Asserts agent trust is sufficient for requested risk tier.
     * VI: Khẳng định độ tin cậy của tác tử là đủ cho mức độ rủi ro được yêu cầu.
     */
    assertTrustSufficiency(agent, requiredRiskTier, delegationDepth) {
        if (delegationDepth > 5) {
            throw new MultiAgentFederationTrustError(`Delegation depth ${delegationDepth} exceeds maximum allowable depth 5`, agent.tenantId, undefined, agent.agentId);
        }
        if (agent.trustProfile.governanceComplianceScore < 0.5) {
            throw new MultiAgentFederationTrustError(`Agent '${agent.agentId}' governance compliance score (${agent.trustProfile.governanceComplianceScore}) is below acceptable threshold 0.5`, agent.tenantId, undefined, agent.agentId);
        }
        if ((requiredRiskTier === 'HIGH' || requiredRiskTier === 'CRITICAL') && !agent.trustProfile.isTrustedForHighRisk) {
            throw new MultiAgentFederationTrustError(`Agent '${agent.agentId}' is not trusted for ${requiredRiskTier} risk tier delegations`, agent.tenantId, undefined, agent.agentId);
        }
    }
}
