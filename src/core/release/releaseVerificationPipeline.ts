// src/core/release/releaseVerificationPipeline.ts
// BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
//
// 10-stage ordered, fail-closed Release Verification Pipeline.
// Every stage must succeed for the next to execute.
// Any failure produces a FAIL-state ReleaseVerificationRecord — never a silent PASS.
//
// Đường ống Xác minh Phát hành 10 giai đoạn theo thứ tự, thất bại đóng.
// Mỗi giai đoạn phải thành công để giai đoạn tiếp theo thực thi.
// Bất kỳ thất bại nào cũng tạo ra ReleaseVerificationRecord trạng thái FAIL — không bao giờ PASS im lặng.
//
// STRICT INVARIANTS:
// - TECHNICAL_VERIFICATION != OWNER_APPROVAL
// - QUALITY_PASS != RELEASE_AUTHORIZATION
// - VERIFICATION_PIPELINE_PASS != RELEASE_AUTHORIZATION
// - CONTRADICTION => SUPERVISOR_GATE (no auto-resolve)
// - USER_STOP checked at Stage 1 before any work
// - Protected workspace checked at Stage 2
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type ReleaseCandidate,
  type ReleaseVerificationRecord,
  type ReleaseVerificationState,
  type ReleaseContradiction,
  type ReleaseSupervisorGateRecord,
  type ReleaseVerificationContext,
  createReleaseVerificationId,
  createReleaseAcceptanceCriteriaId,
  ReleaseError,
  ReleaseErrorCode,
  RELEASE_SCHEMA_VERSION,
} from './releaseTypes.js';
import { ReleasePolicyEngine } from './releasePolicyEngine.js';
import { ReleaseCandidateEngine } from './releaseCandidateEngine.js';
import { ReleaseAcceptanceCriteriaEngine } from './releaseAcceptanceCriteriaEngine.js';
import { ReleaseContradictionEngine } from './releaseContradictionEngine.js';
import type { QualityRuntime } from '../quality/qualityRuntime.js';
import type { SandboxDescriptor, SandboxManifest } from '../sandbox/sandboxTypes.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';

export interface RunPipelineOptions {
  readonly isUserStopped?: boolean;
  readonly userStopReason?: string;
  readonly isRevoked?: boolean;
  /** Additional release candidates to check for cross-agent contradictions. */
  readonly siblingCandidates?: readonly ReleaseCandidate[];
  /** Additional verification records to check for cross-agent contradictions. */
  readonly siblingVerifications?: readonly ReleaseVerificationRecord[];
}

export class ReleaseVerificationPipeline {
  private readonly criteriaEngine = new ReleaseAcceptanceCriteriaEngine();
  private readonly contradictionEngine = new ReleaseContradictionEngine();

  constructor(
    private readonly qualityRuntime: QualityRuntime,
    private readonly auditLedger: AuditLedger = globalAuditLedger
  ) {}

  /**
   * Computes the deterministic SHA-256 hash for a ReleaseVerificationRecord.
   * Covers: verificationId + candidateId + provenanceHash + criteria evaluation hash + verificationState.
   *
   * Tính toán mã băm SHA-256 tất định cho ReleaseVerificationRecord.
   * Bao gồm: verificationId + candidateId + provenanceHash + mã băm đánh giá tiêu chí + verificationState.
   */
  public static hashVerificationRecord(
    verificationId: string,
    candidateId: string,
    provenanceHash: string,
    evaluationHash: string,
    verificationState: ReleaseVerificationState
  ): string {
    const payload = `${verificationId}|${candidateId}|${provenanceHash}|${evaluationHash}|${verificationState}`;
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Records an audit event to the AuditLedger.
   * Ghi lại một sự kiện kiểm toán vào AuditLedger.
   */
  private logAudit(
    actorId: string,
    action: string,
    targetResource: string,
    decision: 'PERMIT' | 'DENY',
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED',
    metadata: Record<string, unknown>
  ): void {
    try {
      const argumentsHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(metadata ?? {}), 'utf8')
        .digest('hex');
      this.auditLedger.record({
        timestamp: new Date().toISOString(),
        actor: { userId: actorId, role: 'RELEASE_PIPELINE', channel: 'INTERNAL' },
        domain: 'RELEASE_VERIFICATION',
        toolName: action,
        classification: status === 'BLOCKED' ? 'SAFETY' : 'VERIFICATION',
        argumentsHash,
        policyDecision: decision,
        executionStatus: status,
        resultHash: argumentsHash,
      });
    } catch {
      // Fail closed: audit errors must not suppress pipeline state.
      // Thất bại đóng: lỗi kiểm toán không được che khuất trạng thái đường ống.
    }
  }

