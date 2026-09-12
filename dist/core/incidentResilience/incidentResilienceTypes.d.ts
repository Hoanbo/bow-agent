import type { IncidentId, HypothesisId, DecisionPackageId, RootCauseHypothesis } from '../diagnosis/diagnosisTypes.js';
import type { RemediationPlanId, RemediationExecutionId } from '../remediation/remediationTypes.js';
import type { AggregationBaselineOptions } from '../observability/telemetryAggregationEngine.js';
export type IncidentClosureId = string & {
    readonly __brand: unique symbol;
};
export type PostMortemReportId = string & {
    readonly __brand: unique symbol;
};
export type OscillationEventId = string & {
    readonly __brand: unique symbol;
};
export type ReconciliationId = string & {
    readonly __brand: unique symbol;
};
export declare function createIncidentClosureId(raw: string): IncidentClosureId;
export declare function createPostMortemReportId(raw: string): PostMortemReportId;
export declare function createOscillationEventId(raw: string): OscillationEventId;
export declare function createReconciliationId(raw: string): ReconciliationId;
/**
 * Terminal incident closure states. Fail-closed to ESCALATED_TO_HUMAN if ambiguous.
 * Các trạng thái đóng sự cố cuối cùng. Đóng khi thất bại thành ESCALATED_TO_HUMAN nếu mơ hồ.
 */
export type IncidentClosureStatus = 'CLOSED_RESOLVED' | 'CLOSED_ROLLED_BACK' | 'ESCALATED_TO_HUMAN';
/**
 * Advisory hypothesis outcome classification based on post-remediation evidence.
 * Phân loại kết quả giả thuyết có tính tư vấn dựa trên bằng chứng sau khắc phục.
 */
export type HypothesisOutcomeClassification = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'REFUTED' | 'INCONCLUSIVE';
/**
 * Flapping / oscillation risk levels for repeating incidents.
 * Mức độ rủi ro dao động / flapping đối với các sự cố lặp lại.
 */
export type FlappingRiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
/**
 * Baseline reconciliation status after authorized state mutation.
 * Trạng thái đối soát đường cơ sở sau đột biến trạng thái được ủy quyền.
 */
export type BaselineReconciliationStatus = 'RECONCILED' | 'SKIPPED_NOT_VERIFIED' | 'SKIPPED_ROLLED_BACK' | 'SKIPPED_USER_STOP' | 'FAILED_INVARIANT';
/**
 * Immutable incident closure record certifying lifecycle termination.
 * Bản ghi đóng sự cố bất biến chứng nhận kết thúc vòng đời.
 */
export interface IncidentClosureRecord {
    readonly closureId: IncidentClosureId;
    readonly incidentId: IncidentId;
    readonly status: IncidentClosureStatus;
    readonly closureReason: string;
    readonly remediationPlanId?: RemediationPlanId;
    readonly executionId?: RemediationExecutionId;
    readonly verified: boolean;
    readonly rolledBack: boolean;
    readonly closedAt: number;
    readonly closureCertificateHash: string;
    readonly requiresHumanFollowUp: boolean;
}
/**
 * Quantitative remediation effectiveness metrics.
 * Số liệu định lượng về hiệu quả khắc phục sự cố.
 */
export interface RemediationEffectivenessMetrics {
    readonly recoveryScore: number;
    readonly errorRateImprovement: number;
    readonly latencyRecoveryDeltaMs: number;
    readonly timeToSteadyStateMs: number;
    readonly meanTimeToRecoveryMs: number;
    readonly verificationOutcome: boolean;
    readonly rollbackOccurred: boolean;
    readonly sideEffectFootprintScore: number;
    readonly isUnavailableOrUnknown: boolean;
    readonly evaluatedAt: number;
}
/**
 * Diagnostic hypothesis accuracy and calibration record.
 * Bản ghi độ chính xác và hiệu chuẩn giả thuyết chẩn đoán.
 */
export interface HypothesisAccuracyRecord {
    readonly hypothesisId: HypothesisId;
    readonly originalConfidence: number;
    readonly originalUncertainty: number;
    readonly classification: HypothesisOutcomeClassification;
    readonly calibrationWeight: number;
    readonly justification: string;
    readonly evaluatedAt: number;
}
/**
 * Sliding window oscillation & recurrence detection pattern.
 * Mẫu phát hiện dao động và tái diễn trong cửa sổ trượt.
 */
export interface OscillationPattern {
    readonly patternId: OscillationEventId;
    readonly signature: string;
    readonly targetId: string;
    readonly recurrenceCount: number;
    readonly windowStartMs: number;
    readonly windowEndMs: number;
    readonly isFlapping: boolean;
    readonly riskLevel: FlappingRiskLevel;
    readonly advisoryRecommendation: string;
    readonly requiresHumanEscalation: boolean;
}
/**
 * Post-mitigation baseline reconciliation record.
 * Bản ghi đối soát đường cơ sở sau khi khắc phục.
 */
export interface BaselineReconciliationRecord {
    readonly reconciliationId: ReconciliationId;
    readonly targetId: string;
    readonly status: BaselineReconciliationStatus;
    readonly reconciledBaseline?: AggregationBaselineOptions;
    readonly expectedMutationNote?: string;
    readonly reconciledAt: number;
    readonly reconciliationHash: string;
}
/**
 * Immutable post-mortem summary binding all upstream lifecycle phases.
 * Báo cáo hậu kiểm bất biến liên kết tất cả các giai đoạn vòng đời thượng nguồn.
 */
export interface PostMortemReport {
    readonly reportId: PostMortemReportId;
    readonly incidentId: IncidentId;
    readonly targetId: string;
    readonly evidenceClusterId?: string;
    readonly primaryHypothesis?: RootCauseHypothesis;
    readonly hypothesisAccuracy?: HypothesisAccuracyRecord;
    readonly decisionPackageId?: DecisionPackageId;
    readonly authorizationTokenReference?: string;
    readonly remediationPlanId?: RemediationPlanId;
    readonly executionId?: RemediationExecutionId;
    readonly verificationSummary: string;
    readonly rollbackOutcome?: string;
    readonly effectivenessMetrics: RemediationEffectivenessMetrics;
    readonly oscillationSummary?: OscillationPattern;
    readonly baselineReconciliation: BaselineReconciliationRecord;
    readonly closureRecord: IncidentClosureRecord;
    readonly upstreamProvenanceHash: string;
    readonly postMortemSha256: string;
    readonly generatedAt: number;
}
/**
 * Resilience provenance record binding closure, post-mortem, and remediation hashes.
 * Bản ghi nguồn gốc khả năng phục hồi liên kết băm đóng sự cố, hậu kiểm và khắc phục.
 */
export interface IncidentResilienceProvenanceRecord {
    readonly incidentId: IncidentId;
    readonly closureId: IncidentClosureId;
    readonly postMortemId: PostMortemReportId;
    readonly upstreamRemediationHash: string;
    readonly closureCertificateHash: string;
    readonly postMortemHash: string;
    readonly resilienceProvenanceHash: string;
    readonly timestamp: number;
}
