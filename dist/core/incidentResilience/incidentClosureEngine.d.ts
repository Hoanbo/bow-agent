import type { IncidentId } from '../diagnosis/diagnosisTypes.js';
import type { RemediationPlanId, RemediationExecutionId, PostMitigationVerificationResult, RemediationRollbackResult } from '../remediation/remediationTypes.js';
import { type IncidentClosureRecord } from './incidentResilienceTypes.js';
export interface EvaluateClosureInput {
    readonly incidentId: IncidentId;
    readonly remediationPlanId?: RemediationPlanId;
    readonly executionId?: RemediationExecutionId;
    readonly verificationResult?: PostMitigationVerificationResult;
    readonly rollbackResult?: RemediationRollbackResult;
    readonly isUserStopActive?: boolean;
    readonly forceEscalationReason?: string;
}
export declare class IncidentClosureEngine {
    /**
     * Evaluates remediation outcome and transitions incident to a deterministic terminal closure record.
     * Đánh giá kết quả khắc phục và chuyển đổi sự cố thành bản ghi đóng cuối cùng xác định.
     */
    evaluateClosure(input: EvaluateClosureInput): IncidentClosureRecord;
    private buildRecord;
}
