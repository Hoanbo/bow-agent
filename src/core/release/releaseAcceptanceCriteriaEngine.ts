// src/core/release/releaseAcceptanceCriteriaEngine.ts
// BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
//
// Engine evaluating all 8 mandatory acceptance criteria for a release candidate
// against a QualityVerificationReport and QualityEvidenceBundle.
// Động cơ đánh giá tất cả 8 tiêu chí chấp nhận bắt buộc cho một ứng viên phát hành
// đối chiếu với QualityVerificationReport và QualityEvidenceBundle.
//
// STRICT INVARIANTS:
// - FAIL CLOSED: ANY failing criterion => overall FAIL (no override, no skip)
// - QUALITY_PASS != RELEASE_AUTHORIZATION
// - EVIDENCE_HASH verification must recompute — never trust cached hash alone
// - PROVENANCE_HASH must be recomputable from candidate fields
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type ReleaseCandidate,
  type AcceptanceCriteriaResult,
  type AcceptanceCriterionKey,
  type ReleaseAcceptanceCriteriaId,
  createReleaseAcceptanceCriteriaId,
} from './releaseTypes.js';
import { ReleaseCandidateEngine } from './releaseCandidateEngine.js';
import type { QualityVerificationReport, QualityEvidenceBundle } from '../quality/qualityTypes.js';
import { QualityEvidenceEngine } from '../quality/qualityEvidenceEngine.js';

export interface AcceptanceCriteriaEvaluationOutput {
  readonly acceptanceCriteriaId: ReleaseAcceptanceCriteriaId;
  readonly results: readonly AcceptanceCriteriaResult[];
  readonly overallPass: boolean;
  readonly failureReasons: readonly string[];
  readonly evaluationHash: string;
}

