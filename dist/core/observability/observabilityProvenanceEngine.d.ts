export interface ObservabilityProvenanceChain {
    readonly taskId: string;
    readonly agentId: string;
    readonly delegationId: string;
    readonly capabilityLeaseId: string;
    readonly sandboxId: string;
    readonly worktreeId: string;
    readonly releaseExecutionId: string;
    readonly deploymentId: string;
    readonly sessionId: string;
    readonly telemetrySampleHashes: readonly string[];
    readonly invariantEvidenceHashes: readonly string[];
    readonly driftEvidenceHashes: readonly string[];
    readonly alertFingerprints: readonly string[];
    readonly healthReportHash?: string;
    readonly auditArgumentsHash?: string;
}
export declare class ObservabilityProvenanceEngine {
    /**
     * Sanitizes sensitive authorization keys, tokens, and passwords from payloads.
     * Làm sạch các khóa ủy quyền, mã token và mật khẩu nhạy cảm khỏi trọng tải.
     */
    sanitizeSecrets<T>(data: T): T;
    /**
     * Computes a deterministic SHA-256 hash for the entire provenance chain.
     * Tính toán mã băm SHA-256 xác định cho toàn bộ chuỗi nguồn gốc.
     */
    computeChainHash(chain: ObservabilityProvenanceChain): string;
    /**
     * Constructs the verified provenance chain linking post-deployment observations to canonical roots.
     * Xây dựng chuỗi nguồn gốc đã xác minh liên kết các quan sát sau triển khai với các gốc chuẩn tắc.
     */
    buildChain(options: {
        readonly taskId: string;
        readonly agentId: string;
        readonly delegationId: string;
        readonly capabilityLeaseId: string;
        readonly sandboxId: string;
        readonly worktreeId: string;
        readonly releaseExecutionId: string;
        readonly deploymentId: string;
        readonly sessionId: string;
        readonly telemetrySampleHashes: readonly string[];
        readonly invariantEvidenceHashes: readonly string[];
        readonly driftEvidenceHashes: readonly string[];
        readonly alertFingerprints: readonly string[];
        readonly healthReportHash?: string;
        readonly auditArgumentsHash?: string;
    }): {
        readonly chain: ObservabilityProvenanceChain;
        readonly chainHash: string;
    };
}
