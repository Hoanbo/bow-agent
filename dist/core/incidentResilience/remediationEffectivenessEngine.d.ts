import type { RemediationExecutionResult, PostMitigationVerificationResult, RemediationRollbackResult } from '../remediation/remediationTypes.js';
import type { RemediationEffectivenessMetrics } from './incidentResilienceTypes.js';
export interface EvaluateEffectivenessInput {
    readonly executionResult?: RemediationExecutionResult;
    readonly verificationResult?: PostMitigationVerificationResult;
    readonly rollbackResult?: RemediationRollbackResult;
    readonly preIncidentErrorRate?: number;
    readonly preIncidentLatencyP95Ms?: number;
}
export declare class RemediationEffectivenessEngine {
    /**
     * Calculates deterministic recovery and effectiveness metrics from actual execution and telemetry data.
     * Tính toán các chỉ số phục hồi và hiệu quả xác định từ dữ liệu thực thi và đo từ xa thực tế.
     */
    evaluateEffectiveness(input: EvaluateEffectivenessInput): RemediationEffectivenessMetrics;
}
