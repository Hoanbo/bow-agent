import { type CanaryTelemetryMetrics, type ShadowEvaluationRecord, type PolicyCandidateId, type PolicyRing } from './policyCanaryTypes.js';
export declare class PolicyCanaryTelemetryAggregator {
    private readonly buckets;
    private readonly observationHistory;
    private getBucketKey;
    private getOrCreateBucket;
    /**
     * Records a Ring 0 shadow evaluation record.
     * Ghi lại bản ghi đánh giá bóng Vòng 0.
     */
    recordShadowEvaluation(record: ShadowEvaluationRecord, candidateId: PolicyCandidateId): void;
    /**
     * Records a live tool execution (active or candidate).
     * Ghi lại một lần thực thi công cụ trực tiếp (hoạt động hoặc ứng viên).
     */
    recordExecution(input: {
        readonly tenantPartition: string;
        readonly candidateId: PolicyCandidateId;
        readonly isCandidate: boolean;
        readonly allowed: boolean;
        readonly latencyMs: number;
        readonly leaseLatencyMs?: number;
        readonly ring?: PolicyRing;
    }): void;
    /**
     * Records guardrail or concurrency violation.
     * Ghi lại vi phạm rào chắn hoặc đồng thời.
     */
    recordViolation(tenantPartition: string, candidateId: PolicyCandidateId, type: 'GUARDRAIL' | 'CONCURRENCY' | 'RETRY' | 'TIMEOUT'): void;
    /**
     * Records policy drift event.
     * Ghi lại sự kiện độ lệch chính sách.
     */
    recordPolicyDrift(tenantPartition: string, candidateId: PolicyCandidateId): void;
    /**
     * Records cryptographic checksum verification failure.
     * Ghi lại thất bại xác minh mã kiểm tra mật mã.
     */
    recordChecksumFailure(tenantPartition: string, candidateId: PolicyCandidateId): void;
    /**
     * Records critical safety regression.
     * Ghi lại thoái lui an toàn nghiêm trọng.
     */
    recordSafetyRegression(tenantPartition: string, candidateId: PolicyCandidateId): void;
    /**
     * Returns aggregated metrics for a specific tenant and candidate.
     * Trả về các chỉ số tổng hợp cho một người thuê và ứng viên cụ thể.
     */
    getMetrics(tenantPartition: string, candidateId: PolicyCandidateId): CanaryTelemetryMetrics;
    /**
     * Retrieves recent shadow observation records.
     * Lấy các bản ghi quan sát bóng gần đây.
     */
    getRecentObservations(tenantPartition: string, candidateId: PolicyCandidateId): readonly ShadowEvaluationRecord[];
    /**
     * Resets telemetry metrics for a tenant and candidate.
     * Đặt lại các chỉ số đo lường từ xa cho người thuê và ứng viên.
     */
    resetMetrics(tenantPartition: string, candidateId: PolicyCandidateId): void;
}
export declare const globalPolicyCanaryTelemetryAggregator: PolicyCanaryTelemetryAggregator;
