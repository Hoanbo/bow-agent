// src/core/observability/observabilityTypes.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Canonical TypeScript contracts, branded identifiers, and fail-closed state machines
// for continuous post-deployment observation, drift detection, and advisory reporting.
// Các hợp đồng TypeScript chuẩn tắc, định danh thương hiệu và máy trạng thái đóng khi thất bại
// cho việc quan sát liên tục sau triển khai, phát hiện sai lệch và báo cáo khuyến nghị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - AUTOMATION != OWNER_WILL
// - OBSERVATION != INTERPRETATION
// - INTERPRETATION != AUTHORITY
// - HEALTH != AUTHORITY
// - DRIFT_DETECTION != AUTHORIZATION
// - TELEMETRY != AUTHORIZATION
// - ALERT != OWNER_APPROVAL
// - RECOMMENDATION != EXECUTION
// - AGENT_COUNT != AUTHORITY_COUNT
// - MONITORING_RESULT != EXECUTION_PERMISSION
// - SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// DO NOT introduce APPROVED, AUTHORIZED, EXECUTED or OWNER_APPROVED states into observation state machines!
// KHÔNG ĐƯỢC đưa các trạng thái APPROVED, AUTHORIZED, EXECUTED hoặc OWNER_APPROVED vào máy trạng thái quan sát!
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

// ---------------------------------------------------------------------------
// 1. BRANDED IDENTIFIERS / ĐỊNH DANH THƯƠNG HIỆU
// ---------------------------------------------------------------------------

export type ObservationId = string & { readonly __brand: unique symbol };
export type TelemetrySampleId = string & { readonly __brand: unique symbol };
export type HealthCheckId = string & { readonly __brand: unique symbol };
export type DriftDetectionId = string & { readonly __brand: unique symbol };
export type DriftEventId = string & { readonly __brand: unique symbol };
export type InvariantCheckId = string & { readonly __brand: unique symbol };
export type HealthReportId = string & { readonly __brand: unique symbol };
export type ObservabilitySessionId = string & { readonly __brand: unique symbol };
export type ObservabilityAlertId = string & { readonly __brand: unique symbol };

export function createObservationId(raw: string): ObservationId {
  return raw as ObservationId;
}

export function createTelemetrySampleId(raw: string): TelemetrySampleId {
  return raw as TelemetrySampleId;
}

export function createHealthCheckId(raw: string): HealthCheckId {
  return raw as HealthCheckId;
}

export function createDriftDetectionId(raw: string): DriftDetectionId {
  return raw as DriftDetectionId;
}

export function createDriftEventId(raw: string): DriftEventId {
  return raw as DriftEventId;
}

export function createInvariantCheckId(raw: string): InvariantCheckId {
  return raw as InvariantCheckId;
}

export function createHealthReportId(raw: string): HealthReportId {
  return raw as HealthReportId;
}

export function createObservabilitySessionId(raw: string): ObservabilitySessionId {
  return raw as ObservabilitySessionId;
}

export function createObservabilityAlertId(raw: string): ObservabilityAlertId {
  return raw as ObservabilityAlertId;
}

// ---------------------------------------------------------------------------
// 2. OBSERVABILITY STATE MACHINES / MÁY TRẠNG THÁI QUAN SÁT
// ---------------------------------------------------------------------------

/**
 * Observability session lifecycle states.
 * Note: Purely observational; no mutation or execution authority states exist here.
 * Các trạng thái vòng đời phiên quan sát.
 * Lưu ý: Thuần túy quan sát; không tồn tại trạng thái đột biến hay quyền thực thi tại đây.
 */
export type ObservabilitySessionState =
  | 'INITIALIZED'
  | 'OBSERVING'
  | 'ANALYZING'
  | 'REPORTING'
  | 'PAUSED'
  | 'CONCLUDED'
  | 'BLOCKED'
  | 'REVOKED';

export const TERMINAL_SESSION_STATES: readonly ObservabilitySessionState[] = [
  'CONCLUDED',
  'BLOCKED',
  'REVOKED',
] as const;

export function isTerminalSessionState(state: ObservabilitySessionState): boolean {
  return TERMINAL_SESSION_STATES.includes(state);
}

/**
 * Advisory health state classification.
 * CRITICAL does NOT grant autonomous repair authority.
 * Phân loại trạng thái sức khỏe khuyến nghị.
 * CRITICAL KHÔNG cấp quyền sửa chữa tự động.
 */
export type ObservabilityHealthState =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNSTABLE'
  | 'UNKNOWN'
  | 'CRITICAL'
  | 'OBSERVATION_UNAVAILABLE';

/**
 * Drift detection classification categories.
 * Phân loại các danh mục phát hiện sai lệch.
 */
export type DriftClassification =
  | 'NO_DRIFT'
  | 'EXPECTED_DRIFT'
  | 'UNKNOWN_DRIFT'
  | 'CRITICAL_DRIFT';

