// src/core/crossIncident/crossIncidentIntelligenceRuntime.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Master coordinator runtime for cross-incident intelligence and operational memory.
// Coordinates incident archival, correlation clustering, systemic pattern detection,
// hypothesis accuracy calibration, stratified remediation tracking, supervisory advisories,
// cryptographic provenance generation, and canonical AuditLedger events under 'CROSS_INCIDENT_INTELLIGENCE'.
// Enforces absolute USER_STOP supremacy, protected workspace isolation, and zero-execution authority boundaries.
// Runtime điều phối bậc thầy cho tình báo liên sự cố và bộ nhớ vận hành.
// Điều phối lưu trữ sự cố, gom cụm tương quan, phát hiện mẫu hệ thống, hiệu chuẩn giả thuyết,
// theo dõi khắc phục phân tầng, tư vấn giám sát, nguồn gốc mật mã và nhật ký AuditLedger chuẩn tắc.
// Thực thi quyền tối thượng tuyệt đối của USER_STOP, cách ly không gian được bảo vệ và ranh giới quyền hạn không thực thi.

import crypto from 'node:crypto';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import {
  type ArchivedIncidentRecord,
  type IncidentArchiveQueryFilter,
  type IncidentArchiveQueryResult,
  type CrossIncidentCorrelationCluster,
  type SystemicFailurePattern,
  type HypothesisReliabilityScore,
  type RemediationReliabilityRecord,
  type PolicyRefinementAdvisory,
  type CrossIncidentProvenanceRecord,
  type StratifiedRemediationKey,
} from './crossIncidentTypes.js';
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

export class CrossIncidentIntelligenceRuntime {
  public static readonly AUDIT_DOMAIN = 'CROSS_INCIDENT_INTELLIGENCE';
  private static readonly PROTECTED_WORKSPACE_PATTERN = /[Cc]:[\\/]BOW[\\/]shopofbow/i;

  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly archiveStore: IncidentHistoryArchiveStore;
  private readonly correlationEngine: CrossIncidentCorrelationEngine;
  private readonly hypothesisLedger: HypothesisReliabilityLedger;
  private readonly remediationTracker: RemediationReliabilityTracker;
  private readonly systemicDetector: SystemicFailureDetector;
  private readonly feedbackAggregator: GovernanceFeedbackAggregator;
  private readonly provenanceEngine: CrossIncidentProvenanceEngine;

  private userStopActive = false;

  constructor(options?: CrossIncidentRuntimeOptions) {
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.archiveStore = options?.archiveStore ?? new IncidentHistoryArchiveStore({ sanitizer: this.sanitizer });
    this.correlationEngine = options?.correlationEngine ?? new CrossIncidentCorrelationEngine();
    this.hypothesisLedger = options?.hypothesisLedger ?? new HypothesisReliabilityLedger();
    this.remediationTracker = options?.remediationTracker ?? new RemediationReliabilityTracker();
    this.systemicDetector = options?.systemicDetector ?? new SystemicFailureDetector();
    this.feedbackAggregator = options?.feedbackAggregator ?? new GovernanceFeedbackAggregator();
    this.provenanceEngine = options?.provenanceEngine ?? new CrossIncidentProvenanceEngine();
  }

  /**
   * Sets or unsets the USER_STOP emergency circuit breaker.
   * When active, all archival, analysis, and queries fail closed immediately.
   * Đặt hoặc hủy cầu dao khẩn cấp USER_STOP.
   * Khi đang hoạt động, tất cả các tác vụ lưu trữ, phân tích và truy vấn lập tức đóng khi thất bại.
   */
  public setUserStop(active: boolean): void {
    this.userStopActive = active;
    this.recordAudit('USER_STOP_STATE_CHANGED', {
      userStopActive: active,
      timestamp: Date.now(),
    });
  }

  /**
   * Checks if USER_STOP emergency breaker is active.
   * Kiểm tra xem cầu dao khẩn cấp USER_STOP có đang hoạt động hay không.
   */
  public isUserStopActive(): boolean {
    return this.userStopActive;
  }

