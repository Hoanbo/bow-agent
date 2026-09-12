// src/core/promotion/promotionProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Maintains the complete cryptographic provenance chain from task origin to audit export.
// Duy trì chuỗi nguồn gốc mật mã hoàn chỉnh từ khởi điểm tác vụ đến xuất kiểm toán.
//
// STRICT INVARIANTS:
// - EVIDENCE != AUTHORITY
// - PROVENANCE != AUTHORIZATION
// - TRACEABILITY == ABSOLUTE
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
export class PromotionProvenanceEngine {
    /**
     * Computes deterministic SHA-256 hash representing an evidence bundle.
     * Tính toán mã băm SHA-256 tất định đại diện cho một gói bằng chứng.
     */
    static calculateEvidenceHash(promotionId, proposalHash, diffHash, preManifestHash, postManifestHash, reviewerId, decision) {
        const payload = `${promotionId}:${proposalHash}:${diffHash}:${preManifestHash}:${postManifestHash}:${reviewerId}:${decision}`;
        return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    }
    /**
     * Constructs an immutable cryptographic evidence bundle for a completed promotion.
     * Xây dựng một gói bằng chứng mật mã bất biến cho một đợt xúc tiến đã hoàn tất.
     */
    createEvidenceBundle(proposal, approval, executionResult, authorizationTokenId) {
        const now = Date.now();
        const evidenceHash = PromotionProvenanceEngine.calculateEvidenceHash(proposal.promotionId, proposal.provenance.proposalHash, proposal.diffHash, executionResult.previousManifestHash, executionResult.promotedManifestHash, approval.reviewerId, approval.decision);
        return {
            promotionId: proposal.promotionId,
            evidenceHash,
            proposalHash: proposal.provenance.proposalHash,
            diffHash: proposal.diffHash,
            prePromotionManifestHash: executionResult.previousManifestHash,
            postPromotionManifestHash: executionResult.promotedManifestHash,
            provenance: proposal.provenance,
            approvalRecord: approval,
            authorizationTokenId,
            createdAt: now,
        };
    }
    /**
     * Verifies the cryptographic integrity of an evidence bundle against its constituent hashes.
     * Xác minh tính toàn vẹn mật mã của gói bằng chứng so với các mã băm cấu thành của nó.
     */
    verifyEvidenceBundleIntegrity(bundle) {
        const expected = PromotionProvenanceEngine.calculateEvidenceHash(bundle.promotionId, bundle.proposalHash, bundle.diffHash, bundle.prePromotionManifestHash, bundle.postPromotionManifestHash, bundle.approvalRecord.reviewerId, bundle.approvalRecord.decision);
        return expected === bundle.evidenceHash;
    }
}
