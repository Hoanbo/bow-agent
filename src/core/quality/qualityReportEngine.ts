// src/core/quality/qualityReportEngine.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Governed engine compiling cryptographically hashable QualityVerificationReports.
// Động cơ có quản trị biên soạn các Báo cáo Xác minh Chất lượng có thể băm mật mã.
//
// STRICT INVARIANTS:
// - QUALITY_REPORT != AUTHORIZATION
// - QUALITY_PASS != PROMOTION_AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type QualityVerificationReport,
  type QualityReportId,
  type QualityEvidenceBundle,
  type QualityGateEvaluation,
  type QualityContradictionState,
  createQualityReportId,
} from './qualityTypes.js';

export interface CreateReportInput {
  readonly evidenceBundle: QualityEvidenceBundle;
  readonly gateEvaluation: QualityGateEvaluation;
  readonly contradictionState?: QualityContradictionState;
  readonly failureReasons?: readonly string[];
  readonly blockingReasons?: readonly string[];
}

export class QualityReportEngine {
  /**
   * Computes deterministic SHA-256 hash representing the complete QualityVerificationReport.
   * Tính toán mã băm SHA-256 tất định đại diện cho Báo cáo Xác minh Chất lượng hoàn chỉnh.
   */
  public static hashReport(
    reportId: string,
    evidenceId: string,
    gateId: string,
    overallState: string,
    manifestHash: string,
    evidenceHash: string,
    gateEvaluationHash: string
  ): string {
    const payload = `${reportId}:${evidenceId}:${gateId}:${overallState}:${manifestHash}:${evidenceHash}:${gateEvaluationHash}`;
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Compiles an immutable QualityVerificationReport from verified evidence and gate evaluations.
   * Biên soạn một QualityVerificationReport bất biến từ bằng chứng đã xác minh và các đánh giá cổng.
   */
  public createReport(input: CreateReportInput): QualityVerificationReport {
    const reportId: QualityReportId = createQualityReportId(`qrep_${crypto.randomUUID()}`);
    const issuedAt = Date.now();

    const buildTotal = input.evidenceBundle.buildResults.length;
    const buildPassed = input.evidenceBundle.buildResults.filter((b) => b.state === 'PASSED').length;
    const buildFailed = buildTotal - buildPassed;

    let testTotalSuites = 0;
    let testPassedSuites = 0;
    let testFailedSuites = 0;
    let totalAssertions: number | undefined = undefined;

    for (const test of input.evidenceBundle.testResults) {
      testTotalSuites += test.summary.suiteCount;
      testPassedSuites += test.summary.passedSuites;
      testFailedSuites += test.summary.failedSuites;
      if (test.summary.assertionCount !== undefined) {
        totalAssertions = (totalAssertions ?? 0) + test.summary.assertionCount;
      }
    }

    const overallState = input.gateEvaluation.overallState;
    const contradictionState = input.contradictionState ?? 'CONSISTENT';

    const reportHash = QualityReportEngine.hashReport(
      reportId,
      input.evidenceBundle.evidenceId,
      input.gateEvaluation.gateId,
      overallState,
      input.evidenceBundle.manifestHash,
      input.evidenceBundle.evidenceHash,
      input.gateEvaluation.evaluationHash
    );

    const failureReasons = [
      ...(input.failureReasons ?? []),
      ...input.gateEvaluation.blockingReasons.filter((r) => r.includes('failed')),
    ];

    const blockingReasons = [
      ...(input.blockingReasons ?? []),
      ...input.gateEvaluation.blockingReasons.filter((r) => !r.includes('failed')),
    ];

    return Object.freeze({
      reportId,
      evidenceId: input.evidenceBundle.evidenceId,
      gateId: input.gateEvaluation.gateId,
      context: Object.freeze({ ...input.evidenceBundle.context }),
      overallState,
      contradictionState,
      buildSummary: Object.freeze({
        total: buildTotal,
        passed: buildPassed,
        failed: buildFailed,
      }),
      testSummary: Object.freeze({
        totalSuites: testTotalSuites,
        passedSuites: testPassedSuites,
        failedSuites: testFailedSuites,
        totalAssertions,
      }),
      manifestHash: input.evidenceBundle.manifestHash,
      evidenceHash: input.evidenceBundle.evidenceHash,
      gateEvaluationHash: input.gateEvaluation.evaluationHash,
      reportHash,
      issuedAt,
      failureReasons: Object.freeze(failureReasons),
      blockingReasons: Object.freeze(blockingReasons),
    });
  }
}
