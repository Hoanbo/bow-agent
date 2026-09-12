import type { IncidentId } from '../diagnosis/diagnosisTypes.js';
import type { RemediationActionClass } from '../remediation/remediationTypes.js';
import type { PostMortemReport, IncidentClosureRecord, RemediationEffectivenessMetrics } from '../incidentResilience/incidentResilienceTypes.js';
export type IncidentArchiveId = string & {
    readonly __brand: unique symbol;
};
export type PatternClusterId = string & {
    readonly __brand: unique symbol;
};
export type SystemicPatternId = string & {
    readonly __brand: unique symbol;
};
export type AdvisoryId = string & {
    readonly __brand: unique symbol;
};
export type CrossIncidentProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createIncidentArchiveId(raw: string): IncidentArchiveId;
export declare function createPatternClusterId(raw: string): PatternClusterId;
export declare function createSystemicPatternId(raw: string): SystemicPatternId;
export declare function createAdvisoryId(raw: string): AdvisoryId;
export declare function createCrossIncidentProvenanceId(raw: string): CrossIncidentProvenanceId;
/**
 * Immutable, sanitized record of a closed incident in persistent history.
 * Bản ghi bất biến, đã làm sạch của một sự cố đã đóng trong lịch sử bền vững.
 */
export interface ArchivedIncidentRecord {
    readonly archiveId: IncidentArchiveId;
    readonly incidentId: IncidentId;
    readonly deterministicIngestionId: string;
    readonly userPartition: string;
    readonly targetId: string;
    readonly failureCategory: string;
    readonly actionClass: RemediationActionClass;
    readonly postMortemReport: PostMortemReport;
    readonly closureRecord: IncidentClosureRecord;
    readonly effectivenessMetrics: RemediationEffectivenessMetrics;
    readonly closureCertificateHash: string;
    readonly postMortemSha256: string;
    readonly ingestedAt: number;
}
/**
 * Bounded query filter for querying historical incidents without unbounded in-memory loading.
 * Bộ lọc truy vấn có giới hạn để tra cứu sự cố lịch sử mà không tải bộ nhớ không giới hạn.
 */
export interface IncidentArchiveQueryFilter {
    readonly targetId?: string;
    readonly category?: string;
    readonly actionClass?: RemediationActionClass;
    readonly timeWindow?: {
        readonly startMs: number;
        readonly endMs: number;
    };
    readonly limit?: number;
    readonly cursor?: string;
}
/**
 * Bounded query result with cursor pagination support.
 * Kết quả truy vấn có giới hạn hỗ trợ phân trang theo con trỏ cursor.
 */
export interface IncidentArchiveQueryResult {
    readonly records: readonly ArchivedIncidentRecord[];
    readonly nextCursor?: string;
    readonly totalMatching: number;
    readonly isTruncated: boolean;
}
export type CorrelationType = 'TEMPORAL' | 'TOPOLOGICAL' | 'HYBRID';
/**
 * Common topological and contextual attributes shared among correlated incidents.
 * Các thuộc tính cấu trúc liên kết và ngữ cảnh chung được chia sẻ giữa các sự cố tương quan.
 */
export interface CorrelatedIncidentAttributes {
    readonly targetId?: string;
    readonly service?: string;
    readonly dependencyNodes?: readonly string[];
    readonly configurationVersion?: string;
    readonly failureCategory?: string;
}
/**
 * Cross-incident correlation cluster.
 * Cụm tương quan liên sự cố.
 */
export interface CrossIncidentCorrelationCluster {
    readonly clusterId: PatternClusterId;
    readonly incidentIds: readonly IncidentId[];
    readonly correlationScore: number;
    readonly correlationType: CorrelationType;
    readonly commonAttributes: CorrelatedIncidentAttributes;
    readonly timeSpanMs: number;
    readonly isProvisionalHeuristic: true;
    readonly epistemicCaveat: 'CORRELATION != CAUSATION';
    readonly createdAt: number;
}
/**
 * Allowed classifications ONLY. Never implies proven root causality.
 * CHỈ các phân loại được phép. Tuyệt đối không hàm ý nguyên nhân gốc rễ đã chứng minh.
 */
export type SystemicFailureClassification = 'OBSERVED_CORRELATION' | 'STRONG_CORRELATION' | 'POSSIBLE_SYSTEMIC_PATTERN' | 'INCONCLUSIVE';
export interface SystemicFailurePattern {
    readonly patternId: SystemicPatternId;
    readonly classification: SystemicFailureClassification;
    readonly affectedTargets: readonly string[];
    readonly constituentIncidentIds: readonly IncidentId[];
    readonly patternDescription: string;
    readonly correlationScore: number;
    readonly detectedAt: number;
    readonly epistemicCaveat: 'PATTERN_DETECTION_NOT_CAUSAL_ATTRIBUTION';
}
export type HypothesisOutcomeSource = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'REFUTED' | 'INCONCLUSIVE';
export type HypothesisReliabilityStatus = 'PUBLISHED' | 'INSUFFICIENT_SAMPLE_SIZE';
export interface HypothesisReliabilityScore {
    readonly hypothesisType: string;
    readonly sampleCount: number;
    readonly supportedCount: number;
    readonly partiallySupportedCount: number;
    readonly refutedCount: number;
    readonly inconclusiveCount: number;
    readonly reliability: number | null;
    readonly status: HypothesisReliabilityStatus;
    readonly evaluatedAt: number;
}
export interface StratifiedRemediationKey {
    readonly targetId: string;
    readonly failureCategory: string;
    readonly actionClass: RemediationActionClass;
}
export interface RemediationReliabilityRecord {
    readonly key: StratifiedRemediationKey;
    readonly sampleCount: number;
    readonly successfulOutcomes: number;
    readonly rollbackOutcomes: number;
    readonly successRate: number;
    readonly rollbackRate: number;
    readonly meanTimeToRecoveryMs: number;
    readonly evaluatedAt: number;
}
export interface PolicyRefinementAdvisory {
    readonly advisoryId: AdvisoryId;
    readonly targetScope: string;
    readonly actionClass: RemediationActionClass | string;
    readonly totalApprovals: number;
    readonly totalDenials: number;
    readonly totalOverrides: number;
    readonly approvalRate: number;
    readonly advisoryRecommendation: string;
    readonly invariantNotice: 'POLICY_RECOMMENDATION != POLICY_MUTATION';
    readonly generatedAt: number;
}
export interface CrossIncidentProvenanceRecord {
    readonly provenanceId: CrossIncidentProvenanceId;
    readonly reportId: string;
    readonly clusterHash: string;
    readonly constituentPostMortemHashes: readonly string[];
    readonly provenanceSha256: string;
    readonly timestamp: number;
}