  /**
   * Invariant check ensuring USER_STOP and protected workspace isolation.
   * Kiểm tra bất biến đảm bảo USER_STOP và sự cách ly không gian làm việc được bảo vệ.
   */
  private assertOperationalSafety(contextString?: string): void {
    if (this.userStopActive) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP');
    }

    if (contextString && CrossIncidentIntelligenceRuntime.PROTECTED_WORKSPACE_PATTERN.test(contextString)) {
      this.recordAudit('SECURITY_VIOLATION_DETECTED', {
        context: 'PROTECTED_WORKSPACE_ATTEMPT',
        stringExcerpt: contextString.slice(0, 100),
      });
      throw new Error('SECURITY_VIOLATION: Protected workspace C:\\BOW\\shopofbow access is strictly forbidden');
    }
  }

  /**
   * Records an immutable event to canonical globalAuditLedger under domain 'CROSS_INCIDENT_INTELLIGENCE'.
   * Ghi sự kiện bất biến vào globalAuditLedger chuẩn tắc dưới miền 'CROSS_INCIDENT_INTELLIGENCE'.
   */
  private recordAudit(action: string, details: Record<string, unknown>): void {
    try {
      const sanitizedDetails = this.sanitizer.sanitize(details) as Record<string, unknown>;
      const rawPayload = JSON.stringify({ action, details: sanitizedDetails });
      const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

      this.auditLedger.record({
        timestamp: new Date().toISOString(),
        actor: {
          userId: 'CROSS_INCIDENT_RUNTIME',
          role: 'ANALYTICAL_SYSTEM',
          channel: 'INTERNAL',
        },
        domain: CrossIncidentIntelligenceRuntime.AUDIT_DOMAIN,
        toolName: action,
        classification: action.includes('VIOLATION') || action.includes('USER_STOP') ? 'SAFETY' : 'OBSERVATION',
        argumentsHash,
        policyDecision: 'PERMIT',
        executionStatus: 'SUCCESS',
      });
    } catch (err) {
      console.warn('[CrossIncidentIntelligenceRuntime] Audit recording failed:', err);
    }
  }

  /**
   * Ingests a completed incident artifact into the durable archive, applies secret sanitization,
   * updates dynamic derived indexes, and records canonical audit event.
   * Nhập một hiện vật sự cố đã hoàn thành vào kho lưu trữ bền vững, làm sạch bí mật,
   * cập nhật các chỉ mục dẫn xuất động và ghi sự kiện kiểm toán chuẩn tắc.
   */
  public ingestIncident(input: IngestIncidentInput): ArchivedIncidentRecord {
    this.assertOperationalSafety(
      `${input.targetId} ${JSON.stringify(input.closureRecord)} ${JSON.stringify(input.postMortemReport)}`
    );

    const record = this.archiveStore.archiveIncident(input);

    // Update dynamic derived trackers
    this.hypothesisLedger.ingestFromArchivedRecords([record]);
    this.remediationTracker.recordOutcome(record);
    this.feedbackAggregator.ingestFromArchivedRecords([record]);

    this.recordAudit('INCIDENT_ARCHIVED', {
      archiveId: record.archiveId,
      incidentId: record.incidentId,
      targetId: record.targetId,
      failureCategory: record.failureCategory,
      actionClass: record.actionClass,
      deterministicIngestionId: record.deterministicIngestionId,
      userPartition: record.userPartition,
    });

    return record;
  }

  /**
   * Bounded query of archived incidents.
   * Fails closed if USER_STOP is active.
   * Truy vấn có giới hạn các sự cố đã lưu trữ.
   * Đóng khi thất bại nếu USER_STOP đang hoạt động.
   */
  public queryIncidents(
    filter: IncidentArchiveQueryFilter,
    userId?: string
  ): IncidentArchiveQueryResult {
    this.assertOperationalSafety(filter.targetId);
    return this.archiveStore.queryIncidents(filter, userId);
  }

  /**
   * Exact lookup of an archived incident by its identifier.
   * Tra cứu chính xác một sự cố đã lưu trữ theo định danh của nó.
   */
  public getIncidentById(incidentId: string, userId?: string): ArchivedIncidentRecord | null {
    this.assertOperationalSafety(incidentId);
    return this.archiveStore.getIncidentById(incidentId, userId);
  }

  /**
   * Analyzes archived incidents to produce cross-incident correlation clusters and systemic failure patterns.
   * Fails closed if USER_STOP is active.
   * Phân tích các sự cố đã lưu trữ để tạo các cụm tương quan liên sự cố và các mẫu lỗi hệ thống.
   * Đóng khi thất bại nếu USER_STOP đang hoạt động.
   */
  public analyzeIntelligence(userId?: string): {
    readonly clusters: readonly CrossIncidentCorrelationCluster[];
    readonly systemicPatterns: readonly SystemicFailurePattern[];
    readonly provenance: CrossIncidentProvenanceRecord | null;
  } {
    this.assertOperationalSafety();

    // Query bounded window of recent incidents for correlation
    const queryResult = this.archiveStore.queryIncidents({ limit: 100 }, userId);
    const records = queryResult.records;

    const clusters = this.correlationEngine.correlate(records);
    const systemicPatterns = this.systemicDetector.detectSystemicPatterns(clusters);

    let provenance: CrossIncidentProvenanceRecord | null = null;
    if (records.length > 0) {
      const constituentHashes = records.map((r) => r.postMortemSha256);
      const reportId = `report_${Date.now()}`;
      const clusterHash = clusters.length > 0 ? clusters[0].clusterId : 'NO_CLUSTERS';

      provenance = this.provenanceEngine.generateProvenance({
        reportId,
        clusterHash,
        constituentPostMortemHashes: constituentHashes,
      });
    }

    this.recordAudit('CROSS_INCIDENT_ANALYSIS_COMPLETED', {
      analyzedRecordsCount: records.length,
      clustersCount: clusters.length,
      systemicPatternsCount: systemicPatterns.length,
      hasProvenance: provenance !== null,
    });

    return {
      clusters,
      systemicPatterns,
      provenance,
    };
  }

  /**
   * Retrieves hypothesis reliability score for a given hypothesis type.
   * Lấy điểm độ tin cậy giả thuyết cho một loại giả thuyết nhất định.
   */
  public getHypothesisReliability(hypothesisType: string): HypothesisReliabilityScore | null {
    this.assertOperationalSafety(hypothesisType);
    return this.hypothesisLedger.getReliability(hypothesisType);
  }

  /**
   * Retrieves stratified remediation reliability for a specific (targetId, failureCategory, actionClass).
   * Lấy độ tin cậy khắc phục được phân tầng cho một bộ ba cụ thể (targetId, failureCategory, actionClass).
   */
  public getStratifiedRemediationReliability(key: StratifiedRemediationKey): RemediationReliabilityRecord | null {
    this.assertOperationalSafety(`${key.targetId}::${key.failureCategory}`);
    return this.remediationTracker.getStratifiedReliability(key);
  }

  /**
   * Generates a non-mutating policy refinement advisory for a given target scope.
   * Tạo khuyến nghị tư vấn tinh chỉnh chính sách không biến đổi cho một phạm vi mục tiêu nhất định.
   */
  public generateGovernanceAdvisory(targetScope: string, actionClass: string): PolicyRefinementAdvisory {
    this.assertOperationalSafety(targetScope);
    const advisory = this.feedbackAggregator.generateAdvisory(targetScope, actionClass);

    this.recordAudit('GOVERNANCE_ADVISORY_GENERATED', {
      advisoryId: advisory.advisoryId,
      targetScope: advisory.targetScope,
      actionClass: advisory.actionClass,
      approvalRate: advisory.approvalRate,
      invariantNotice: advisory.invariantNotice,
    });

    return advisory;
  }
}
