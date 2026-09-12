// src/core/incidentResilience/incidentPostMortemSynthesizer.ts
// BOWCON V4.0 — MS-1.3.56: GOVERNED POST-REMEDIATION RESILIENCE, RECOVERY OUTCOME ANALYSIS & INCIDENT LIFECYCLE CLOSURE PIPELINE
//
// Governed Incident Post-Mortem Synthesizer.
// Compiles a tamper-evident, sanitized post-incident artifact linking evidence, hypothesis,
// human authorization, remediation, verification, effectiveness metrics, and closure state.
// Động cơ tổng hợp hậu kiểm sự cố có quản trị.
// Biên dịch một tài liệu hậu kiểm chống giả mạo, đã được làm sạch liên kết bằng chứng, giả thuyết,
// ủy quyền của con người, khắc phục, xác minh, số liệu hiệu quả và trạng thái đóng sự cố.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - SECRETS SANITIZATION: All secrets, credentials, tokens, and keys MUST be scrubbed via DiagnosisSanitizer.
// - IMMUTABLE ARTIFACT: Emits an immutable PostMortemReport with SHA-256 integrity hash.
// - ADVISORY ONLY: Purely informational post-mortem; zero execution authority.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { IncidentId, RootCauseHypothesis, DecisionPackageId } from '../diagnosis/diagnosisTypes.js';
import type { RemediationPlanId, RemediationExecutionId } from '../remediation/remediationTypes.js';
import {
  type PostMortemReport,
  type IncidentClosureRecord,
  type RemediationEffectivenessMetrics,
  type HypothesisAccuracyRecord,
  type OscillationPattern,
  type BaselineReconciliationRecord,
  createPostMortemReportId,
} from './incidentResilienceTypes.js';

export interface SynthesizePostMortemInput {
  readonly incidentId: IncidentId;
  readonly targetId: string;
  readonly evidenceClusterId?: string;
  readonly primaryHypothesis?: RootCauseHypothesis;
  readonly hypothesisAccuracy?: HypothesisAccuracyRecord;
  readonly decisionPackageId?: DecisionPackageId;
  readonly authorizationTokenReference?: string;
  readonly remediationPlanId?: RemediationPlanId;
  readonly executionId?: RemediationExecutionId;
  readonly verificationSummary?: string;
  readonly rollbackOutcome?: string;
  readonly effectivenessMetrics: RemediationEffectivenessMetrics;
  readonly oscillationSummary?: OscillationPattern;
  readonly baselineReconciliation: BaselineReconciliationRecord;
  readonly closureRecord: IncidentClosureRecord;
  readonly upstreamProvenanceHash?: string;
}

export class IncidentPostMortemSynthesizer {
  constructor(private readonly sanitizer: DiagnosisSanitizer = new DiagnosisSanitizer()) {}

  /**
   * Synthesizes an immutable, cryptographically sealed post-mortem report from all lifecycle artifacts.
   * Tổng hợp báo cáo hậu kiểm bất biến, được niêm phong mật mã từ tất cả các tài liệu vòng đời.
   */
  public synthesizePostMortem(input: SynthesizePostMortemInput): PostMortemReport {
    const generatedAt = Date.now();
    const reportId = createPostMortemReportId(`pmr_${generatedAt}_${crypto.randomBytes(4).toString('hex')}`);

    // Sanitize any potential secrets from string inputs
    // Làm sạch mọi bí mật tiềm ẩn khỏi các đầu vào dạng chuỗi
    const safeTargetId = this.sanitizer.sanitizeString(input.targetId);
    const safeVerificationSummary = this.sanitizer.sanitizeString(input.verificationSummary ?? 'No verification summary recorded.');
    const safeRollbackOutcome = input.rollbackOutcome ? this.sanitizer.sanitizeString(input.rollbackOutcome) : undefined;
    const safeAuthRef = input.authorizationTokenReference
      ? this.sanitizer.sanitizeString(input.authorizationTokenReference)
      : undefined;

    // Sanitize hypothesis text if present
    // Làm sạch văn bản giả thuyết nếu hiện diện
    let safeHypothesis: RootCauseHypothesis | undefined;
    if (input.primaryHypothesis) {
      safeHypothesis = Object.freeze({
        ...input.primaryHypothesis,
        title: this.sanitizer.sanitizeString(input.primaryHypothesis.title),
        description: this.sanitizer.sanitizeString(input.primaryHypothesis.description),
      });
    }

    const upstreamProvenanceHash = input.upstreamProvenanceHash ?? '0000000000000000000000000000000000000000000000000000000000000000';

    // Compute deterministic SHA-256 for post-mortem
    // Tính toán SHA-256 xác định cho hậu kiểm
    const canonicalPayload = JSON.stringify({
      reportId,
      incidentId: input.incidentId,
      targetId: safeTargetId,
      evidenceClusterId: input.evidenceClusterId ?? null,
      primaryHypothesisId: safeHypothesis?.hypothesisId ?? null,
      hypothesisClassification: input.hypothesisAccuracy?.classification ?? null,
      decisionPackageId: input.decisionPackageId ?? null,
      authorizationTokenReference: safeAuthRef ?? null,
      remediationPlanId: input.remediationPlanId ?? null,
      executionId: input.executionId ?? null,
      verificationSummary: safeVerificationSummary,
      rollbackOutcome: safeRollbackOutcome ?? null,
      recoveryScore: input.effectivenessMetrics.recoveryScore,
      closureStatus: input.closureRecord.status,
      closureCertificateHash: input.closureRecord.closureCertificateHash,
      baselineStatus: input.baselineReconciliation.status,
      upstreamProvenanceHash,
      generatedAt,
    });

    const postMortemSha256 = crypto.createHash('sha256').update(canonicalPayload).digest('hex');

    return Object.freeze({
      reportId,
      incidentId: input.incidentId,
      targetId: safeTargetId,
      evidenceClusterId: input.evidenceClusterId,
      primaryHypothesis: safeHypothesis,
      hypothesisAccuracy: input.hypothesisAccuracy,
      decisionPackageId: input.decisionPackageId,
      authorizationTokenReference: safeAuthRef,
      remediationPlanId: input.remediationPlanId,
      executionId: input.executionId,
      verificationSummary: safeVerificationSummary,
      rollbackOutcome: safeRollbackOutcome,
      effectivenessMetrics: input.effectivenessMetrics,
      oscillationSummary: input.oscillationSummary,
      baselineReconciliation: input.baselineReconciliation,
      closureRecord: input.closureRecord,
      upstreamProvenanceHash,
      postMortemSha256,
      generatedAt,
    });
  }
}
