import type { GovernedRemediationPlan, RemediationExecutionResult, RemediationSnapshot, PostMitigationVerificationResult, RemediationRollbackResult, RemediationProvenanceRecord } from './remediationTypes.js';
export interface BuildProvenanceOptions {
    readonly plan: GovernedRemediationPlan;
    readonly tokenId: string;
    readonly snapshot: RemediationSnapshot;
    readonly executionResult: RemediationExecutionResult;
    readonly verificationResult?: PostMitigationVerificationResult;
    readonly rollbackResult?: RemediationRollbackResult;
}
export declare class RemediationProvenanceEngine {
    /**
     * Sanitizes secrets and credentials from objects before provenance generation or logging.
     * Làm sạch các bí mật và thông tin xác thực khỏi đối tượng trước khi tạo nguồn gốc hoặc ghi nhật ký.
     */
    sanitizeSecrets(obj: unknown): unknown;
    /**
     * Builds an immutable, tamper-evident cryptographic provenance record.
     * Xây dựng bản ghi nguồn gốc mật mã bất biến, chống giả mạo.
     */
    buildProvenanceRecord(options: BuildProvenanceOptions): RemediationProvenanceRecord;
    /**
     * Verifies the cryptographic integrity of a provenance record against its components.
     * Xác minh tính toàn vẹn mật mã của bản ghi nguồn gốc dựa trên các thành phần của nó.
     */
    verifyProvenanceIntegrity(record: RemediationProvenanceRecord, tokenId: string, snapshotSha256: string, executionSha256: string, verification?: {
        sha256: string;
        passed: boolean;
    }, rollback?: {
        sha256: string;
        success: boolean;
    }): boolean;
}
