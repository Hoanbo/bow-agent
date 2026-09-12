import { type AuditLedger } from '../auditLedger.js';
import type { IncidentId, SupervisorDecisionSupportPackage } from '../diagnosis/diagnosisTypes.js';
import type { GovernedRemediationPipelineResponse } from '../remediation/remediationRuntime.js';
import type { RemediationExecutionResult, PostMitigationVerificationResult, RemediationRollbackResult, RemediationProvenanceRecord } from '../remediation/remediationTypes.js';
import { type IncidentClosureRecord, type RemediationEffectivenessMetrics, type HypothesisAccuracyRecord, type OscillationPattern, type BaselineReconciliationRecord, type PostMortemReport, type IncidentResilienceProvenanceRecord } from './incidentResilienceTypes.js';
import { IncidentClosureEngine } from './incidentClosureEngine.js';
import { RemediationEffectivenessEngine } from './remediationEffectivenessEngine.js';
import { HypothesisAccuracyScorer } from './hypothesisAccuracyScorer.js';
import { AntiOscillationDetector } from './antiOscillationDetector.js';
import { BaselineReconciliationEngine } from './baselineReconciliationEngine.js';
import { IncidentPostMortemSynthesizer } from './incidentPostMortemSynthesizer.js';
import { IncidentResilienceProvenanceEngine } from './incidentResilienceProvenanceEngine.js';
export interface ExecuteResiliencePipelineRequest {
    readonly incidentId: IncidentId;
    readonly targetId: string;
    readonly targetPath?: string;
    readonly decisionPackage?: SupervisorDecisionSupportPackage;
    readonly remediationResponse?: GovernedRemediationPipelineResponse;
    readonly executionResult?: RemediationExecutionResult;
    readonly verificationResult?: PostMitigationVerificationResult;
    readonly rollbackResult?: RemediationRollbackResult;
    readonly provenanceRecord?: RemediationProvenanceRecord;
    readonly preIncidentErrorRate?: number;
    readonly preIncidentLatencyP95Ms?: number;
    readonly hasContradictoryEvidence?: boolean;
}
export interface GovernedResiliencePipelineResponse {
    readonly incidentId: IncidentId;
    readonly closureRecord: IncidentClosureRecord;
    readonly effectivenessMetrics: RemediationEffectivenessMetrics;
    readonly hypothesisAccuracy?: HypothesisAccuracyRecord;
    readonly oscillationPattern: OscillationPattern;
    readonly baselineReconciliation: BaselineReconciliationRecord;
    readonly postMortemReport: PostMortemReport;
    readonly resilienceProvenance: IncidentResilienceProvenanceRecord;
}
export declare class IncidentResilienceRuntime {
    readonly closureEngine: IncidentClosureEngine;
    readonly effectivenessEngine: RemediationEffectivenessEngine;
    readonly accuracyScorer: HypothesisAccuracyScorer;
    readonly oscillationDetector: AntiOscillationDetector;
    readonly baselineEngine: BaselineReconciliationEngine;
    readonly postMortemSynthesizer: IncidentPostMortemSynthesizer;
    readonly resilienceProvenanceEngine: IncidentResilienceProvenanceEngine;
    private readonly auditLedger;
    private isUserStopActive;
    constructor(closureEngine?: IncidentClosureEngine, effectivenessEngine?: RemediationEffectivenessEngine, accuracyScorer?: HypothesisAccuracyScorer, oscillationDetector?: AntiOscillationDetector, baselineEngine?: BaselineReconciliationEngine, postMortemSynthesizer?: IncidentPostMortemSynthesizer, resilienceProvenanceEngine?: IncidentResilienceProvenanceEngine, auditLedger?: AuditLedger);
    /**
     * Sets or unsets the emergency USER_STOP signal.
     * Thiết lập hoặc hủy tín hiệu dừng khẩn cấp USER_STOP.
     */
    setUserStop(active: boolean): void;
    /**
     * Returns current status of the emergency USER_STOP signal.
     * Trả về trạng thái hiện tại của tín hiệu dừng khẩn cấp USER_STOP.
     */
    getUserStop(): boolean;
    /**
     * Executes the full governed incident resilience lifecycle.
     * Thực thi toàn bộ vòng đời phục hồi sự cố có quản trị.
     */
    executeResiliencePipeline(request: ExecuteResiliencePipelineRequest): GovernedResiliencePipelineResponse;
    /**
     * Helper to append an immutable event to the canonical AuditLedger.
     * Trợ giúp ghi một sự kiện bất biến vào AuditLedger chuẩn tắc.
     */
    private logAudit;
}
