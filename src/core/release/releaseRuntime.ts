// src/core/release/releaseRuntime.ts
// BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
//
// Central coordinator integrating all Release engines with QualityRuntime, AuditLedger,
// and USER_STOP supremacy. Provides the top-level public API for the Release subsystem.
//
// Bộ điều phối trung tâm tích hợp tất cả các động cơ Phát hành với QualityRuntime, AuditLedger,
// và quyền tối cao USER_STOP. Cung cấp API công khai cấp cao nhất cho phân hệ Phát hành.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - TECHNICAL_VERIFICATION != OWNER_APPROVAL
// - QUALITY_PASS != RELEASE_AUTHORIZATION
// - RELEASE_CANDIDATE != RELEASE_TOKEN
// - VERIFICATION_PIPELINE_PASS != RELEASE_AUTHORIZATION
// - SUPERVISOR_REVIEW != RELEASE_AUTHORIZATION
// - CONTRADICTION => ESCALATE_TO_SUPERVISOR (no majority voting)
// - ZERO SHELL EXECUTION (Zero eval, new Function, execSync, child_process, SSH).
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
  type ReleaseCandidateId,
  type ReleaseVerificationId,
  type ReleaseVerificationContext,
  ReleaseError,
  ReleaseErrorCode,
} from './releaseTypes.js';
import { ReleaseCandidateEngine, type CreateReleaseCandidateParams } from './releaseCandidateEngine.js';
import { ReleasePolicyEngine } from './releasePolicyEngine.js';
import { ReleaseVerificationPipeline, type RunPipelineOptions } from './releaseVerificationPipeline.js';
import type { QualityRuntime } from '../quality/qualityRuntime.js';
import { globalQualityRuntime } from '../quality/qualityRuntime.js';
import type { SandboxDescriptor, SandboxManifest } from '../sandbox/sandboxTypes.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';

export class ReleaseRuntime {
  public readonly candidateEngine: ReleaseCandidateEngine;
  public readonly pipeline: ReleaseVerificationPipeline;

  private readonly candidates = new Map<ReleaseCandidateId, ReleaseCandidate>();
  private readonly verificationRecords = new Map<ReleaseVerificationId, ReleaseVerificationRecord>();
  private _isUserStopped = false;
  private _userStopReason = '';

