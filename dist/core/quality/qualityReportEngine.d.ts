import { type QualityVerificationReport, type QualityEvidenceBundle, type QualityGateEvaluation, type QualityContradictionState } from './qualityTypes.js';
export interface CreateReportInput {
    readonly evidenceBundle: QualityEvidenceBundle;
    readonly gateEvaluation: QualityGateEvaluation;
    readonly contradictionState?: QualityContradictionState;
    readonly failureReasons?: readonly string[];
    readonly blockingReasons?: readonly string[];
}
export declare class QualityReportEngine {
    /**
     * Computes deterministic SHA-256 hash representing the complete QualityVerificationReport.
     * Tính toán mã băm SHA-256 tất định đại diện cho Báo cáo Xác minh Chất lượng hoàn chỉnh.
     */
    static hashReport(reportId: string, evidenceId: string, gateId: string, overallState: string, manifestHash: string, evidenceHash: string, gateEvaluationHash: string): string;
    /**
     * Compiles an immutable QualityVerificationReport from verified evidence and gate evaluations.
     * Biên soạn một QualityVerificationReport bất biến từ bằng chứng đã xác minh và các đánh giá cổng.
     */
    createReport(input: CreateReportInput): QualityVerificationReport;
}