  /**
   * Assembles a terminal FAIL ReleaseVerificationRecord from pipeline failure.
   * Used by each stage to produce a deterministic, fail-closed output.
   *
   * Lắp ráp một ReleaseVerificationRecord FAIL cuối cùng từ thất bại đường ống.
   * Được dùng bởi mỗi giai đoạn để tạo ra đầu ra thất bại đóng, tất định.
   */
  private buildFailRecord(
    candidate: ReleaseCandidate,
    verificationState: ReleaseVerificationState,
    failureReasons: readonly string[],
    contradictions: readonly ReleaseContradiction[],
    supervisorGateRecord?: ReleaseSupervisorGateRecord
  ): ReleaseVerificationRecord {
    const verificationId = createReleaseVerificationId(
      `rv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );
    const acceptanceCriteriaId = createReleaseAcceptanceCriteriaId(`ac_fail_${Date.now()}`);
    const evaluationHash = crypto
      .createHash('sha256')
      .update(`FAIL:${candidate.candidateId}:${failureReasons.join(';')}`, 'utf8')
      .digest('hex');
    const verificationHash = ReleaseVerificationPipeline.hashVerificationRecord(
      verificationId,
      candidate.candidateId,
      candidate.provenanceHash,
      evaluationHash,
      verificationState
    );

    return Object.freeze({
      verificationId,
      schemaVersion: RELEASE_SCHEMA_VERSION,
      candidateId: candidate.candidateId,
      milestoneTag: candidate.milestoneTag,
      qualityReportId: candidate.qualityReportId,
      evidenceId: candidate.evidenceId,
      acceptanceCriteriaResults: Object.freeze([]),
      acceptanceCriteriaId,
      verificationState,
      contradictions: Object.freeze(contradictions),
      supervisorGateRecord,
      failureReasons: Object.freeze([...failureReasons]),
      verificationHash,
      issuedAt: Date.now(),
    });
  }

  /**
   * Executes the full 10-stage Release Verification Pipeline.
   *
   * INVARIANT REMINDER:
   * A PASS result from this pipeline is a TECHNICAL FINDING ONLY.
   * It is NOT release authorization. It is NOT owner approval.
   * The Master Owner must independently authorize any actual release.
   *
   * Thực thi toàn bộ Đường ống Xác minh Phát hành 10 giai đoạn.
   *
   * NHẮC NHỞ BẤT BIẾN:
   * Kết quả PASS từ đường ống này chỉ là KẾT QUẢ KỸ THUẬT.
   * KHÔNG phải ủy quyền phát hành. KHÔNG phải phê duyệt của Owner.
   * Master Owner phải độc lập ủy quyền cho bất kỳ hành động phát hành thực tế nào.
   */
  public async run(
    candidate: ReleaseCandidate,
    context: ReleaseVerificationContext,
    sandbox: SandboxDescriptor,
    currentManifest: SandboxManifest,
    options?: RunPipelineOptions
  ): Promise<ReleaseVerificationRecord> {
    // ── Stage 1: USER_STOP & REVOCATION Supremacy ─────────────────────────
    // These are the highest authority — no pipeline work may proceed if active.
    // Đây là thẩm quyền cao nhất — không có công việc đường ống nào được tiến hành nếu đang kích hoạt.
    try {
      ReleasePolicyEngine.assertNotUserStopped(
        options?.isUserStopped ?? false,
        options?.userStopReason
      );
      ReleasePolicyEngine.assertNotRevoked(options?.isRevoked ?? false);
    } catch (err) {
      this.logAudit(context.agentId, 'release_pipeline_blocked', context.projectRoot, 'DENY', 'BLOCKED', {
        stage: 1,
        reason: (err as Error).message,
      });
      return this.buildFailRecord(
        candidate,
        'BLOCKED',
        [(err as Error).message],
        []
      );
    }

    // ── Stage 2: Protected Workspace Isolation ────────────────────────────
    // Must check BEFORE any candidate data is accessed.
    // Phải kiểm tra TRƯỚC KHI truy cập bất kỳ dữ liệu ứng viên nào.
    try {
      ReleasePolicyEngine.assertNotProtectedWorkspace(context.projectRoot);
      ReleasePolicyEngine.assertNotProtectedWorkspace(sandbox.rootPath);
    } catch (err) {
      this.logAudit(context.agentId, 'release_pipeline_protected_workspace_violation', context.projectRoot, 'DENY', 'BLOCKED', {
        stage: 2,
        reason: (err as Error).message,
      });
      return this.buildFailRecord(candidate, 'BLOCKED', [(err as Error).message], []);
    }

    // ── Stage 3: Candidate Lifecycle Validation ───────────────────────────
    // Candidate must be in PROPOSED or VERIFYING state, not expired/stale/failed/revoked.
    // Ứng viên phải ở trạng thái PROPOSED hoặc VERIFYING, không hết hạn/cũ/thất bại/bị thu hồi.
    try {
      ReleasePolicyEngine.assertCandidateNotExpired(candidate);
      ReleasePolicyEngine.assertCandidateExecutable(candidate);
    } catch (err) {
      this.logAudit(context.agentId, 'release_candidate_validation_failed', context.projectRoot, 'DENY', 'FAILURE', {
        stage: 3,
        candidateId: candidate.candidateId,
        reason: (err as Error).message,
      });
      return this.buildFailRecord(candidate, 'FAIL', [(err as Error).message], []);
    }

    // ── Stage 4: Quality Report Retrieval ─────────────────────────────────
    // Fetch the QualityVerificationReport from the governing QualityRuntime.
    // Lấy QualityVerificationReport từ QualityRuntime quản trị.
    const qualityReport = this.qualityRuntime.getQualityReport(candidate.qualityReportId);
    if (!qualityReport) {
      const reason = `Quality report "${candidate.qualityReportId}" not found in QualityRuntime.`;
      this.logAudit(context.agentId, 'release_quality_report_not_found', context.projectRoot, 'DENY', 'FAILURE', {
        stage: 4,
        qualityReportId: candidate.qualityReportId,
      });
      return this.buildFailRecord(candidate, 'FAIL', [reason], []);
    }

    // ── Stage 5: Evidence Bundle Retrieval ───────────────────────────────
    // Fetch the QualityEvidenceBundle from QualityRuntime.
    // Lấy QualityEvidenceBundle từ QualityRuntime.
    const evidenceBundle = this.qualityRuntime.getEvidenceBundle(candidate.evidenceId);
    if (!evidenceBundle) {
      const reason = `Evidence bundle "${candidate.evidenceId}" not found in QualityRuntime.`;
      this.logAudit(context.agentId, 'release_evidence_bundle_not_found', context.projectRoot, 'DENY', 'FAILURE', {
        stage: 5,
        evidenceId: candidate.evidenceId,
      });
      return this.buildFailRecord(candidate, 'FAIL', [reason], []);
    }

    // ── Stage 6: Evidence Integrity Verification ──────────────────────────
    // Recompute and verify the evidence bundle cryptographic integrity.
    // Tính toán lại và xác minh tính toàn vẹn mật mã của gói bằng chứng.
    try {
      this.qualityRuntime.verifyEvidence(evidenceBundle, sandbox, currentManifest);
    } catch (err) {
      const reason = `Evidence integrity verification failed: ${(err as Error).message}`;
      this.logAudit(context.agentId, 'release_evidence_verification_failed', context.projectRoot, 'DENY', 'FAILURE', {
        stage: 6,
        evidenceId: candidate.evidenceId,
        reason,
      });
      return this.buildFailRecord(candidate, 'FAIL', [reason], []);
    }

    // ── Stage 7: Acceptance Criteria Evaluation ───────────────────────────
    // Evaluate all 8 mandatory criteria — fail-closed.
    // Đánh giá tất cả 8 tiêu chí bắt buộc — thất bại đóng.
    const criteriaOutput = this.criteriaEngine.evaluateAll(
      candidate,
      qualityReport,
      evidenceBundle
    );

    this.logAudit(
      context.agentId,
      'release_acceptance_criteria_evaluated',
      context.projectRoot,
      criteriaOutput.overallPass ? 'PERMIT' : 'DENY',
      criteriaOutput.overallPass ? 'SUCCESS' : 'FAILURE',
      {
        stage: 7,
        candidateId: candidate.candidateId,
        overallPass: criteriaOutput.overallPass,
        evaluationHash: criteriaOutput.evaluationHash,
        failureCount: criteriaOutput.failureReasons.length,
      }
    );

    // ── Stage 8: Contradiction Detection ─────────────────────────────────
    // Check sibling candidates and verifications for cross-agent contradictions.
    // Kiểm tra các ứng viên và xác minh anh chị em để tìm mâu thuẫn giữa các agent.
    let contradictions: readonly ReleaseContradiction[] = [];
    if (options?.siblingCandidates?.length) {
      const allCandidates = [candidate, ...options.siblingCandidates];
      contradictions = [
        ...contradictions,
        ...this.contradictionEngine.detectCandidateContradictions(allCandidates),
      ];
    }
    if (options?.siblingVerifications?.length) {
      contradictions = [
        ...contradictions,
        ...this.contradictionEngine.detectVerificationContradictions(options.siblingVerifications),
      ];
    }

    // ── Stage 9: SupervisorHumanGate Escalation ───────────────────────────
    // Escalation is MANDATORY if: contradictions detected OR acceptance criteria failed.
    // SUPERVISOR_REVIEW != RELEASE_AUTHORIZATION.
    // Leo thang là BẮT BUỘC nếu: phát hiện mâu thuẫn HOẶC tiêu chí chấp nhận thất bại.
    // SUPERVISOR_REVIEW != RELEASE_AUTHORIZATION.
    let supervisorGateRecord: ReleaseSupervisorGateRecord | undefined;
    const needsEscalation = contradictions.length > 0 || !criteriaOutput.overallPass;
    if (needsEscalation) {
      const escalationReason = contradictions.length > 0 ? 'CONTRADICTION_DETECTED' : 'QUALITY_FAIL';
      supervisorGateRecord = Object.freeze({
        gateId: `sg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        candidateId: candidate.candidateId,
        requestedAt: Date.now(),
        reason: escalationReason,
        status: 'ESCALATED' as const,
      });
      this.logAudit(
        context.agentId,
        'release_supervisor_gate_escalated',
        context.projectRoot,
        'DENY',
        'BLOCKED',
        {
          stage: 9,
          candidateId: candidate.candidateId,
          escalationReason,
          gateId: supervisorGateRecord.gateId,
          contradictionCount: contradictions.length,
        }
      );
    }

    // ── Stage 10: Release Verification Record Assembly ────────────────────
    // Packages all evidence, criteria, hashes, and gate outcome.
    // TECHNICAL_VERIFICATION != OWNER_APPROVAL — this record carries technical state only.
    //
    // Đóng gói tất cả bằng chứng, tiêu chí, mã băm và kết quả cổng.
    // TECHNICAL_VERIFICATION != OWNER_APPROVAL — bản ghi này chỉ mang trạng thái kỹ thuật.
    const verificationState: ReleaseVerificationState =
      contradictions.length > 0
        ? 'CONTRADICTED'
        : criteriaOutput.overallPass
        ? 'PASS'
        : 'FAIL';

    const verificationId = createReleaseVerificationId(
      `rv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );

    const verificationHash = ReleaseVerificationPipeline.hashVerificationRecord(
      verificationId,
      candidate.candidateId,
      candidate.provenanceHash,
      criteriaOutput.evaluationHash,
      verificationState
    );

    const record: ReleaseVerificationRecord = Object.freeze({
      verificationId,
      schemaVersion: RELEASE_SCHEMA_VERSION,
      candidateId: candidate.candidateId,
      milestoneTag: candidate.milestoneTag,
      qualityReportId: candidate.qualityReportId,
      evidenceId: candidate.evidenceId,
      acceptanceCriteriaResults: criteriaOutput.results,
      acceptanceCriteriaId: criteriaOutput.acceptanceCriteriaId,
      verificationState,
      contradictions: Object.freeze(contradictions),
      supervisorGateRecord,
      failureReasons: criteriaOutput.failureReasons,
      verificationHash,
      issuedAt: Date.now(),
    });

    this.logAudit(
      context.agentId,
      'release_verification_record_issued',
      context.projectRoot,
      verificationState === 'PASS' ? 'PERMIT' : 'DENY',
      verificationState === 'PASS' ? 'SUCCESS' : 'FAILURE',
      {
        stage: 10,
        verificationId,
        candidateId: candidate.candidateId,
        milestoneTag: candidate.milestoneTag,
        verificationState,
        verificationHash,
        // EXPLICIT REMINDER IN AUDIT LOG:
        // TECHNICAL_VERIFICATION != OWNER_APPROVAL
        // Xác minh kỹ thuật != Phê duyệt của Owner
        technicalVerificationNote:
          'TECHNICAL_VERIFICATION_ONLY: This is not a release authorization. Master Owner approval required separately.',
      }
    );

    return record;
  }
}
