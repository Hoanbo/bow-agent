import { type ObservabilitySessionId, type ObservabilitySessionState, type TelemetrySample, type TelemetryAggregationWindow, type InvariantCheck, type InvariantCategory, type DriftEvent, type DriftType, type ObservabilityAgentAssertion, type ObservabilityContradictionRecord, type SupervisorHealthReport } from './observabilityTypes.js';
import { TelemetryObservationEngine, type RawTelemetryInput } from './telemetryObservationEngine.js';
import { TelemetryAggregationEngine, type AggregationBaselineOptions } from './telemetryAggregationEngine.js';
import { InvariantVerificationEngine } from './invariantVerificationEngine.js';
import { DriftDetectionEngine, type FilesystemManifestEntry } from './driftDetectionEngine.js';
import { ObservabilityHealthEngine, type HealthEvaluationResult } from './observabilityHealthEngine.js';
import { ObservabilityAlertEngine } from './observabilityAlertEngine.js';
import { ObservabilityContradictionEngine } from './observabilityContradictionEngine.js';
import { SupervisorHealthReportEngine } from './supervisorHealthReportEngine.js';
import { ObservabilityProvenanceEngine, type ObservabilityProvenanceChain } from './observabilityProvenanceEngine.js';
import { AuditLedger } from '../auditLedger.js';
import { SupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
export interface StartSessionOptions {
    readonly targetId: string;
    readonly deploymentId: string;
    readonly deploymentVersion: string;
    readonly taskId?: string;
    readonly agentId?: string;
    readonly delegationId?: string;
    readonly capabilityLeaseId?: string;
    readonly sandboxId?: string;
    readonly worktreeId?: string;
    readonly releaseExecutionId?: string;
}
export declare class ObservabilityRuntime {
    readonly observationEngine: TelemetryObservationEngine;
    readonly aggregationEngine: TelemetryAggregationEngine;
    readonly invariantEngine: InvariantVerificationEngine;
    readonly driftEngine: DriftDetectionEngine;
    readonly healthEngine: ObservabilityHealthEngine;
    readonly alertEngine: ObservabilityAlertEngine;
    readonly contradictionEngine: ObservabilityContradictionEngine;
    readonly reportEngine: SupervisorHealthReportEngine;
    readonly provenanceEngine: ObservabilityProvenanceEngine;
    readonly humanGate: SupervisorHumanGate;
    private readonly auditLedger;
    private sessionStates;
    private sessionConfigs;
    private isUserStopActive;
    private isRevoked;
    constructor(observationEngine?: TelemetryObservationEngine, aggregationEngine?: TelemetryAggregationEngine, invariantEngine?: InvariantVerificationEngine, driftEngine?: DriftDetectionEngine, healthEngine?: ObservabilityHealthEngine, alertEngine?: ObservabilityAlertEngine, contradictionEngine?: ObservabilityContradictionEngine, reportEngine?: SupervisorHealthReportEngine, provenanceEngine?: ObservabilityProvenanceEngine, humanGate?: SupervisorHumanGate, auditLedger?: AuditLedger);
    /**
     * Helper to append an immutable event to the canonical AuditLedger.
     * Trợ giúp ghi một sự kiện bất biến vào AuditLedger chuẩn tắc.
     */
    private logAudit;
    /**
     * Triggers global USER_STOP, halting all autonomous observability immediately.
     * Kích hoạt USER_STOP toàn cục, lập tức dừng mọi hành động quan sát tự động.
     */
    triggerUserStop(reason: string): void;
    /**
     * Triggers global REVOCATION, revoking all active observation sessions.
     * Kích hoạt REVOCATION toàn cục, thu hồi tất cả các phiên quan sát đang hoạt động.
     */
    triggerRevocation(reason: string): void;
    /**
     * Resets safety overrides (for testing or supervisor restoration).
     * Đặt lại các ghi đè an toàn (cho kiểm thử hoặc khôi phục bởi người giám sát).
     */
    resetSafetySwitches(): void;
    /**
     * Starts a new post-deployment observability session.
     * Bắt đầu một phiên quan sát sau triển khai mới.
     */
    startSession(options: StartSessionOptions): ObservabilitySessionId;
    /**
     * Retrieves the current state of an observation session.
     * Lấy trạng thái hiện tại của một phiên quan sát.
     */
    getSessionState(sessionId: ObservabilitySessionId): ObservabilitySessionState;
    /**
     * Ingests a raw telemetry observation, writes audit record, and updates session.
     * Thu nạp quan sát đo từ xa thô, ghi bản ghi kiểm toán và cập nhật phiên.
     */
    ingestTelemetry(sessionId: ObservabilitySessionId, input: RawTelemetryInput): TelemetrySample;
    /**
     * Aggregates ingested telemetry samples into a deterministic rolling observation window.
     * Tổng hợp các mẫu đo từ xa đã thu nạp thành cửa sổ quan sát cuốn xác định.
     */
    aggregateTelemetry(sessionId: ObservabilitySessionId, targetId: string, options?: AggregationBaselineOptions): TelemetryAggregationWindow;
    /**
     * Evaluates a system invariant, asserting boundaries and recording violations.
     * Đánh giá một bất biến hệ thống, khẳng định ranh giới và ghi lại các vi phạm.
     */
    checkInvariant(sessionId: ObservabilitySessionId, targetId: string, category: InvariantCategory, name: string, expectedValue: string, observedValue: string, targetPath?: string): InvariantCheck;
    /**
     * Detects runtime or configuration drift. Never performs autonomous repair.
     * Phát hiện sai lệch thời gian chạy hoặc cấu hình. Không bao giờ thực hiện sửa chữa tự động.
     */
    detectDrift(sessionId: ObservabilitySessionId, targetId: string, driftType: DriftType, expectedState: string, observedState: string, isExpectedMutation?: boolean): DriftEvent;
    /**
     * Evaluates filesystem manifest drift across file entries.
     * Đánh giá sai lệch tệp kê khai hệ thống tệp trên các mục tệp.
     */
    checkFilesystemDrift(sessionId: ObservabilitySessionId, targetId: string, expectedManifest: readonly FilesystemManifestEntry[], observedManifest: readonly FilesystemManifestEntry[]): readonly DriftEvent[];
    /**
     * Evaluates multi-agent assertions, rejecting majority voting and preserving contradictions.
     * Đánh giá khẳng định đa tác nhân, bác bỏ bỏ phiếu đa số và bảo toàn các mâu thuẫn.
     */
    evaluateMultiAgentAssertions(sessionId: ObservabilitySessionId, targetId: string, assertions: readonly ObservabilityAgentAssertion[]): ObservabilityContradictionRecord | null;
    /**
     * Evaluates composite system health. Health state does not confer execution authority.
     * Đánh giá sức khỏe hệ thống phức hợp. Trạng thái sức khỏe không trao quyền thực thi.
     */
    evaluateHealth(sessionId: ObservabilitySessionId, latestMetrics?: RawTelemetryInput): HealthEvaluationResult;
    /**
     * Generates a deterministic supervisor health report.
     * Explicit invariant: SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL.
     * Tạo báo cáo sức khỏe giám sát viên xác định.
     * Bất biến rõ ràng: SUPERVISOR_HEALTH_REPORT != OWNER_APPROVAL.
     */
    generateSupervisorHealthReport(sessionId: ObservabilitySessionId): SupervisorHealthReport;
    /**
     * Builds the comprehensive provenance chain linking post-deployment observations to task roots.
     * Xây dựng chuỗi nguồn gốc toàn diện liên kết các quan sát sau triển khai với các gốc tác vụ.
     */
    buildProvenanceChain(sessionId: ObservabilitySessionId): {
        readonly chain: ObservabilityProvenanceChain;
        readonly chainHash: string;
    };
}
