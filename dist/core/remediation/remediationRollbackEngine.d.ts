import type { GovernedRemediationPlan, RemediationSnapshot, RemediationRollbackResult, RemediationExecutionId } from './remediationTypes.js';
export interface ExecuteRollbackOptions {
    readonly plan: GovernedRemediationPlan;
    readonly executionId: RemediationExecutionId;
    readonly snapshot: RemediationSnapshot;
    readonly reason: string;
    readonly baseDirectory?: string;
    readonly simulateRollbackFailure?: boolean;
}
export declare class RemediationRollbackEngine {
    /**
     * Executes fail-safe rollback using pre-remediation snapshot.
     * Thực thi khôi phục an toàn sử dụng ảnh chụp nhanh trước khắc phục.
     */
    executeRollback(options: ExecuteRollbackOptions): Promise<RemediationRollbackResult>;
    computeRollbackSha256(executionId: RemediationExecutionId, snapshotId: string, success: boolean, restoredItems: readonly string[]): string;
}
