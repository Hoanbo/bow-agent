// src/core/deployment/deploymentReportEngine.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Deterministic deployment verification report compiler.
// Trình biên dịch báo cáo xác minh triển khai xác định.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - DEPLOYMENT_REPORT != AUTHORIZATION (Report is advisory monitoring evidence).
// - DETERMINISTIC HASH GENERATION.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { createDeploymentReportId, } from './deploymentTypes.js';
export class DeploymentReportEngine {
    /**
     * Computes a deterministic SHA-256 hash for a compiled deployment verification report.
     * Tính toán mã băm SHA-256 xác định cho báo cáo xác minh triển khai đã biên dịch.
     */
    computeReportHash(report) {
        const serialized = JSON.stringify(report, Object.keys(report).sort());
        return crypto.createHash('sha256').update(serialized).digest('hex');
    }
    /**
     * Compiles the deterministic DeploymentVerificationReport.
     * Biên dịch DeploymentVerificationReport xác định.
     */
    compileReport(input) {
        const reportId = createDeploymentReportId(`report_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
        const generatedAt = Date.now();
        const partialReport = {
            reportId,
            deploymentId: input.deploymentId,
            candidateId: input.candidateId,
            releaseExecutionId: input.releaseExecutionId,
            targetEnvironment: input.targetEnvironment,
            highestRingReached: input.highestRingReached,
            finalState: input.finalState,
            isSuccessful: input.isSuccessful,
            canaryVerifications: input.canaryVerifications,
            circuitBreakerEvents: input.circuitBreakerEvents,
            rollbackRecord: input.rollbackRecord,
            contradictionRecord: input.contradictionRecord,
            provenanceHash: input.provenanceHash,
            generatedAt,
        };
        const reportHash = this.computeReportHash(partialReport);
        return {
            ...partialReport,
            reportHash,
        };
    }
}
