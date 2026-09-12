import { type ReleaseExecutionRequest, type ReleaseExecutionEvidence, type ReleaseExecutionResult, type ReleaseExecutionState, type ReleaseExecutionTarget } from './releaseExecutionTypes.js';
export declare class ReleaseExecutionProvenanceEngine {
    /**
     * Computes deterministic SHA-256 hash for execution request.
     * Tính toán mã băm SHA-256 tất định cho yêu cầu thực thi.
     */
    static calculateExecutionHash(request: ReleaseExecutionRequest): string;
    /**
     * Computes deterministic SHA-256 hash for execution evidence bundle.
     * Tính toán mã băm SHA-256 tất định cho gói bằng chứng thực thi.
     */
    static calculateEvidenceHash(executionId: string, candidateId: string, verificationId: string, preManifestHash: string, postManifestHash: string, authorizationRef: string, executedAt: number): string;
    /**
     * Computes deterministic SHA-256 hash for the final execution result.
     * Tính toán mã băm SHA-256 tất định cho kết quả thực thi cuối cùng.
     */
    static calculateResultHash(executionId: string, candidateId: string, state: ReleaseExecutionState, preManifestHash: string, postManifestHash: string | undefined, filesMutated: readonly string[], completedAt: number): string;
    /**
     * Assembles the cryptographic ReleaseExecutionEvidence.
     * Lắp ráp ReleaseExecutionEvidence mật mã.
     */
    static assembleEvidence(request: ReleaseExecutionRequest, preManifestHash: string, postManifestHash: string, authorizationRef: string, executedAt: number): ReleaseExecutionEvidence;
    /**
     * Compiles the final ReleaseExecutionResult.
     * Biên dịch ReleaseExecutionResult cuối cùng.
     */
    static compileResult(params: {
        request: ReleaseExecutionRequest;
        state: ReleaseExecutionState;
        target: ReleaseExecutionTarget;
        preReleaseManifestHash: string;
        postReleaseManifestHash?: string;
        filesMutated: readonly string[];
        rollbackOccurred: boolean;
        rollbackReason?: string;
        errorDetails?: string;
        evidence?: ReleaseExecutionEvidence;
        startedAt: number;
        completedAt: number;
    }): ReleaseExecutionResult;
}
