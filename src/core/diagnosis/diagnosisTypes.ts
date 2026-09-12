// src/core/diagnosis/diagnosisTypes.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Canonical TypeScript contracts, branded identifiers, and fail-closed state machines
// for autonomous post-deployment self-diagnosis, incident classification, and decision-support synthesis.
// Các hợp đồng TypeScript chuẩn tắc, định danh thương hiệu và máy trạng thái đóng khi thất bại
// cho việc tự chẩn đoán sau triển khai, phân loại sự cố và tổng hợp hỗ trợ quyết định có quản trị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - DIAGNOSIS != EXECUTION
// - ROOT_CAUSE_HYPOTHESIS != FACT
// - CONFIDENCE != AUTHORITY
// - DECISION_PACKAGE != OWNER_DECISION
// - RECOMMENDATION != AUTHORIZATION
// - INCIDENT_CLASSIFICATION != REMEDIATION_PERMISSION
// - AGENT_COUNT != AUTHORITY_COUNT
// - MONITORING_RESULT != EXECUTION_PERMISSION
// - CONFIDENCE_CEILING: Confidence score MUST NEVER exceed 0.95 (Preserve epistemological humility).
// - CONFIDENCE_UNCERTAINTY_SUM: Confidence + Uncertainty MUST EQUAL 1.0.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
// - ZERO AUTONOMOUS REMEDIATION: Proposed actions MUST remain inert DTOs without executable callbacks.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import type {
  ObservabilitySessionId,
  ObservabilityHealthState,
  InvariantCheck,
  DriftEvent,
  ObservabilityAlert,
} from '../observability/observabilityTypes.js';

// ---------------------------------------------------------------------------
// 1. BRANDED IDENTIFIERS / ĐỊNH DANH THƯƠNG HIỆU
// ---------------------------------------------------------------------------

export type IncidentId = string & { readonly __brand: unique symbol };
export type HypothesisId = string & { readonly __brand: unique symbol };
export type DecisionPackageId = string & { readonly __brand: unique symbol };
export type EvidenceClusterId = string & { readonly __brand: unique symbol };

export function createIncidentId(raw: string): IncidentId {
  return raw as IncidentId;
}

export function createHypothesisId(raw: string): HypothesisId {
  return raw as HypothesisId;
}

export function createDecisionPackageId(raw: string): DecisionPackageId {
  return raw as DecisionPackageId;
}

export function createEvidenceClusterId(raw: string): EvidenceClusterId {
  return raw as EvidenceClusterId;
}

// ---------------------------------------------------------------------------
// 2. ENUMS & LITERAL UNIONS / LIỆT KÊ & HỢP CÁC GIÁ TRỊ NGUYÊN BẢN
// ---------------------------------------------------------------------------

/**
 * Deterministic incident severity classifications.
 * CRITICAL does NOT authorize autonomous remediation.
 * Phân loại mức độ nghiêm trọng sự cố có tính xác định.
 * CRITICAL KHÔNG cấp quyền khắc phục tự động.
 */
export type IncidentSeverity =
  | 'INFORMATIONAL'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'UNKNOWN'
  | 'CONFLICTED';

/**
 * Spatial blast-radius of the diagnosed incident.
 * Bán kính ảnh hưởng không gian của sự cố được chẩn đoán.
 */
export type BlastRadius = 'COMPONENT' | 'SUBSYSTEM' | 'SYSTEM_WIDE';

/**
 * Well-defined deterministic failure topology categories.
 * Các danh mục cấu trúc liên kết lỗi xác định rõ ràng.
 */
export type FailureCategory =
  | 'RESOURCE_EXHAUSTION'
  | 'UPSTREAM_DEPENDENCY'
  | 'CONFIGURATION_DRIFT'
  | 'UNAUTHORIZED_MUTATION'
  | 'CANARY_REGRESSION'
  | 'NETWORK_PARTITION'
  | 'DATABASE_DEGRADATION'
  | 'UNKNOWN_PATTERN';

