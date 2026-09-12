import { type DeploymentRequest, type DeploymentCandidate, type DeploymentApprovalBinding, type DeploymentAuthorizationBinding, type CanaryVerificationRecord, type RolloutRingLevel } from './deploymentTypes.js';
export interface DeploymentProvenanceChain {
    readonly taskId: string;
    readonly operatorId: string;
    readonly sessionId: string;
    readonly delegationId: string;
    readonly capabilityLeaseId: string;
    readonly releaseExecutionId: string;
    readonly candidateId: string;
    readonly candidateFingerprint: string;
    readonly ownerApprovalReviewer?: string;
    readonly authorizationTokenHash?: string;
    readonly targetRing: RolloutRingLevel;
    readonly canaryEvidenceHashes: readonly string[];
    readonly preDeploymentManifestHash: string;
    readonly postDeploymentManifestHash: string;
}
export declare class DeploymentProvenanceEngine {
    /**
     * Sanitizes sensitive fields from records to prevent secret leakage into audit evidence.
     * Làm sạch các trường nhạy cảm khỏi các bản ghi để ngăn chặn rò rỉ bí mật vào bằng chứng kiểm toán.
     */
    sanitizeSecrets<T>(data: T): T;
    /**
     * Assembles a deterministic SHA-256 provenance hash binding all chain stages.
     * Lắp ráp một mã băm nguồn gốc SHA-256 xác định ràng buộc tất cả các giai đoạn của chuỗi.
     */
    computeProvenanceHash(chain: DeploymentProvenanceChain): string;
    /**
     * Builds the complete provenance chain record from deployment artifacts.
     * Xây dựng bản ghi chuỗi nguồn gốc hoàn chỉnh từ các tạo tác triển khai.
     */
    buildChain(options: {
        readonly request: DeploymentRequest;
        readonly candidate: DeploymentCandidate;
        readonly approval?: DeploymentApprovalBinding;
        readonly authorization?: DeploymentAuthorizationBinding;
        readonly targetRing: RolloutRingLevel;
        readonly canaryRecords: readonly CanaryVerificationRecord[];
        readonly preDeploymentManifestHash: string;
        readonly postDeploymentManifestHash: string;
    }): {
        readonly chain: DeploymentProvenanceChain;
        readonly provenanceHash: string;
    };
}
