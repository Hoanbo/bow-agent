import { type ObservabilitySessionId, type SupervisorHealthReport, type ObservabilityHealthState, type ObservabilityAlert, type DriftEvent, type InvariantCheck, type ObservabilityContradictionRecord } from './observabilityTypes.js';
export interface HealthReportAssemblyInput {
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
    readonly provenanceStatus?: 'VERIFIED' | 'COMPROMISED' | 'MISSING';
    readonly recommendedNextAction?: string;
    readonly confidenceScore?: number;
}
export declare class SupervisorHealthReportEngine {
    private reports;
    /**
     * Generates a deterministic SHA-256 hash representing the full report contents.
     * Tạo mã băm SHA-256 xác định đại diện cho toàn bộ nội dung báo cáo.
     */
    computeReportHash(reportData: Omit<SupervisorHealthReport, 'reportHash'>): string;
    /**
     * Assembles an advisory health report for human supervisor review.
     * Lắp ráp một báo cáo sức khỏe khuyến nghị để người giám sát con người xem xét.
     */
    generateReport(input: HealthReportAssemblyInput): SupervisorHealthReport;
    /**
     * Retrieves all reports generated for a session.
     * Lấy tất cả các báo cáo được tạo cho một phiên.
     */
    getReports(sessionId: ObservabilitySessionId): readonly SupervisorHealthReport[];
    /**
     * Clears in-memory reports.
     * Xóa các báo cáo trong bộ nhớ.
     */
    clear(sessionId?: ObservabilitySessionId): void;
}
