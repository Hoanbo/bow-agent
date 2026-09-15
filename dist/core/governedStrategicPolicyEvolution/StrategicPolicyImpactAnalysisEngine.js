// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1161: StrategicPolicyImpactAnalysisEngine
// 10-Dimensional Blast Radius & Reversibility Scoring Engine
// ============================================================================
import * as crypto from 'crypto';
import { computePolicyImpactAnalysisHash, } from './GovernedStrategicPolicyEvolutionTypes.js';
export class StrategicPolicyImpactAnalysisEngine {
    canonicalDimensions = [
        'FEDERATION_BLAST_RADIUS',
        'MISSION_SCOPE_SPREAD',
        'LEASE_SAFETY_MARGIN',
        'RESOURCE_BUDGET_VOLATILITY',
        'CONVERGENCE_STABILITY',
        'CONFLICT_RATE_PROJECTION',
        'REVERSIBILITY_RATING',
        'DEPENDENT_POLICY_COUPLING',
        'DRIFT_ACCELERATION_RISK',
        'SECURITY_PERIMETER_IMPACT',
    ];
    constructor() { }
    // EN: Evaluates proposal blast radius across all 10 canonical dimensions without side-effects.
    // VI: Đánh giá bán kính ảnh hưởng của đề xuất trên cả 10 chiều chuẩn tắc mà không gây tác dụng phụ.
    analyzeImpact(proposal, activeFederationCount = 2, activeMissionCount = 3) {
        const dimensionScores = [];
        // EN: Dimension 1 - Federation Blast Radius: proportional to affected federations.
        // VI: Chiều 1 - Bán kính ảnh hưởng liên đoàn: tỷ lệ thuận với số liên đoàn bị ảnh hưởng.
        const fedScore = Math.min(1.0, (activeFederationCount * 0.2) + (proposal.policyDomain === 'FEDERATION' ? 0.3 : 0.1));
        dimensionScores.push({
            dimension: 'FEDERATION_BLAST_RADIUS',
            score: fedScore,
            description: `Affects approximately ${activeFederationCount} active federations in domain ${proposal.policyDomain}`,
        });
        // EN: Dimension 2 - Mission Scope Spread.
        // VI: Chiều 2 - Độ lan tỏa phạm vi nhiệm vụ.
        const missionScore = Math.min(1.0, activeMissionCount * 0.15 + (proposal.sourceStrategicMemoryRecordIds.length * 0.05));
        dimensionScores.push({
            dimension: 'MISSION_SCOPE_SPREAD',
            score: missionScore,
            description: `Cross-mission impact across ${activeMissionCount} active mission contexts`,
        });
        // EN: Dimension 3 - Lease Safety Margin: touching LEASE domain escalates risk.
        // VI: Chiều 3 - Biên an toàn quyền tự chủ: tác động vào phạm vi LEASE làm tăng rủi ro.
        const leaseScore = proposal.policyDomain === 'LEASE' ? 0.85 : 0.2;
        dimensionScores.push({
            dimension: 'LEASE_SAFETY_MARGIN',
            score: leaseScore,
            description: proposal.policyDomain === 'LEASE' ? 'Direct modulation of autonomy lease boundaries' : 'Nominal lease interaction',
        });
        // EN: Dimension 4 - Resource Budget Volatility.
        // VI: Chiều 4 - Biến động ngân sách tài nguyên.
        const resScore = proposal.policyDomain === 'RESOURCE' ? 0.75 : 0.25;
        dimensionScores.push({
            dimension: 'RESOURCE_BUDGET_VOLATILITY',
            score: resScore,
            description: 'Projected volatility in token and compute budgets',
        });
        // EN: Dimension 5 - Convergence Stability.
        // VI: Chiều 5 - Độ ổn định hội tụ liên đoàn.
        const convScore = proposal.policyDomain === 'CONVERGENCE' ? 0.7 : 0.3;
        dimensionScores.push({
            dimension: 'CONVERGENCE_STABILITY',
            score: convScore,
            description: 'Sensitivity of multi-phase convergence rounds',
        });
        // EN: Dimension 6 - Conflict Rate Projection.
        // VI: Chiều 6 - Dự báo tỷ lệ xung đột.
        const conflictScore = Math.min(1.0, proposal.proposedChanges.length * 0.15 + 0.1);
        dimensionScores.push({
            dimension: 'CONFLICT_RATE_PROJECTION',
            score: conflictScore,
            description: `Projected conflict probability based on ${proposal.proposedChanges.length} proposed field deltas`,
        });
        // EN: Dimension 7 - Reversibility Rating (1.0 = highly reversible, 0.0 = completely irreversible).
        // VI: Chiều 7 - Đánh giá khả năng hoàn tác (1.0 = dễ đảo ngược, 0.0 = không thể hoàn tác).
        const reversibility = proposal.policyDomain === 'SECURITY' || proposal.policyDomain === 'LEASE' ? 0.35 : 0.8;
        dimensionScores.push({
            dimension: 'REVERSIBILITY_RATING',
            score: reversibility,
            description: reversibility < 0.5 ? 'Difficult or stateful rollback required' : 'Directly reversible field update',
        });
        // EN: Dimension 8 - Dependent Policy Coupling.
        // VI: Chiều 8 - Mức độ liên kết chính sách phụ thuộc.
        const couplingScore = Math.min(1.0, proposal.proposedChanges.length * 0.2);
        dimensionScores.push({
            dimension: 'DEPENDENT_POLICY_COUPLING',
            score: couplingScore,
            description: 'Structural coupling with upstream and downstream constraints',
        });
        // EN: Dimension 9 - Drift Acceleration Risk.
        // VI: Chiều 9 - Nguy cơ tăng tốc trôi dạt chính sách.
        const driftScore = proposal.policyDomain === 'CONVERGENCE' || proposal.policyDomain === 'LEASE' ? 0.6 : 0.2;
        dimensionScores.push({
            dimension: 'DRIFT_ACCELERATION_RISK',
            score: driftScore,
            description: 'Probability of accelerating multi-mission policy compliance divergence',
        });
        // EN: Dimension 10 - Security Perimeter Impact.
        // VI: Chiều 10 - Tác động chu vi an ninh hệ thống.
        const secScore = proposal.policyDomain === 'SECURITY' ? 0.9 : 0.15;
        dimensionScores.push({
            dimension: 'SECURITY_PERIMETER_IMPACT',
            score: secScore,
            description: proposal.policyDomain === 'SECURITY' ? 'Critical security perimeter modification' : 'Zero authentication boundary delta',
        });
        // EN: Calculate composite impact score: 0.6 * max + 0.4 * mean.
        // VI: Tính toán điểm tác động tổng hợp: 0.6 * max + 0.4 * trung bình.
        const numericScores = dimensionScores.map((d) => d.score);
        const maxScore = Math.max(...numericScores);
        const meanScore = numericScores.reduce((a, b) => a + b, 0) / numericScores.length;
        const compositeImpactScore = Math.min(1.0, Math.max(0.0, maxScore * 0.6 + meanScore * 0.4));
        // EN: Determine overall Risk Level.
        // VI: Xác định mức độ rủi ro tổng quát.
        let riskLevel = 'LOW';
        if (compositeImpactScore > 0.7 || reversibility < 0.4) {
            riskLevel = 'CRITICAL';
        }
        else if (compositeImpactScore > 0.5) {
            riskLevel = 'HIGH';
        }
        else if (compositeImpactScore > 0.25) {
            riskLevel = 'MEDIUM';
        }
        const analysisId = `urn:bow:analysis:${crypto.randomUUID()}`;
        const result = {
            analysisId,
            proposalId: proposal.proposalId,
            tenantId: proposal.tenantId,
            dimensionScores,
            compositeImpactScore: Number(compositeImpactScore.toFixed(4)),
            reversibilityScore: Number(reversibility.toFixed(4)),
            riskLevel,
            affectedFederationIds: [`fed_${proposal.tenantId}_01`],
            affectedMissionIds: [proposal.missionId],
            provenanceHash: '',
            analyzedAt: Date.now(),
        };
        result.provenanceHash = computePolicyImpactAnalysisHash(result);
        return result;
    }
}