/**
 * Dimensions of detectable drift in deployed environments.
 * Các chiều kích thước của sai lệch có thể phát hiện trong môi trường đã triển khai.
 */
export type DriftType =
  | 'FILESYSTEM'
  | 'CONFIGURATION'
  | 'DEPLOYMENT_VERSION'
  | 'MANIFEST'
  | 'HASH_MISMATCH'
  | 'UNAUTHORIZED_MUTATION'
  | 'PROVENANCE_MISMATCH';

/**
 * Alert severity levels for notifications to supervisor.
 * Các mức độ nghiêm trọng của cảnh báo gửi đến giám sát viên.
 */
export type ObservabilityAlertSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

/**
 * Contradiction status between multiple observational telemetry sources.
 * Trạng thái mâu thuẫn giữa nhiều nguồn đo từ xa quan sát.
 */
export type ObservabilityContradictionStatus =
  | 'NO_CONFLICT'
  | 'CONFLICT_DETECTED'
  | 'CONFLICT_UNRESOLVED'
  | 'CONFLICT_ESCALATED';


/**
 * Verification result of a system invariant check.
 * Kết quả xác minh của một kiểm tra bất biến hệ thống.
 */
export type InvariantStatus = 'SATISFIED' | 'VIOLATED' | 'INDETERMINATE';

/**
 * Categories of system invariants evaluated post-deployment.
 * Các danh mục bất biến hệ thống được đánh giá sau triển khai.
 */
export type InvariantCategory =
  | 'MANIFEST'
  | 'HASH'
  | 'PROTECTED_WORKSPACE'
  | 'BOUNDARY'
  | 'CONFIGURATION'
  | 'PROBE'
  | 'PROVENANCE'
  | 'AUTHORIZATION'
  | 'USER_STOP'
  | 'REVOCATION';

// ---------------------------------------------------------------------------
// 3. TELEMETRY & OBSERVATION SCHEMAS / LƯỢC ĐỒ ĐO TỪ XA & QUAN SÁT
// ---------------------------------------------------------------------------

/**
 * Metric observation data point representing runtime performance and health.
 * Điểm dữ liệu quan sát chỉ số đại diện cho hiệu năng và sức khỏe thời gian chạy.
 */
export interface MetricObservation {
  readonly availability: number; // 0.0 to 1.0 (e.g. 0.999 = 99.9%)
  readonly errorRate: number; // 0.0 to 1.0 (e.g. 0.005 = 0.5%)
  readonly latencyP95Ms: number; // Milliseconds
  readonly latencyP99Ms: number; // Milliseconds
  readonly healthProbesPassing: number;
  readonly totalHealthProbes: number;
  readonly deploymentVersion: string;
  readonly configurationFingerprint: string;
  readonly manifestFingerprint: string;
  readonly runtimeStatus: string;
  readonly sampleCount: number;
  readonly customMetrics?: Readonly<Record<string, number | string | boolean>>;
}

/**
 * Immutable telemetry sample captured by an observational source.
 * Mẫu đo từ xa bất biến được thu thập bởi nguồn quan sát.
 */
export interface TelemetrySample {
  readonly sampleId: TelemetrySampleId;
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly sourceId: string;
  readonly timestamp: number;
  readonly metrics: MetricObservation;
  readonly provenanceHash: string;
}

/**
 * Aggregated telemetry observation window for baseline comparison.
 * Cửa sổ quan sát đo từ xa tổng hợp để so sánh với đường cơ sở.
 */
export interface TelemetryAggregationWindow {
  readonly windowId: string;
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly samples: readonly TelemetrySample[];
  readonly aggregateAvailability: number;
  readonly aggregateErrorRate: number;
  readonly aggregateLatencyP95Ms: number;
  readonly aggregateLatencyP99Ms: number;
  readonly totalSamples: number;
  readonly consecutiveDegradations: number;
  readonly baselineComparison?: {
    readonly baselineErrorRate: number;
    readonly baselineLatencyP95Ms: number;
    readonly errorRateDelta: number;
    readonly latencyDeltaMs: number;
    readonly isDegradedAgainstBaseline: boolean;
  };
}

// ---------------------------------------------------------------------------
// 4. INVARIANT & DRIFT SCHEMAS / LƯỢC ĐỒ BẤT BIẾN & SAI LỆCH
// ---------------------------------------------------------------------------

/**
 * An invariant evaluation result representing continuous verification of deployed invariants.
 * Kết quả đánh giá bất biến đại diện cho việc xác minh liên tục các bất biến đã triển khai.
 */
export interface InvariantCheck {
  readonly invariantId: InvariantCheckId;
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly name: string;
  readonly category: InvariantCategory;
  readonly expectedValue: string;
  readonly observedValue: string;
  readonly status: InvariantStatus;
  readonly reason?: string;
  readonly evaluatedAt: number;
  readonly evidenceHash: string;
}

