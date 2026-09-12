import { type PolicyRuntimeHealthSnapshot, type PolicyGovernanceReport, type PolicyEvidenceQuery, type PolicyEvidenceRecord } from './policyObservabilityTypes.js';
import { PolicyEvidenceCollector } from './policyEvidenceCollector.js';
import { type PolicyCandidateId, type PolicyRing, type PolicyCanaryState } from '../policyCanary/policyCanaryTypes.js';
import { PolicyCanaryTelemetryAggregator } from '../policyCanary/policyCanaryTelemetryAggregator.js';
import { PolicyCanaryHealthMonitor } from '../policyCanary/policyCanaryHealthMonitor.js';
import { PolicyCanaryCircuitBreaker } from '../policyCanary/policyCanaryCircuitBreaker.js';
import { PolicyCanaryProvenanceEngine } from '../policyCanary/policyCanaryProvenanceEngine.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface PolicyGovernanceReporterOptions {
    readonly telemetryAggregator?: PolicyCanaryTelemetryAggregator;
    readonly healthMonitor?: PolicyCanaryHealthMonitor;
    readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
    readonly provenanceEngine?: PolicyCanaryProvenanceEngine;
    readonly evidenceCollector?: PolicyEvidenceCollector;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyGovernanceReporter {
    private readonly telemetryAggregator;
    private readonly healthMonitor;
    private readonly circuitBreaker;
    private readonly provenanceEngine;
    private readonly evidenceCollector;
    private readonly sanitizer;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyGovernanceReporterOptions);
    /**
     * Assembles a read-only PolicyRuntimeHealthSnapshot for a given tenant and candidate.
     * Aggregates evidence from telemetry, health monitor, circuit breaker, provenance,
     * and the local evidence collector.
     *
     * Lắp ráp PolicyRuntimeHealthSnapshot chỉ đọc cho một người thuê và ứng viên đã cho.
     * Tổng hợp bằng chứng từ đo lường, giám sát sức khỏe, bộ ngắt mạch, nguồn gốc
     * và bộ thu thập bằng chứng cục bộ.
     */
    buildHealthSnapshot(input: {
        readonly tenantPartition: string;
        readonly activePolicyVersion: string;
        readonly candidateId?: PolicyCandidateId;
        readonly candidatePolicyVersion?: string;
        readonly candidateState?: PolicyCanaryState;
        readonly currentRing?: PolicyRing;
        readonly observationWindowStart?: string;
        readonly observationWindowEnd?: string;
    }): PolicyRuntimeHealthSnapshot;
    /**
     * Generates a read-only PolicyGovernanceReport from evidence in the collector.
     * This report is advisory only. It NEVER triggers promotion, approval, or token issuance.
     *
     * Tạo PolicyGovernanceReport chỉ đọc từ bằng chứng trong bộ thu thập.
     * Báo cáo này chỉ mang tính cố vấn. KHÔNG BAO GIỜ kích hoạt thăng hạng, phê duyệt hoặc cấp mã.
     */
    generateGovernanceReport(input: {
        readonly tenantPartition: string;
        readonly activePolicyVersion: string;
        readonly candidateId?: PolicyCandidateId;
        readonly candidateState?: PolicyCanaryState;
        readonly currentRing?: PolicyRing;
        readonly reportPeriodStart: string;
        readonly reportPeriodEnd: string;
    }): PolicyGovernanceReport;
    /**
     * Delegates a read-only evidence query to the evidence collector with strict tenant isolation.
     * Anonymous queries fail closed.
     *
     * Ủy quyền truy vấn bằng chứng chỉ đọc cho bộ thu thập bằng chứng với cô lập người thuê nghiêm ngặt.
     * Các truy vấn ẩn danh thất bại theo hướng đóng.
     */
    queryEvidence(filter: PolicyEvidenceQuery): readonly PolicyEvidenceRecord[];
    private buildAdvisorySummary;
}
export declare const globalPolicyGovernanceReporter: PolicyGovernanceReporter;
