import { type DeploymentId, type DeploymentCandidateId, type RolloutRingLevel, type DeploymentState, type CanaryVerificationRecord, type CircuitBreakerEvent, type DeploymentRollbackRecord, type DeploymentContradictionRecord, type DeploymentVerificationReport } from './deploymentTypes.js';
export interface CompileDeploymentReportInput {
    readonly deploymentId: DeploymentId;
    readonly candidateId: DeploymentCandidateId;
    readonly releaseExecutionId: string;
    readonly targetEnvironment: string;
    readonly highestRingReached: RolloutRingLevel;
    readonly finalState: DeploymentState;
    readonly isSuccessful: boolean;
    readonly canaryVerifications: readonly CanaryVerificationRecord[];
    readonly circuitBreakerEvents: readonly CircuitBreakerEvent[];
    readonly rollbackRecord?: DeploymentRollbackRecord;
    readonly contradictionRecord?: DeploymentContradictionRecord;
    readonly provenanceHash: string;
}
export declare class DeploymentReportEngine {
    /**
     * Computes a deterministic SHA-256 hash for a compiled deployment verification report.
     * Tính toán mã băm SHA-256 xác định cho báo cáo xác minh triển khai đã biên dịch.
     */
    computeReportHash(report: Omit<DeploymentVerificationReport, 'reportHash'>): string;
    /**
     * Compiles the deterministic DeploymentVerificationReport.
     * Biên dịch DeploymentVerificationReport xác định.
     */
    compileReport(input: CompileDeploymentReportInput): DeploymentVerificationReport;
}