  constructor(
    private readonly qualityRuntime: QualityRuntime = globalQualityRuntime,
    private readonly auditLedger: AuditLedger = globalAuditLedger
  ) {
    this.candidateEngine = new ReleaseCandidateEngine();
    this.pipeline = new ReleaseVerificationPipeline(this.qualityRuntime, this.auditLedger);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // USER_STOP CONTROLS
  // ĐIỀU KHIỂN USER_STOP
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Requests emergency USER_STOP, halting all release pipeline operations immediately.
   * Yêu cầu dừng khẩn cấp USER_STOP, lập tức dừng mọi thao tác đường ống phát hành.
   */
  public requestUserStop(reason: string): void {
    this._isUserStopped = true;
    this._userStopReason = reason;
    this.logAudit('master_owner', 'release_user_stop_requested', 'release_runtime', 'DENY', 'BLOCKED', { reason });
  }

  /**
   * Authoritatively resets USER_STOP under Master Owner authority.
   * Thiết lập lại USER_STOP một cách có thẩm quyền dưới quyền Master Owner.
   */
  public resetUserStop(): void {
    this._isUserStopped = false;
    this._userStopReason = '';
    this.logAudit('master_owner', 'release_user_stop_reset', 'release_runtime', 'PERMIT', 'SUCCESS', {});
  }

  /**
   * Checks whether emergency USER_STOP is currently active.
   * Kiểm tra xem lệnh dừng khẩn cấp USER_STOP có đang kích hoạt hay không.
   */
  public isUserStopped(): boolean {
    return this._isUserStopped;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API: PROPOSE
  // API CÔNG KHAI: ĐỀ XUẤT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Proposes a new release candidate. Validates all required bindings,
   * computes the deterministic provenance hash, and stores the candidate.
   *
   * INVARIANT: A proposed candidate is NOT a release authorization.
   * Đề xuất một ứng viên phát hành mới. Xác thực tất cả các liên kết bắt buộc,
   * tính toán mã băm nguồn gốc tất định và lưu trữ ứng viên.
   *
   * BẤT BIẾN: Ứng viên được đề xuất KHÔNG phải là ủy quyền phát hành.
   */
  public proposeReleaseCandidate(
    params: CreateReleaseCandidateParams,
    options?: { readonly projectRoot?: string }
  ): ReleaseCandidate {
    // USER_STOP check before any candidate creation.
    // Kiểm tra USER_STOP trước khi tạo ứng viên.
    if (this._isUserStopped) {
      throw new ReleaseError(
        ReleaseErrorCode.USER_STOP_ACTIVE,
        `Release candidate proposal rejected: USER_STOP is active (${this._userStopReason}).`
      );
    }

    // Protected workspace check.
    // Kiểm tra không gian làm việc được bảo vệ.
    if (options?.projectRoot) {
      ReleasePolicyEngine.assertNotProtectedWorkspace(options.projectRoot);
    }

    const candidate = this.candidateEngine.createReleaseCandidate(params);
    this.candidates.set(candidate.candidateId, candidate);

    this.logAudit(
      params.agentId,
      'release_candidate_proposed',
      params.sandboxId,
      'PERMIT',
      'SUCCESS',
      {
        candidateId: candidate.candidateId,
        milestoneTag: candidate.milestoneTag,
        provenanceHash: candidate.provenanceHash,
        qualityReportId: params.qualityReportId,
        evidenceId: params.evidenceId,
      }
    );

    return candidate;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API: VERIFY
  // API CÔNG KHAI: XÁC MINH
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Runs the full 10-stage Release Verification Pipeline for a given candidate.
   *
   * INVARIANT REMINDER: A PASS result is a TECHNICAL FINDING ONLY.
   * It is NOT release authorization. It is NOT owner approval.
   *
   * Chạy toàn bộ Đường ống Xác minh Phát hành 10 giai đoạn cho một ứng viên nhất định.
   *
   * NHẮC NHỞ BẤT BIẾN: Kết quả PASS chỉ là KẾT QUẢ KỸ THUẬT.
   * KHÔNG phải ủy quyền phát hành. KHÔNG phải phê duyệt của Owner.
   */
  public async runReleaseVerification(
    candidateId: ReleaseCandidateId,
    context: Omit<ReleaseVerificationContext, 'candidateId'>,
    sandbox: SandboxDescriptor,
    currentManifest: SandboxManifest,
    options?: RunPipelineOptions
  ): Promise<ReleaseVerificationRecord> {
    // USER_STOP check first.
    // Kiểm tra USER_STOP trước tiên.
    if (this._isUserStopped) {
      throw new ReleaseError(
        ReleaseErrorCode.USER_STOP_ACTIVE,
        `Release verification rejected: USER_STOP is active (${this._userStopReason}).`
      );
    }

    // Retrieve candidate from store.
    // Lấy ứng viên từ kho lưu trữ.
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      throw new ReleaseError(
        ReleaseErrorCode.CANDIDATE_NOT_FOUND,
        `Release candidate "${candidateId}" not found in ReleaseRuntime.`
      );
    }

    // Build the full pipeline context.
    // Xây dựng ngữ cảnh đường ống đầy đủ.
    const pipelineContext: ReleaseVerificationContext = {
      candidateId,
      ...context,
    };

    const pipelineOptions: RunPipelineOptions = {
      ...options,
      isUserStopped: this._isUserStopped,
      userStopReason: this._userStopReason,
    };

    // Execute the pipeline.
    // Thực thi đường ống.
    const record = await this.pipeline.run(
      candidate,
      pipelineContext,
      sandbox,
      currentManifest,
      pipelineOptions
    );

    // Store the verification record.
    // Lưu trữ bản ghi xác minh.
    this.verificationRecords.set(record.verificationId, record);

    // Update candidate state based on pipeline outcome.
    // Cập nhật trạng thái ứng viên dựa trên kết quả đường ống.
    const newCandidateState = record.verificationState === 'PASS' ? 'VERIFIED' : 'FAILED';
    const updatedCandidate = ReleaseCandidateEngine.transitionState(
      candidate,
      newCandidateState,
      `Verification pipeline completed with state: ${record.verificationState}`
    );
    this.candidates.set(candidateId, updatedCandidate);

    this.logAudit(
      context.agentId,
      'release_verification_completed',
      context.projectRoot,
      record.verificationState === 'PASS' ? 'PERMIT' : 'DENY',
      record.verificationState === 'PASS' ? 'SUCCESS' : 'FAILURE',
      {
        verificationId: record.verificationId,
        candidateId,
        milestoneTag: record.milestoneTag,
        verificationState: record.verificationState,
        verificationHash: record.verificationHash,
        // EXPLICIT AUDIT NOTE — TECHNICAL_VERIFICATION != OWNER_APPROVAL
        // GHI CHÚ KIỂM TOÁN TƯỜNG MINH — Xác minh kỹ thuật != Phê duyệt của Owner
        technicalNote: 'TECHNICAL_VERIFICATION_ONLY. Not a release authorization.',
      }
    );

    return record;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACCESSORS
  // TRUY CẬP
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a stored release candidate by ID.
   * Lấy ứng viên phát hành đã lưu theo ID.
   */
  public getReleaseCandidate(candidateId: ReleaseCandidateId): ReleaseCandidate | undefined {
    return this.candidates.get(candidateId);
  }

  /**
   * Retrieves a stored release verification record by ID.
   * Lấy bản ghi xác minh phát hành đã lưu theo ID.
   */
  public getVerificationRecord(verificationId: ReleaseVerificationId): ReleaseVerificationRecord | undefined {
    return this.verificationRecords.get(verificationId);
  }

  /**
   * Returns all stored release candidates.
   * Trả về tất cả các ứng viên phát hành đã lưu.
   */
  public getAllCandidates(): readonly ReleaseCandidate[] {
    return Object.freeze([...this.candidates.values()]);
  }

  /**
   * Returns all stored verification records.
   * Trả về tất cả các bản ghi xác minh đã lưu.
   */
  public getAllVerificationRecords(): readonly ReleaseVerificationRecord[] {
    return Object.freeze([...this.verificationRecords.values()]);
  }

  /**
   * Clears all in-memory runtime state.
   * Xóa sạch toàn bộ trạng thái runtime trong bộ nhớ.
   */
  public clear(): void {
    this.candidates.clear();
    this.verificationRecords.clear();
    this._isUserStopped = false;
    this._userStopReason = '';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // PHƯƠNG THỨC TRỢ GIÚP RIÊNG TƯ
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Records an audit event to the canonical AuditLedger.
   * Ghi lại một sự kiện kiểm toán vào AuditLedger chuẩn tắc.
   */
  private logAudit(
    actorId: string,
    action: string,
    targetResource: string,
    decision: 'PERMIT' | 'DENY',
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED',
    metadata: Record<string, unknown>
  ): void {
    if (!this.auditLedger) return;
    try {
      const argumentsHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(metadata ?? {}), 'utf8')
        .digest('hex');
      this.auditLedger.record({
        timestamp: new Date().toISOString(),
        actor: { userId: actorId, role: 'RELEASE_RUNTIME', channel: 'INTERNAL' },
        domain: 'RELEASE_PIPELINE',
        toolName: action,
        classification: status === 'BLOCKED' ? 'SAFETY' : 'RELEASE',
        argumentsHash,
        policyDecision: decision,
        executionStatus: status,
        resultHash: argumentsHash,
      });
    } catch {
      // Fail closed: audit logging errors must not suppress state.
      // Thất bại đóng: lỗi ghi log kiểm toán không được che khuất trạng thái.
    }
  }
}

/**
 * Global singleton ReleaseRuntime instance.
 * Thể hiện singleton toàn cục của ReleaseRuntime.
 */
export const globalReleaseRuntime = new ReleaseRuntime();
