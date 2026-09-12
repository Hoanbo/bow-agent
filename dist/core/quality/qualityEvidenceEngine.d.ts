import { type QualityEvidenceBundle, type BuildExecutionResult, type TestExecutionResult, type CommandExecutionContext } from './qualityTypes.js';
export interface CreateEvidenceBundleInput {
    readonly context: CommandExecutionContext;
    readonly manifestHash: string;
    readonly worktreeHash?: string;
    readonly buildResults: readonly BuildExecutionResult[];
    readonly testResults: readonly TestExecutionResult[];
    readonly securityScanResult?: {
        readonly passed: boolean;
        readonly prohibitedApisFound: number;
        readonly scanHash: string;
    };
}
export declare class QualityEvidenceEngine {
    /**
     * Computes deterministic SHA-256 hash representing the full evidence bundle content.
     * Tính toán mã băm SHA-256 tất định đại diện cho toàn bộ nội dung gói bằng chứng.
     */
    static hashEvidenceBundle(evidenceId: string, context: CommandExecutionContext, manifestHash: string, buildHashes: readonly string[], testHashes: readonly string[], securityScanHash?: string): string;
    /**
     * Constructs an immutable, cryptographically verifiable QualityEvidenceBundle.
     * Xây dựng một gói QualityEvidenceBundle bất biến, có thể kiểm chứng bằng mật mã.
     */
    createEvidenceBundle(input: CreateEvidenceBundleInput): QualityEvidenceBundle;
}
