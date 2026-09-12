import { type PromotionProposal, type PromotionApprovalRecord, type PromotionExecutionResult, type PromotionEvidenceBundle } from './promotionTypes.js';
export declare class PromotionProvenanceEngine {
    /**
     * Computes deterministic SHA-256 hash representing an evidence bundle.
     * Tính toán mã băm SHA-256 tất định đại diện cho một gói bằng chứng.
     */
    static calculateEvidenceHash(promotionId: string, proposalHash: string, diffHash: string, preManifestHash: string, postManifestHash: string, reviewerId: string, decision: string): string;
    /**
     * Constructs an immutable cryptographic evidence bundle for a completed promotion.
     * Xây dựng một gói bằng chứng mật mã bất biến cho một đợt xúc tiến đã hoàn tất.
     */
    createEvidenceBundle(proposal: PromotionProposal, approval: PromotionApprovalRecord, executionResult: PromotionExecutionResult, authorizationTokenId?: string): PromotionEvidenceBundle;
    /**
     * Verifies the cryptographic integrity of an evidence bundle against its constituent hashes.
     * Xác minh tính toàn vẹn mật mã của gói bằng chứng so với các mã băm cấu thành của nó.
     */
    verifyEvidenceBundleIntegrity(bundle: PromotionEvidenceBundle): boolean;
}