/**
 * Classification of proposed remediation action types.
 * All actions are strictly descriptive recommendations for human operators.
 * Phân loại các loại hành động khắc phục được đề xuất.
 * Mọi hành động đều là các khuyến nghị mô tả thuần túy cho người điều hành.
 */
export type ProposedRemediationType =
  | 'MANUAL_INSPECTION'
  | 'ROLLBACK_RECOMMENDATION'
  | 'SERVICE_RESTART'
  | 'CONFIG_CORRECTION'
  | 'TRAFFIC_DRAIN';

/**
 * Required human decision types when submitting decision package to supervisor.
 * Các loại quyết định của con người được yêu cầu khi gửi gói quyết định tới giám sát viên.
 */
export type RequiredDecisionType =
  | 'APPROVAL_REQUIRED'
  | 'ADVISORY_ACKNOWLEDGMENT'
  | 'ESCALATION_ONLY';

// ---------------------------------------------------------------------------
// 3. EVIDENCE CORRELATION SCHEMAS / LƯỢC ĐỒ TƯƠNG QUAN BẰNG CHỨNG
// ---------------------------------------------------------------------------

/**
 * An item of correlated observational evidence.
 * Một mục bằng chứng quan sát có tương quan.
 */
export interface CorrelatedEvidenceItem {
  readonly evidenceId: string;
  readonly source: 'INVARIANT' | 'DRIFT' | 'ALERT' | 'TELEMETRY';
  readonly category: string;
  readonly timestamp: number;
  readonly severity: string;
  readonly description: string;
  readonly evidenceHash: string;
  readonly weight: number; // 0.0 to 1.0
}

/**
 * Cluster of evidence correlated across temporal and topological boundaries.
 * Cụm bằng chứng tương quan qua các ranh giới thời gian và vị trí cấu trúc.
 */
export interface CorrelatedEvidenceCluster {
  readonly clusterId: EvidenceClusterId;
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly windowStart: number;
  readonly windowEnd: number;
  readonly items: readonly CorrelatedEvidenceItem[];
  readonly totalWeight: number;
  readonly clusterHash: string;
}

// ---------------------------------------------------------------------------
// 4. ROOT-CAUSE HYPOTHESIS SCHEMAS / LƯỢC ĐỒ GIẢ THUYẾT NGUYÊN NHÂN GỐC
// ---------------------------------------------------------------------------

/**
 * Probabilistic root-cause hypothesis with deterministic confidence & uncertainty.
 * A hypothesis is NEVER treated as fact regardless of confidence score.
 * Giả thuyết nguyên nhân gốc xác suất với độ tin cậy và độ không chắc chắn xác định.
 * Một giả thuyết KHÔNG BAO GIỜ được coi là sự thật bất kể điểm tin cậy cao đến mức nào.
 */
export interface RootCauseHypothesis {
  readonly hypothesisId: HypothesisId;
  readonly category: FailureCategory;
  readonly title: string;
  readonly description: string;
  readonly primarySubsystem: string;
  readonly supportingEvidenceIds: readonly string[];
  readonly contradictingEvidenceIds: readonly string[];
  readonly confidenceScore: number; // Deterministic [0.05, 0.95]
  readonly uncertaintyScore: number; // Deterministic [0.05, 0.95], where confidence + uncertainty = 1.0
  readonly temporalCorrelationMs: number;
  readonly isPrimary: boolean;
}

// ---------------------------------------------------------------------------
// 5. CONTRADICTION & DISSENT SCHEMAS / LƯỢC ĐỒ MÂU THUẪN & BẢO TOÀN DỊ Ý
// ---------------------------------------------------------------------------

/**
 * Agent diagnostic assertion submitted for consensus arbitration.
 * Khẳng định chẩn đoán của tác nhân gửi lên để phân xử đồng thuận.
 */
