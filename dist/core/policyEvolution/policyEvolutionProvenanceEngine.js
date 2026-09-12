// src/core/policyEvolution/policyEvolutionProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Governed policy evolution cryptographic provenance engine.
// Generates tamper-evident SHA-256 hash chains binding advisories, proposals, counterfactual simulations,
// guardrail evaluations, human review decisions, authorization tokens, and deployed policy version checksums.
// Any alteration, deletion, or tampering with constituent hashes invalidates cryptographic verification.
// Động cơ nguồn gốc mật mã tiến hóa chính sách có quản trị.
// Tạo chuỗi băm SHA-256 chống can thiệp liên kết tư vấn, đề xuất, mô phỏng, đánh giá, ủy quyền và phiên bản chính sách.
import crypto from 'node:crypto';
import { createPolicyEvolutionProvenanceId, } from './policyEvolutionTypes.js';
export class PolicyEvolutionProvenanceEngine {
    /**
     * Computes the deterministic SHA-256 digest over the entire evolution chain.
     * Tính toán tóm lược SHA-256 xác định qua toàn bộ chuỗi tiến hóa.
     */
    computeProvenanceHash(proposalId, baseVersionHash, diffHash, simulationHash, guardrailHash, reviewHash, timestamp) {
        const payload = [
            proposalId,
            baseVersionHash,
            diffHash,
            simulationHash,
            guardrailHash,
            reviewHash,
            String(timestamp),
        ].join('||');
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
    /**
     * Generates a tamper-evident cryptographic provenance record for a policy evolution stage.
     * Tạo bản ghi nguồn gốc mật mã chống can thiệp cho giai đoạn tiến hóa chính sách.
     */
    generateProvenance(input) {
        const { proposal, simulationResult, guardrailResult, reviewRecord, timestamp = Date.now() } = input;
        const baseVersionHash = crypto.createHash('sha256').update(proposal.baseVersionId).digest('hex');
        const diffHash = crypto.createHash('sha256').update(JSON.stringify(proposal.candidatePolicyDiff)).digest('hex');
        const simulationHash = crypto.createHash('sha256').update(`${simulationResult.simulationId}:${simulationResult.simulatedMttrDeltaMs}:${simulationResult.simulatedSafetyRegressionsCount}`).digest('hex');
        const guardrailHash = crypto.createHash('sha256').update(`${guardrailResult.passed}:${guardrailResult.safetyMarginScore}:${guardrailResult.violatesForbiddenProtection}`).digest('hex');
        let reviewHash = 'PENDING_REVIEW';
        if (reviewRecord) {
            reviewHash = crypto.createHash('sha256').update(`${reviewRecord.reviewId}:${reviewRecord.decision}:${reviewRecord.reviewedBy}:${reviewRecord.authorizationToken?.tokenId ?? 'NO_TOKEN'}`).digest('hex');
        }
        const provenanceSha256 = this.computeProvenanceHash(proposal.proposalId, baseVersionHash, diffHash, simulationHash, guardrailHash, reviewHash, timestamp);
        const provenanceId = createPolicyEvolutionProvenanceId(`prov_${timestamp}_${provenanceSha256.slice(0, 12)}`);
        return {
            provenanceId,
            proposalId: proposal.proposalId,
            baseVersionHash,
            diffHash,
            simulationHash,
            guardrailHash,
            reviewHash,
            provenanceSha256,
            timestamp,
        };
    }
    /**
     * Cryptographically verifies a provenance record against constituent evaluation results.
     * Returns true only if recalculated SHA-256 seal matches exactly.
     * Xác minh mật mã một bản ghi nguồn gốc so với các kết quả đánh giá cấu thành.
     */
    verifyProvenance(record, proposal, simulationResult, guardrailResult, reviewRecord) {
        if (!record || !proposal || !simulationResult || !guardrailResult) {
            return false;
        }
        const expectedBaseVersionHash = crypto.createHash('sha256').update(proposal.baseVersionId).digest('hex');
        const expectedDiffHash = crypto.createHash('sha256').update(JSON.stringify(proposal.candidatePolicyDiff)).digest('hex');
        const expectedSimHash = crypto.createHash('sha256').update(`${simulationResult.simulationId}:${simulationResult.simulatedMttrDeltaMs}:${simulationResult.simulatedSafetyRegressionsCount}`).digest('hex');
        const expectedGuardHash = crypto.createHash('sha256').update(`${guardrailResult.passed}:${guardrailResult.safetyMarginScore}:${guardrailResult.violatesForbiddenProtection}`).digest('hex');
        let expectedReviewHash = 'PENDING_REVIEW';
        if (reviewRecord) {
            expectedReviewHash = crypto.createHash('sha256').update(`${reviewRecord.reviewId}:${reviewRecord.decision}:${reviewRecord.reviewedBy}:${reviewRecord.authorizationToken?.tokenId ?? 'NO_TOKEN'}`).digest('hex');
        }
        const recalculated = this.computeProvenanceHash(proposal.proposalId, expectedBaseVersionHash, expectedDiffHash, expectedSimHash, expectedGuardHash, expectedReviewHash, record.timestamp);
        return recalculated === record.provenanceSha256;
    }
}
