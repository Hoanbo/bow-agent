import type { PostMitigationVerificationResult, RemediationRollbackResult } from '../remediation/remediationTypes.js';
import { type BaselineReconciliationRecord } from './incidentResilienceTypes.js';
export interface ReconcileBaselineInput {
    readonly targetId: string;
    readonly verificationResult?: PostMitigationVerificationResult;
    readonly rollbackResult?: RemediationRollbackResult;
    readonly isUserStopActive?: boolean;
    readonly hasSecurityViolation?: boolean;
    readonly hasContradictoryEvidence?: boolean;
}
export declare class BaselineReconciliationEngine {
    /**
     * Safely calculates a reconciled baseline for post-remediation observability without disabling drift detection.
     * Tính toán an toàn đường cơ sở đã đối soát cho việc quan sát sau khắc phục mà không vô hiệu hóa phát hiện sai lệch.
     */
    reconcileBaseline(input: ReconcileBaselineInput): BaselineReconciliationRecord;
    private buildRecord;
}