export interface AgentDiagnosticAssertion {
  readonly agentId: string;
  readonly targetId: string;
  readonly timestamp: number;
  readonly assertedCategory: FailureCategory;
  readonly assertedSeverity: IncidentSeverity;
  readonly assertedHealthState: ObservabilityHealthState;
  readonly confidenceScore: number;
  readonly evidenceHash: string;
  readonly reasoning: string;
}

/**
 * Preserved dissenting viewpoint from multi-agent diagnostic assertions.
 * Rejects majority voting; dissent is preserved verbatim.
 * Quan điểm dị ý được bảo toàn từ các khẳng định chẩn đoán đa tác nhân.
 * Bác bỏ bỏ phiếu đa số; ý kiến bất đồng được bảo toàn nguyên văn.
 */
export interface DissentingView {
  readonly agentId: string;
  readonly assertedCause: string;
  readonly evidenceHash: string;
  readonly confidenceScore: number;
  readonly reasoning: string;
}

/**
 * Result of contradiction evaluation across diagnostic assertions.
 * Kết quả đánh giá mâu thuẫn giữa các khẳng định chẩn đoán.
 */
export interface DiagnosisContradictionResult {
  readonly hasContradiction: boolean;
  readonly isConflicted: boolean;
  readonly conflictingFields: readonly string[];
  readonly dissentingViews: readonly DissentingView[];
  readonly confidenceCap: number; // Capped to <= 0.40 if contradiction exists
}

// ---------------------------------------------------------------------------
// 6. INCIDENT CLASSIFICATION SCHEMAS / LƯỢC ĐỒ PHÂN LOẠI SỰ CỐ
// ---------------------------------------------------------------------------

/**
 * Deterministic classification of a diagnosed incident.
 * Phân loại xác định của một sự cố được chẩn đoán.
 */
export interface IncidentClassification {
  readonly incidentId: IncidentId;
  readonly severity: IncidentSeverity;
  readonly blastRadius: BlastRadius;
  readonly rationale: readonly string[];
  readonly evaluatedAt: number;
}

// ---------------------------------------------------------------------------
// 7. PROPOSED REMEDIATION DTO / DTO HÀNH ĐỘNG KHẮC PHỤC ĐƯỢC ĐỀ XUẤT
// ---------------------------------------------------------------------------

/**
 * Strictly inert Data Transfer Object (DTO) describing recommended human actions.
 * Invariant: ZERO executable callbacks, ZERO capability references.
 * DTO thuần túy mô tả các hành động của con người được khuyến nghị.
 * Bất biến: KHÔNG CÓ hàm gọi lại thực thi, KHÔNG CÓ tham chiếu năng lực tự động.
 */
export interface ProposedRemediationAction {
  readonly actionId: string;
  readonly title: string;
  readonly description: string;
  readonly remediationType: ProposedRemediationType;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly riskScore: number; // 1 to 10
  readonly estimatedBlastRadius: BlastRadius;
  readonly suggestedCommands: readonly string[]; // Descriptive strings only; NEVER executed by runtime
  readonly requiresHumanApproval: true; // Hardcoded true invariant
  readonly isAutomatedExecutionPermitted: false; // Hardcoded false invariant
}

// ---------------------------------------------------------------------------
// 8. SUPERVISOR DECISION-SUPPORT PACKAGE / GÓI HỖ TRỢ QUYẾT ĐỊNH GIÁM SÁT VIÊN
// ---------------------------------------------------------------------------

/**
 * Impact assessment of the incident.
 * Đánh giá tác động của sự cố.
 */
