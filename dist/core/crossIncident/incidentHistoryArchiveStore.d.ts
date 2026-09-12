import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type ArchivedIncidentRecord, type IncidentArchiveQueryFilter, type IncidentArchiveQueryResult } from './crossIncidentTypes.js';
import type { RemediationActionClass } from '../remediation/remediationTypes.js';
import type { IncidentId } from '../diagnosis/diagnosisTypes.js';
import type { PostMortemReport, IncidentClosureRecord, RemediationEffectivenessMetrics } from '../incidentResilience/incidentResilienceTypes.js';
export interface IngestIncidentInput {
    readonly incidentId: IncidentId;
    readonly postMortemReport: PostMortemReport;
    readonly closureRecord: IncidentClosureRecord;
    readonly effectivenessMetrics: RemediationEffectivenessMetrics;
    readonly targetId: string;
    readonly failureCategory: string;
    readonly actionClass: RemediationActionClass;
    readonly userId?: string;
}
export declare class IncidentHistoryArchiveStore {
    private readonly baseDir;
    private readonly sanitizer;
    private readonly stores;
    constructor(options?: {
        readonly baseDir?: string;
        readonly sanitizer?: DiagnosisSanitizer;
    });
    /**
     * Resolves the isolated DurableJsonStore for the authenticated user partition.
     * Never bypasses UserPartitionResolver.
     * Giải quyết DurableJsonStore cô lập cho phân vùng người dùng đã xác thực.
     * Tuyệt đối không bỏ qua UserPartitionResolver.
     */
    private getStore;
    /**
     * Computes the deterministic ingestion identity:
     * incidentId + closureCertificateHash + postMortemSha256.
     * Tính toán định danh nhập liệu xác định: incidentId + closureCertificateHash + postMortemSha256.
     */
    computeIngestionIdentity(incidentId: string, closureCertificateHash: string, postMortemSha256: string): string;
    /**
     * Archives a closed incident record idempotently with secret sanitization.
     * Fails closed if incident artifacts are incomplete or invalid.
     * Lưu trữ một bản ghi sự cố đã đóng có tính lũy thừa và làm sạch bí mật.
     * Đóng khi thất bại nếu các hiện vật sự cố không hoàn chỉnh hoặc không hợp lệ.
     */
    archiveIncident(input: IngestIncidentInput): ArchivedIncidentRecord;
    /**
     * Exact lookup of an archived incident by its incidentId.
     * Tra cứu chính xác một sự cố đã lưu trữ theo incidentId của nó.
     */
    getIncidentById(incidentId: IncidentId | string, userId?: string): ArchivedIncidentRecord | null;
    /**
     * Bounded query with cursor pagination.
     * Unbounded queries (e.g. getAllArchivedIncidents) are strictly prohibited.
     * Truy vấn có giới hạn với phân trang theo con trỏ cursor.
     * Tuyệt đối cấm các truy vấn không giới hạn.
     */
    queryIncidents(filter: IncidentArchiveQueryFilter, userId?: string): IncidentArchiveQueryResult;
}