/**
 * Detected drift event describing state deviation without executing autonomous repair.
 * Sự kiện sai lệch được phát hiện mô tả sai lệch trạng thái mà không thực thi sửa chữa tự động.
 */
export interface DriftEvent {
  readonly eventId: DriftEventId;
  readonly detectionId: DriftDetectionId;
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly driftType: DriftType;
  readonly classification: DriftClassification;
  readonly expectedState: string;
  readonly observedState: string;
  readonly diffSummary: string;
  readonly detectedAt: number;
  readonly evidenceHash: string;
}

// ---------------------------------------------------------------------------
// 5. ALERT & CONTRADICTION SCHEMAS / LƯỢC ĐỒ CẢNH BÁO & MÂU THUẪN
// ---------------------------------------------------------------------------

/**
 * Advisory alert generated when thresholds or invariants are breached.
 * Cảnh báo khuyến nghị được tạo khi các ngưỡng hoặc bất biến bị vi phạm.
 */
export interface ObservabilityAlert {
  readonly alertId: ObservabilityAlertId;
  readonly sessionId: ObservabilitySessionId;
  readonly severity: ObservabilityAlertSeverity;
  readonly targetId: string;
  readonly reason: string;
  readonly observationRefs: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly timestamp: number;
  readonly fingerprint: string;
  readonly provenance: string;
  readonly recommendedEscalation: string;
}

/**
 * Individual agent assertion submitted to multi-agent observability mesh.
 * Khẳng định của từng tác nhân riêng lẻ gửi vào lưới quan sát đa tác nhân.
 */
export interface ObservabilityAgentAssertion {
  readonly agentId: string;
  readonly targetId: string;
  readonly timestamp: number;
  readonly reportedHealthState: ObservabilityHealthState;
  readonly reportedHealthScore: number; // 0 to 100
  readonly reportedDriftClassification: DriftClassification;
  readonly evidenceHash: string;
}

/**
 * Record of contradictory assertions detected across multiple observational agents.
 * Bản ghi các khẳng định mâu thuẫn được phát hiện giữa nhiều tác nhân quan sát.
 */
export interface ObservabilityContradictionRecord {
  readonly contradictionId: string;
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly assertions: readonly ObservabilityAgentAssertion[];
  readonly conflictingFields: readonly string[];
  readonly status: ObservabilityContradictionStatus;
  readonly detectedAt: number;
  readonly escalatedToSupervisor: boolean;
}

// ---------------------------------------------------------------------------
// 6. SUPERVISOR HEALTH REPORT SCHEMAS / LƯỢC ĐỒ BÁO CÁO SỨC KHỎE GIÁM SÁT VIÊN
// ---------------------------------------------------------------------------

/**
 * Deterministic supervisor-facing advisory health report.
 * Explicit Invariant: SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL.
 * Báo cáo sức khỏe khuyến nghị xác định hướng tới giám sát viên.
 * Bất biến rõ ràng: SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL.
 */
export interface SupervisorHealthReport {
  readonly reportId: HealthReportId;
  readonly sessionId: ObservabilitySessionId;
  readonly deploymentId: string;
  readonly deploymentVersion: string;
  readonly targetId: string;
  readonly healthState: ObservabilityHealthState;
  readonly healthScore: number; // 0 to 100
  readonly recentTelemetrySummary: {
    readonly sampleCount: number;
    readonly availability: number;
    readonly errorRate: number;
    readonly latencyP95Ms: number;
    readonly consecutiveDegradations: number;
  };
  readonly activeAlerts: readonly ObservabilityAlert[];
  readonly detectedDrifts: readonly DriftEvent[];
  readonly invariantChecks: readonly InvariantCheck[];
  readonly contradictions: readonly ObservabilityContradictionRecord[];
  readonly provenanceStatus: 'VERIFIED' | 'COMPROMISED' | 'MISSING';
  readonly recommendedNextAction: string;
  readonly confidenceScore: number; // 0 to 100
  readonly generatedAt: number;
  readonly reportHash: string;
}

// ---------------------------------------------------------------------------
// 7. OBSERVABILITY CONFIGURATION CONTRACT / HỢP ĐỒNG CẤU HÌNH QUAN SÁT
// ---------------------------------------------------------------------------

export interface ObservabilityMeshConfig {
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly deploymentId: string;
  readonly deploymentVersion: string;
  readonly expectedManifestFingerprint: string;
  readonly expectedConfigurationFingerprint: string;
  readonly maxErrorRate: number; // e.g. 0.01 (1%)
  readonly maxLatencyP95Ms: number; // e.g. 350ms
  readonly minAvailability: number; // e.g. 0.999 (99.9%)
  readonly maxConsecutiveDegradations: number; // e.g. 3
  readonly windowDurationMs: number; // e.g. 30_000ms
}
