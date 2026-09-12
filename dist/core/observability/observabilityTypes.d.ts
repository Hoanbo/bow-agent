export type ObservationId = string & {
    readonly __brand: unique symbol;
};
export type TelemetrySampleId = string & {
    readonly __brand: unique symbol;
};
export type HealthCheckId = string & {
    readonly __brand: unique symbol;
};
export type DriftDetectionId = string & {
    readonly __brand: unique symbol;
};
export type DriftEventId = string & {
    readonly __brand: unique symbol;
};
export type InvariantCheckId = string & {
    readonly __brand: unique symbol;
};
export type HealthReportId = string & {
    readonly __brand: unique symbol;
};
export type ObservabilitySessionId = string & {
    readonly __brand: unique symbol;
};
export type ObservabilityAlertId = string & {
    readonly __brand: unique symbol;
};
export declare function createObservationId(raw: string): ObservationId;
export declare function createTelemetrySampleId(raw: string): TelemetrySampleId;
export declare function createHealthCheckId(raw: string): HealthCheckId;
export declare function createDriftDetectionId(raw: string): DriftDetectionId;
export declare function createDriftEventId(raw: string): DriftEventId;
export declare function createInvariantCheckId(raw: string): InvariantCheckId;
export declare function createHealthReportId(raw: string): HealthReportId;
export declare function createObservabilitySessionId(raw: string): ObservabilitySessionId;
export declare function createObservabilityAlertId(raw: string): ObservabilityAlertId;
/**
 * Observability session lifecycle states.
 * Note: Purely observational; no mutation or execution authority states exist here.
 * Các trạng thái vòng đời phiên quan sát.
 * Lưu ý: Thuần túy quan sát; không tồn tại trạng thái đột biến hay quyền thực thi tại đây.
 */
export type ObservabilitySessionState = 'INITIALIZED' | 'OBSERVING' | 'ANALYZING' | 'REPORTING' | 'PAUSED' | 'CONCLUDED' | 'BLOCKED' | 'REVOKED';
export declare const TERMINAL_SESSION_STATES: readonly ObservabilitySessionState[];
export declare function isTerminalSessionState(state: ObservabilitySessionState): boolean;
/**
 * Advisory health state classification.
 * CRITICAL does NOT grant autonomous repair authority.
 * Phân loại trạng thái sức khỏe khuyến nghị.
 * CRITICAL KHÔNG cấp quyền sửa chữa tự động.
 */
export type ObservabilityHealthState = 'HEALTHY' | 'DEGRADED' | 'UNSTABLE' | 'UNKNOWN' | 'CRITICAL' | 'OBSERVATION_UNAVAILABLE';
/**
 * Drift detection classification categories.
 * Phân loại các danh mục phát hiện sai lệch.
 */
export type DriftClassification = 'NO_DRIFT' | 'EXPECTED_DRIFT' | 'UNKNOWN_DRIFT' | 'CRITICAL_DRIFT';
/**
 * Dimensions of detectable drift in deployed environments.
 * Các chiều kích thước của sai lệch có thể phát hiện trong môi trường đã triển khai.
 */
export type DriftType = 'FILESYSTEM' | 'CONFIGURATION' | 'DEPLOYMENT_VERSION' | 'MANIFEST' | 'HASH_MISMATCH' | 'UNAUTHORIZED_MUTATION' | 'PROVENANCE_MISMATCH';
/**
 * Alert severity levels for notifications to supervisor.
 * Các mức độ nghiêm trọng của cảnh báo gửi đến giám sát viên.
 */
export type ObservabilityAlertSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
/**
 * Contradiction status between multiple observational telemetry sources.
 * Trạng thái mâu thuẫn giữa nhiều nguồn đo từ xa quan sát.
 */
export type ObservabilityContradictionStatus = 'NO_CONFLICT' | 'CONFLICT_DETECTED' | 'CONFLICT_UNRESOLVED' | 'CONFLICT_ESCALATED';
/**
 * Verification result of a system invariant check.
 * Kết quả xác minh của một kiểm tra bất biến hệ thống.
 */
export type InvariantStatus = 'SATISFIED' | 'VIOLATED' | 'INDETERMINATE';
/**
 * Categories of system invariants evaluated post-deployment.
 * Các danh mục bất biến hệ thống được đánh giá sau triển khai.
 */
export type InvariantCategory = 'MANIFEST' | 'HASH' | 'PROTECTED_WORKSPACE' | 'BOUNDARY' | 'CONFIGURATION' | 'PROBE' | 'PROVENANCE' | 'AUTHORIZATION' | 'USER_STOP' | 'REVOCATION';
/**
 * Metric observation data point representing runtime performance and health.
 * Điểm dữ liệu quan sát chỉ số đại diện cho hiệu năng và sức khỏe thời gian chạy.
 */
export interface MetricObservation {
    readonly availability: number;
    readonly errorRate: number;
    readonly latencyP95Ms: number;
    readonly latencyP99Ms: number;
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
    readonly reportedHealthScore: number;
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
    readonly healthScore: number;
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
    readonly confidenceScore: number;
    readonly generatedAt: number;
    readonly reportHash: string;
}
export interface ObservabilityMeshConfig {
    readonly sessionId: ObservabilitySessionId;
    readonly targetId: string;
    readonly deploymentId: string;
    readonly deploymentVersion: string;
    readonly expectedManifestFingerprint: string;
    readonly expectedConfigurationFingerprint: string;
    readonly maxErrorRate: number;
    readonly maxLatencyP95Ms: number;
    readonly minAvailability: number;
    readonly maxConsecutiveDegradations: number;
    readonly windowDurationMs: number;
}
