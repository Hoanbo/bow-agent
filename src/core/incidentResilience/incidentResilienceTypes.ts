// src/core/incidentResilience/incidentResilienceTypes.ts
// BOWCON V4.0 — MS-1.3.56: GOVERNED POST-REMEDIATION RESILIENCE, RECOVERY OUTCOME ANALYSIS & INCIDENT LIFECYCLE CLOSURE PIPELINE
//
// Canonical TypeScript contracts, branded identifiers, and fail-closed state machines
// for post-remediation resilience, recovery outcome analysis, hypothesis calibration,
// recurrence/oscillation detection, baseline reconciliation, and tamper-evident post-mortem synthesis.
// Các hợp đồng TypeScript chuẩn tắc, định danh thương hiệu và máy trạng thái đóng khi thất bại
// cho khả năng phục hồi sau khắc phục, phân tích kết quả phục hồi, hiệu chuẩn giả thuyết,
// phát hiện lặp lại/dao động, đối soát đường cơ sở và tổng hợp hậu kiểm chống giả mạo.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - CONFIDENCE != AUTHORITY
// - RECOMMENDATION != AUTHORIZATION
// - LEARNING != AUTHORIZATION
// - ANALYSIS != EXECUTION
// - DECISION_PACKAGE != OWNER_DECISION
// - AGENT_COUNT != AUTHORITY_COUNT
// - NO_NEW_AUTHORITY_BOUNDARY: Analytical, supervisory, and advisory only. Zero execution or mutation authority.
// - NO_TOKEN_ISSUANCE: Incident resilience plane MUST NEVER issue execution authorization tokens (count === 0).
// - NO_SELF_APPROVAL: Incident resilience plane MUST NEVER self-approve human gate requests (count === 0).
// - USER_STOP_SUPREMACY: Immediate fail-closed transition to ESCALATED_TO_HUMAN if USER_STOP signal is active.
// - CANONICAL_AUDIT: All resilience events recorded in globalAuditLedger under domain 'INCIDENT_RESILIENCE'.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, TOUCHES = 0. Fail closed with SECURITY_VIOLATION.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import type {
  IncidentId,
  HypothesisId,
  DecisionPackageId,
  RootCauseHypothesis,
} from '../diagnosis/diagnosisTypes.js';

import type {
  RemediationPlanId,
  RemediationExecutionId,
  PostMitigationVerificationResult,
  RemediationRollbackResult,
  RemediationProvenanceRecord,
} from '../remediation/remediationTypes.js';

import type { AggregationBaselineOptions } from '../observability/telemetryAggregationEngine.js';

// ---------------------------------------------------------------------------
// 1. BRANDED IDENTIFIERS / ĐỊNH DANH THƯƠNG HIỆU
// ---------------------------------------------------------------------------

export type IncidentClosureId = string & { readonly __brand: unique symbol };
export type PostMortemReportId = string & { readonly __brand: unique symbol };
export type OscillationEventId = string & { readonly __brand: unique symbol };
export type ReconciliationId = string & { readonly __brand: unique symbol };

export function createIncidentClosureId(raw: string): IncidentClosureId {
  return raw as IncidentClosureId;
}

export function createPostMortemReportId(raw: string): PostMortemReportId {
  return raw as PostMortemReportId;
}

export function createOscillationEventId(raw: string): OscillationEventId {
  return raw as OscillationEventId;
}

export function createReconciliationId(raw: string): ReconciliationId {
  return raw as ReconciliationId;
}

// ---------------------------------------------------------------------------
// 2. ENUMS & CLASSIFICATIONS / LIỆT KÊ & PHÂN LOẠI
// ---------------------------------------------------------------------------

/**
 * Terminal incident closure states. Fail-closed to ESCALATED_TO_HUMAN if ambiguous.
 * Các trạng thái đóng sự cố cuối cùng. Đóng khi thất bại thành ESCALATED_TO_HUMAN nếu mơ hồ.
 */
export type IncidentClosureStatus =
  | 'CLOSED_RESOLVED'
  | 'CLOSED_ROLLED_BACK'
  | 'ESCALATED_TO_HUMAN';

/**
 * Advisory hypothesis outcome classification based on post-remediation evidence.
 * Phân loại kết quả giả thuyết có tính tư vấn dựa trên bằng chứng sau khắc phục.
 */
export type HypothesisOutcomeClassification =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'REFUTED'
  | 'INCONCLUSIVE';

/**
 * Flapping / oscillation risk levels for repeating incidents.
 * Mức độ rủi ro dao động / flapping đối với các sự cố lặp lại.
 */
export type FlappingRiskLevel =
  | 'NONE'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

/**
 * Baseline reconciliation status after authorized state mutation.
 * Trạng thái đối soát đường cơ sở sau đột biến trạng thái được ủy quyền.
 */
export type BaselineReconciliationStatus =
  | 'RECONCILED'
  | 'SKIPPED_NOT_VERIFIED'
  | 'SKIPPED_ROLLED_BACK'
  | 'SKIPPED_USER_STOP'
  | 'FAILED_INVARIANT';

// ---------------------------------------------------------------------------
// 3. CANONICAL DTO CONTRACTS / HỢP ĐỒNG DTO CHUẨN TẮC
// ---------------------------------------------------------------------------

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
  readonly closureCertificateHash: string; // SHA-256
  readonly requiresHumanFollowUp: boolean;
}

/**
 * Quantitative remediation effectiveness metrics.
 * Số liệu định lượng về hiệu quả khắc phục sự cố.
 */
export interface RemediationEffectivenessMetrics {
  readonly recoveryScore: number; // Deterministic [0.0, 1.0]
  readonly errorRateImprovement: number; // Pre-remediation minus post-remediation
  readonly latencyRecoveryDeltaMs: number; // Baseline latency vs observed latency
  readonly timeToSteadyStateMs: number;
  readonly meanTimeToRecoveryMs: number;
  readonly verificationOutcome: boolean;
  readonly rollbackOccurred: boolean;
  readonly sideEffectFootprintScore: number; // [0.0, 1.0], lower is better
  readonly isUnavailableOrUnknown: boolean;
  readonly evaluatedAt: number;
}

/**
 * Diagnostic hypothesis accuracy and calibration record.
 * Bản ghi độ chính xác và hiệu chuẩn giả thuyết chẩn đoán.
 */
export interface HypothesisAccuracyRecord {
  readonly hypothesisId: HypothesisId;
  readonly originalConfidence: number; // Original score [0.05, 0.95]
  readonly originalUncertainty: number; // Original score [0.05, 0.95]
  readonly classification: HypothesisOutcomeClassification;
  readonly calibrationWeight: number; // Score adjustment recommendation [0.0, 1.0]
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
  readonly resilienceProvenanceHash: string; // SHA-256
  readonly timestamp: number;
}