export interface IncidentImpactAssessment {
  readonly affectedSubsystems: readonly string[];
  readonly userFacingImpact: boolean;
  readonly slaBreached: boolean;
  readonly cascadeRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Complete, immutable Supervisor Decision-Support Package.
 * Explicit Invariant: DECISION_PACKAGE != OWNER_DECISION.
 * Gói hỗ trợ quyết định giám sát viên đầy đủ, bất biến.
 * Bất biến rõ ràng: DECISION_PACKAGE != OWNER_DECISION.
 */
export interface SupervisorDecisionSupportPackage {
  readonly packageId: DecisionPackageId;
  readonly incidentId: IncidentId;
  readonly sessionId: ObservabilitySessionId;
  readonly timestamp: number;
  readonly severity: IncidentSeverity;
  readonly blastRadius: BlastRadius;
  readonly currentHealth: ObservabilityHealthState;
  readonly correlatedEvidence: CorrelatedEvidenceCluster;
  readonly rankedHypotheses: readonly RootCauseHypothesis[];
  readonly dissentingViews: readonly DissentingView[];
  readonly aggregateConfidence: number; // 0.05 to 0.95
  readonly aggregateUncertainty: number; // 0.05 to 0.95 (aggregateConfidence + aggregateUncertainty === 1.0)
  readonly impactAssessment: IncidentImpactAssessment;
  readonly recommendedActions: readonly ProposedRemediationAction[];
  readonly alternativeActions: readonly ProposedRemediationAction[];
  readonly evidenceHash: string;
  readonly packageHash: string;
  readonly provenanceSignature: string;
  readonly requiredDecisionType: RequiredDecisionType;
  readonly autonomousExecutionBoundary: 'STRICT_NO_AUTONOMOUS_EXECUTION_ENFORCED';

  toJSON(): Record<string, unknown>;
  toMarkdownSummary(): string;
}

// ---------------------------------------------------------------------------
// 9. PROVENANCE CHAIN SCHEMAS / LƯỢC ĐỒ CHUỖI NGUỒN GỐC
// ---------------------------------------------------------------------------

/**
 * Cryptographic provenance record binding diagnosis to raw observations and task roots.
 * Bản ghi nguồn gốc mật mã ràng buộc chẩn đoán với các quan sát thô và gốc tác vụ.
 */
export interface DiagnosisProvenanceRecord {
  readonly packageId: DecisionPackageId;
  readonly incidentId: IncidentId;
  readonly sessionId: ObservabilitySessionId;
  readonly evidenceClusterHash: string;
  readonly hypothesisIds: readonly string[];
  readonly telemetrySampleHashes: readonly string[];
  readonly invariantEvidenceHashes: readonly string[];
  readonly driftEvidenceHashes: readonly string[];
  readonly alertFingerprints: readonly string[];
  readonly parentProvenanceHash?: string;
  readonly timestamp: number;
  readonly signature: string; // SHA-256
}

// ---------------------------------------------------------------------------
// 10. INCIDENT DIAGNOSIS RESULT DTO / DTO KẾT QUẢ CHẨN ĐOÁN SỰ CỐ
// ---------------------------------------------------------------------------

/**
 * Canonical result emitted by the DiagnosisRuntime.
 * Explicitly named IncidentDiagnosis to prevent collision with legacy Diagnosis in supervisorTypes.ts.
 * Kết quả chuẩn tắc phát ra bởi DiagnosisRuntime.
 * Đặt tên rõ ràng là IncidentDiagnosis để tránh va chạm với Diagnosis cũ trong supervisorTypes.ts.
 */
export interface IncidentDiagnosis {
  readonly incidentId: IncidentId;
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly evaluatedAt: number;
  readonly severity: IncidentSeverity;
  readonly blastRadius: BlastRadius;
  readonly primaryHypothesis?: RootCauseHypothesis;
  readonly allHypotheses: readonly RootCauseHypothesis[];
  readonly dissentingViews: readonly DissentingView[];
  readonly isConflicted: boolean;
  readonly confidenceScore: number;
  readonly uncertaintyScore: number;
  readonly decisionPackage: SupervisorDecisionSupportPackage;
}
