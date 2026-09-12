import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type ArchivedIncidentRecord, type IncidentArchiveQueryFilter, type IncidentArchiveQueryResult, type CrossIncidentCorrelationCluster, type SystemicFailurePattern, type HypothesisReliabilityScore, type RemediationReliabilityRecord, type PolicyRefinementAdvisory, type CrossIncidentProvenanceRecord, type StratifiedRemediationKey } from './crossIncidentTypes.js';
import { IncidentHistoryArchiveStore, type IngestIncidentInput } from './incidentHistoryArchiveStore.js';
import { CrossIncidentCorrelationEngine } from './crossIncidentCorrelationEngine.js';
import { HypothesisReliabilityLedger } from './hypothesisReliabilityLedger.js';
import { RemediationReliabilityTracker } from './remediationReliabilityTracker.js';
import { SystemicFailureDetector } from './systemicFailureDetector.js';
import { GovernanceFeedbackAggregator } from './governanceFeedbackAggregator.js';
import { CrossIncidentProvenanceEngine } from './crossIncidentProvenanceEngine.js';
export interface CrossIncidentRuntimeOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly archiveStore?: IncidentHistoryArchiveStore;
    readonly correlationEngine?: CrossIncidentCorrelationEngine;
    readonly hypothesisLedger?: HypothesisReliabilityLedger;
    readonly remediationTracker?: RemediationReliabilityTracker;
    readonly systemicDetector?: SystemicFailureDetector;
    readonly feedbackAggregator?: GovernanceFeedbackAggregator;
    readonly provenanceEngine?: CrossIncidentProvenanceEngine;
}
export declare class CrossIncidentIntelligenceRuntime {
    static readonly AUDIT_DOMAIN = "CROSS_INCIDENT_INTELLIGENCE";
    private static readonly PROTECTED_WORKSPACE_PATTERN;
    private readonly auditLedger;
    private readonly sanitizer;
    private readonly archiveStore;
    private readonly correlationEngine;
    private readonly hypothesisLedger;
    private readonly remediationTracker;
    private readonly systemicDetector;
    private readonly feedbackAggregator;
    private readonly provenanceEngine;
    private userStopActive;
    constructor(options?: CrossIncidentRuntimeOptions);
    /**
     * Sets or unsets the USER_STOP emergency circuit breaker.
     * When active, all archival, analysis, and queries fail closed immediately.
     * Đặt hoặc hủy cầu dao khẩn cấp USER_STOP.
     * Khi đang hoạt động, tất cả các tác vụ lưu trữ, phân tích và truy vấn lập tức đóng khi thất bại.
     */
    setUserStop(active: boolean): void;
    /**
     * Checks if USER_STOP emergency breaker is active.
     * Kiểm tra xem cầu dao khẩn cấp USER_STOP có đang hoạt động hay không.
     */
    isUserStopActive(): boolean;
    /**
     * Invariant check ensuring USER_STOP and protected workspace isolation.
     * Kiểm tra bất biến đảm bảo USER_STOP và sự cách ly không gian làm việc được bảo vệ.
     */
    private assertOperationalSafety;
    /**
     * Records an immutable event to canonical globalAuditLedger under domain 'CROSS_INCIDENT_INTELLIGENCE'.
     * Ghi sự kiện bất biến vào globalAuditLedger chuẩn tắc dưới miền 'CROSS_INCIDENT_INTELLIGENCE'.
     */
    private recordAudit;
    /**
     * Ingests a completed incident artifact into the durable archive, applies secret sanitization,
     * updates dynamic derived indexes, and records canonical audit event.
     * Nhập một hiện vật sự cố đã hoàn thành vào kho lưu trữ bền vững, làm sạch bí mật,
     * cập nhật các chỉ mục dẫn xuất động và ghi sự kiện kiểm toán chuẩn tắc.
     */
    ingestIncident(input: IngestIncidentInput): ArchivedIncidentRecord;
    /**
     * Bounded query of archived incidents.
     * Fails closed if USER_STOP is active.
     * Truy vấn có giới hạn các sự cố đã lưu trữ.
     * Đóng khi thất bại nếu USER_STOP đang hoạt động.
     */
    queryIncidents(filter: IncidentArchiveQueryFilter, userId?: string): IncidentArchiveQueryResult;
    /**
     * Exact lookup of an archived incident by its identifier.
     * Tra cứu chính xác một sự cố đã lưu trữ theo định danh của nó.
     */
    getIncidentById(incidentId: string, userId?: string): ArchivedIncidentRecord | null;
    /**
     * Analyzes archived incidents to produce cross-incident correlation clusters and systemic failure patterns.
     * Fails closed if USER_STOP is active.
     * Phân tích các sự cố đã lưu trữ để tạo các cụm tương quan liên sự cố và các mẫu lỗi hệ thống.
     * Đóng khi thất bại nếu USER_STOP đang hoạt động.
     */
    analyzeIntelligence(userId?: string): {
        readonly clusters: readonly CrossIncidentCorrelationCluster[];
        readonly systemicPatterns: readonly SystemicFailurePattern[];
        readonly provenance: CrossIncidentProvenanceRecord | null;
    };
    /**
     * Retrieves hypothesis reliability score for a given hypothesis type.
     * Lấy điểm độ tin cậy giả thuyết cho một loại giả thuyết nhất định.
     */
    getHypothesisReliability(hypothesisType: string): HypothesisReliabilityScore | null;
    /**
     * Retrieves stratified remediation reliability for a specific (targetId, failureCategory, actionClass).
     * Lấy độ tin cậy khắc phục được phân tầng cho một bộ ba cụ thể (targetId, failureCategory, actionClass).
     */
    getStratifiedRemediationReliability(key: StratifiedRemediationKey): RemediationReliabilityRecord | null;
    /**
     * Generates a non-mutating policy refinement advisory for a given target scope.
     * Tạo khuyến nghị tư vấn tinh chỉnh chính sách không biến đổi cho một phạm vi mục tiêu nhất định.
     */
    generateGovernanceAdvisory(targetScope: string, actionClass: string): PolicyRefinementAdvisory;
}
