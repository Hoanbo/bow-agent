// src/core/governedFederatedKnowledgeState/CollectiveIntelligenceGovernanceEngine.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1134 — REAL
//
// EN: Collective intelligence governance engine calculating evidence strength, confidence, and consistency
//     without converting analytical metrics into executive authority or bypassing policy.
// VI: Động cơ quản trị trí tuệ tập thể tính toán độ mạnh của bằng chứng, độ tin cậy và tính nhất quán
//     mà không biến các chỉ số phân tích thành thẩm quyền thực thi hay bỏ qua chính sách.
import { computeSha256, deterministicJsonStringify, } from './GovernedFederatedKnowledgeStateTypes.js';
export class CollectiveIntelligenceGovernanceEngine {
    /**
     * EN: Evaluates collective intelligence metrics for a knowledge state.
     * VI: Đánh giá các chỉ số trí tuệ tập thể cho một trạng thái tri thức.
     */
    evaluateState(state, evidences = []) {
        const entries = Object.values(state.entries);
        const entryCount = entries.length;
        if (entryCount === 0) {
            const base = {
                stateId: state.stateId,
                entryCount: 0,
                averageConfidence: 0,
                evidenceStrength: 0,
                consistencyScore: 1.0,
                stabilityScore: 1.0,
                governanceCompliance: 'COMPLIANT',
            };
            return {
                ...base,
                provenanceHash: computeSha256(deterministicJsonStringify(base)),
            };
        }
        // 1. Average confidence
        const totalConfidence = entries.reduce((acc, e) => acc + e.confidence, 0);
        const averageConfidence = totalConfidence / entryCount;
        // 2. Evidence strength: ratio of entries with >= 1 evidence
        const entriesWithEvidence = entries.filter((e) => e.evidenceIds.length > 0).length;
        const evidenceStrength = entriesWithEvidence / entryCount;
        // 3. Consistency score: penalizes review required or suspended states
        let consistencyScore = 1.0;
        if (state.status === 'REVIEW_REQUIRED')
            consistencyScore = 0.5;
        if (state.status === 'SUSPENDED')
            consistencyScore = 0.2;
        // 4. Stability score: inversely proportional to merges and reconciliations
        const stabilityPenalty = Math.min(0.5, (state.mergeCount * 0.02) + (state.reconciliationCount * 0.04));
        const stabilityScore = Math.max(0, 1.0 - stabilityPenalty);
        // 5. Governance compliance decision
        let governanceCompliance;
        if (consistencyScore < 0.6 || state.status === 'REVIEW_REQUIRED') {
            governanceCompliance = 'REVIEW_REQUIRED';
        }
        else if (averageConfidence < 0.6 || evidenceStrength < 0.5) {
            governanceCompliance = 'LOW_CONFIDENCE';
        }
        else {
            governanceCompliance = 'COMPLIANT';
        }
        const base = {
            stateId: state.stateId,
            entryCount,
            averageConfidence: Math.round(averageConfidence * 1000) / 1000,
            evidenceStrength: Math.round(evidenceStrength * 1000) / 1000,
            consistencyScore: Math.round(consistencyScore * 1000) / 1000,
            stabilityScore: Math.round(stabilityScore * 1000) / 1000,
            governanceCompliance,
        };
        return {
            ...base,
            provenanceHash: computeSha256(deterministicJsonStringify(base)),
        };
    }
}