export class ReleaseAcceptanceCriteriaEngine {
  /**
   * Computes a deterministic SHA-256 hash over all acceptance criteria results.
   * Tính toán mã băm SHA-256 tất định trên tất cả kết quả tiêu chí chấp nhận.
   */
  public static hashCriteriaResults(results: readonly AcceptanceCriteriaResult[]): string {
    const payload = results
      .map((r) => `${r.criterion}:${r.passed ? 'PASS' : 'FAIL'}:${r.evidenceHash ?? ''}`)
      .join(';');
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Evaluates all 8 mandatory acceptance criteria for the release candidate.
   * Fail-closed: ALL criteria must pass for overallPass = true.
   *
   * Đánh giá tất cả 8 tiêu chí chấp nhận bắt buộc cho ứng viên phát hành.
   * Thất bại đóng: TẤT CẢ tiêu chí phải qua để overallPass = true.
   */
  public evaluateAll(
    candidate: ReleaseCandidate,
    qualityReport: QualityVerificationReport,
    evidenceBundle: QualityEvidenceBundle
  ): AcceptanceCriteriaEvaluationOutput {
    const now = Date.now();
    const results: AcceptanceCriteriaResult[] = [];
    const failureReasons: string[] = [];

    // ── Criterion 1: QUALITY_REPORT_PASS ─────────────────────────────────────
    // The quality report's overall gate state must be PASS.
    // Trạng thái cổng tổng thể của báo cáo chất lượng phải là PASS.
    {
      const passed = qualityReport.overallState === 'PASS';
      const details = passed
        ? 'Quality verification report overallState is PASS.'
        : `Quality verification report overallState is "${qualityReport.overallState}" (expected PASS).`;
      results.push({ criterion: 'QUALITY_REPORT_PASS', passed, details, evaluatedAt: now });
      if (!passed) failureReasons.push(`[QUALITY_REPORT_PASS] ${details}`);
    }

    // ── Criterion 2: GATE_PASS ────────────────────────────────────────────────
    // Ensure the report has no blocking reasons.
    // Đảm bảo báo cáo không có lý do chặn.
    {
      const passed =
        qualityReport.overallState === 'PASS' && qualityReport.blockingReasons.length === 0;
      const details = passed
        ? 'No blocking reasons in quality report gate evaluation.'
        : `Quality gate has ${qualityReport.blockingReasons.length} blocking reason(s): ${qualityReport.blockingReasons.join(', ')}.`;
      results.push({ criterion: 'GATE_PASS', passed, details, evaluatedAt: now });
      if (!passed) failureReasons.push(`[GATE_PASS] ${details}`);
    }

    // ── Criterion 3: CONTRADICTION_FREE ──────────────────────────────────────
    // The quality report contradiction state must be CONSISTENT.
    // Trạng thái mâu thuẫn của báo cáo chất lượng phải là CONSISTENT.
    {
      const passed = qualityReport.contradictionState === 'CONSISTENT';
      const details = passed
        ? 'Quality report contradictionState is CONSISTENT.'
        : `Quality report contradictionState is "${qualityReport.contradictionState}" (expected CONSISTENT).`;
      results.push({ criterion: 'CONTRADICTION_FREE', passed, details, evaluatedAt: now });
      if (!passed) failureReasons.push(`[CONTRADICTION_FREE] ${details}`);
    }

    // ── Criterion 4: EVIDENCE_VERIFIED ───────────────────────────────────────
    // Recompute the evidence hash and verify it matches the stored value.
    // Tính toán lại mã băm bằng chứng và xác minh nó khớp với giá trị đã lưu.
    {
      let passed = false;
      let details = '';
      let evidenceHash: string | undefined;
      try {
        const buildHashes = evidenceBundle.buildResults.map((b) => b.buildEvidenceHash);
        const testHashes = evidenceBundle.testResults.map((t) => t.testEvidenceHash);
        const recomputed = QualityEvidenceEngine.hashEvidenceBundle(
          evidenceBundle.evidenceId,
          evidenceBundle.context,
          evidenceBundle.manifestHash,
          buildHashes,
          testHashes,
          evidenceBundle.securityScanResult?.scanHash
        );
        passed = recomputed === evidenceBundle.evidenceHash;
        evidenceHash = evidenceBundle.evidenceHash;
        details = passed
          ? `Evidence bundle hash verified: "${evidenceBundle.evidenceHash}".`
          : `Evidence bundle hash mismatch: stored "${evidenceBundle.evidenceHash}", recomputed "${recomputed}".`;
      } catch (err: unknown) {
        details = `Evidence hash recomputation failed: ${(err as Error).message}`;
      }
      results.push({ criterion: 'EVIDENCE_VERIFIED', passed, details, evidenceHash, evaluatedAt: now });
      if (!passed) failureReasons.push(`[EVIDENCE_VERIFIED] ${details}`);
    }

    // ── Criterion 5: MANIFEST_HASH_BOUND ─────────────────────────────────────
    // The candidate's sourceManifestHash must equal the evidenceBundle's manifestHash.
    // sourceManifestHash của ứng viên phải bằng manifestHash của evidenceBundle.
    {
      const passed = candidate.sourceManifestHash === evidenceBundle.manifestHash;
      const details = passed
        ? `sourceManifestHash matches evidenceBundle.manifestHash: "${candidate.sourceManifestHash}".`
        : `Manifest hash mismatch: candidate="${candidate.sourceManifestHash}", bundle="${evidenceBundle.manifestHash}".`;
      results.push({ criterion: 'MANIFEST_HASH_BOUND', passed, details, evaluatedAt: now });
      if (!passed) failureReasons.push(`[MANIFEST_HASH_BOUND] ${details}`);
    }

    // ── Criterion 6: NO_BUILD_FAILURES ───────────────────────────────────────
    // Zero failed builds in the quality report.
    // Không có lần dựng thất bại trong báo cáo chất lượng.
    {
      const passed = qualityReport.buildSummary.failed === 0;
      const details = passed
        ? `Build summary: ${qualityReport.buildSummary.passed} passed, 0 failed.`
        : `Build failures detected: ${qualityReport.buildSummary.failed} build(s) failed.`;
      results.push({ criterion: 'NO_BUILD_FAILURES', passed, details, evaluatedAt: now });
      if (!passed) failureReasons.push(`[NO_BUILD_FAILURES] ${details}`);
    }

    // ── Criterion 7: NO_TEST_FAILURES ────────────────────────────────────────
    // Zero failed test suites in the quality report.
    // Không có bộ kiểm thử thất bại trong báo cáo chất lượng.
    {
      const passed = qualityReport.testSummary.failedSuites === 0;
      const details = passed
        ? `Test summary: ${qualityReport.testSummary.passedSuites} suites passed, 0 failed.`
        : `Test failures detected: ${qualityReport.testSummary.failedSuites} suite(s) failed.`;
      results.push({ criterion: 'NO_TEST_FAILURES', passed, details, evaluatedAt: now });
      if (!passed) failureReasons.push(`[NO_TEST_FAILURES] ${details}`);
    }

    // ── Criterion 8: PROVENANCE_HASH_VALID ───────────────────────────────────
    // Recompute and verify the candidate's provenance hash.
    // Tính toán lại và xác minh mã băm nguồn gốc của ứng viên.
    {
      let passed = false;
      let details = '';
      try {
        ReleaseCandidateEngine.verifyProvenanceHash(candidate);
        passed = true;
        details = `Candidate provenance hash verified: "${candidate.provenanceHash}".`;
      } catch (err: unknown) {
        details = (err as Error).message;
      }
      results.push({
        criterion: 'PROVENANCE_HASH_VALID',
        passed,
        details,
        evidenceHash: candidate.provenanceHash,
        evaluatedAt: now,
      });
      if (!passed) failureReasons.push(`[PROVENANCE_HASH_VALID] ${details}`);
    }

    // ── Final assembly ────────────────────────────────────────────────────────
    // Overall pass requires ALL 8 criteria to pass — fail-closed.
    // Đạt tổng thể yêu cầu TẤT CẢ 8 tiêu chí đều qua — thất bại đóng.
    const overallPass = results.every((r) => r.passed);
    const frozenResults = Object.freeze(results.map((r) => Object.freeze(r)));
    const evaluationHash = ReleaseAcceptanceCriteriaEngine.hashCriteriaResults(frozenResults);
    const acceptanceCriteriaId = createReleaseAcceptanceCriteriaId(
      `ac_${Date.now()}_${evaluationHash.slice(0, 8)}`
    );

    return Object.freeze({
      acceptanceCriteriaId,
      results: frozenResults,
      overallPass,
      failureReasons: Object.freeze(failureReasons),
      evaluationHash,
    });
  }
}
