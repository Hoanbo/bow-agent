// src/core/crossIncident/crossIncidentTypes.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Canonical type definitions and DTO contracts for cross-incident correlation,
// historical hypothesis reliability, stratified remediation tracking, systemic
// pattern detection, advisory feedback, cryptographic provenance, and bounded archiving.
// Định nghĩa kiểu chuẩn tắc và các hợp đồng DTO cho tương quan liên sự cố,
// độ tin cậy giả thuyết lịch sử, theo dõi khắc phục phân tầng, phát hiện mẫu hệ thống,
// tư vấn phản hồi quản trị, nguồn gốc mật mã và lưu trữ có giới hạn.
//
// Authority Invariants:
// - Level 0 Read-Only Analysis + Level 1 Advisory Recommendation ONLY.
// - Zero authorization token issuance (issueToken prohibited).
// - Zero supervisory self-approval (approve prohibited).
// - Zero PDP / gate / kill-switch mutation (POLICY_RECOMMENDATION != POLICY_MUTATION).
// - CORRELATION != CAUSATION (humility enforced; correlation ceiling <= 0.95).

import type { IncidentId } from '../diagnosis/diagnosisTypes.js';
import type { RemediationActionClass } from '../remediation/remediationTypes.js';
import type {
  PostMortemReport,
  IncidentClosureRecord,
  RemediationEffectivenessMetrics,
} from '../incidentResilience/incidentResilienceTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// CÁC ĐỊNH DANH ĐƯỢC GẮN NHÃN (BRANDED)
// ============================================================================

export type IncidentArchiveId = string & { readonly __brand: unique symbol };
export type PatternClusterId = string & { readonly __brand: unique symbol };
export type SystemicPatternId = string & { readonly __brand: unique symbol };
export type AdvisoryId = string & { readonly __brand: unique symbol };
export type CrossIncidentProvenanceId = string & { readonly __brand: unique symbol };

export function createIncidentArchiveId(raw: string): IncidentArchiveId {
  return raw as IncidentArchiveId;
}

export function createPatternClusterId(raw: string): PatternClusterId {
  return raw as PatternClusterId;
}

export function createSystemicPatternId(raw: string): SystemicPatternId {
  return raw as SystemicPatternId;
}

export function createAdvisoryId(raw: string): AdvisoryId {
  return raw as AdvisoryId;
}

export function createCrossIncidentProvenanceId(raw: string): CrossIncidentProvenanceId {
  return raw as CrossIncidentProvenanceId;
}

// ============================================================================
// ARCHIVE DTO & BOUNDED QUERY CONTRACTS
// DTO LƯU TRỮ & HỢP ĐỒNG TRUY VẤN CÓ GIỚI HẠN
// ============================================================================

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
  readonly limit?: number; // Default 50, Maximum 200
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

// ============================================================================
// CROSS-INCIDENT CORRELATION CONTRACTS
// HỢP ĐỒNG TƯƠNG QUAN LIÊN SỰ CỐ
// ============================================================================

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
  readonly correlationScore: number; // Strictly bounded: 0.0 <= score <= 0.95
  readonly correlationType: CorrelationType;
  readonly commonAttributes: CorrelatedIncidentAttributes;
  readonly timeSpanMs: number;
  readonly isProvisionalHeuristic: true; // Explicit flag: provisional heuristic parameter
  readonly epistemicCaveat: 'CORRELATION != CAUSATION';
  readonly createdAt: number;
}

// ============================================================================
// SYSTEMIC FAILURE DETECTION CONTRACTS
// HỢP ĐỒNG PHÁT HIỆN LỖI MANG TÍNH HỆ THỐNG
// ============================================================================

/**
 * Allowed classifications ONLY. Never implies proven root causality.
 * CHỈ các phân loại được phép. Tuyệt đối không hàm ý nguyên nhân gốc rễ đã chứng minh.
 */
export type SystemicFailureClassification =
  | 'OBSERVED_CORRELATION'
  | 'STRONG_CORRELATION'
  | 'POSSIBLE_SYSTEMIC_PATTERN'
  | 'INCONCLUSIVE';

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

// ============================================================================
// HYPOTHESIS RELIABILITY CONTRACTS
// HỢP ĐỒNG ĐỘ TIN CẬY CỦA GIẢ THUYẾT
// ============================================================================

export type HypothesisOutcomeSource =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'REFUTED'
  | 'INCONCLUSIVE';

export type HypothesisReliabilityStatus =
  | 'PUBLISHED'
  | 'INSUFFICIENT_SAMPLE_SIZE';

export interface HypothesisReliabilityScore {
  readonly hypothesisType: string;
  readonly sampleCount: number; // N
  readonly supportedCount: number;
  readonly partiallySupportedCount: number;
  readonly refutedCount: number;
  readonly inconclusiveCount: number; // Excluded from reliability formula denominator
  readonly reliability: number | null; // Null when sampleCount < 3
  readonly status: HypothesisReliabilityStatus;
  readonly evaluatedAt: number;
}

// ============================================================================
// STRATIFIED REMEDIATION RELIABILITY CONTRACTS
// HỢP ĐỒNG ĐỘ TIN CẬY KHẮC PHỤC ĐƯỢC PHÂN TẦNG (SIMPSON'S PARADOX DEFENSE)
// ============================================================================
// (RemediationActionClass reused from remediation domain: CONFIG_SYNC | PROCESS_RESTART | ROLLBACK | TRAFFIC_DRAIN)

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
  readonly successRate: number; // [0.0, 1.0]
  readonly rollbackRate: number; // [0.0, 1.0]
  readonly meanTimeToRecoveryMs: number;
  readonly evaluatedAt: number;
}

// ============================================================================
// GOVERNANCE FEEDBACK & ADVISORY CONTRACTS
// HỢP ĐỒNG PHẢN HỒI QUẢN TRỊ & TƯ VẤN
// ============================================================================

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

// ============================================================================
// CROSS-INCIDENT PROVENANCE CONTRACTS
// HỢP ĐỒNG NGUỒN GỐC LIÊN SỰ CỐ
// ============================================================================

export interface CrossIncidentProvenanceRecord {
  readonly provenanceId: CrossIncidentProvenanceId;
  readonly reportId: string;
  readonly clusterHash: string;
  readonly constituentPostMortemHashes: readonly string[]; // Lexicographically sorted
  readonly provenanceSha256: string;
  readonly timestamp: number;
}
