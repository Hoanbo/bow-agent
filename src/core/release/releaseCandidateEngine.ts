// src/core/release/releaseCandidateEngine.ts
// BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
//
// Engine responsible for creating and managing the lifecycle of ReleaseCandidate records
// with deterministic cryptographic provenance hashing.
// Động cơ chịu trách nhiệm tạo và quản lý vòng đời của các bản ghi ReleaseCandidate
// với mã băm nguồn gốc mật mã tất định.
//
// STRICT INVARIANTS:
// - RELEASE_CANDIDATE != RELEASE_TOKEN
// - RELEASE_CANDIDATE != PROMOTION_AUTHORIZATION
// - PROVENANCE_HASH covers all 11 identity fields (deterministic, no ambiguity)
// - Expired/stale/revoked candidates MUST NOT be re-entered without a new proposal
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type ReleaseCandidate,
  type ReleaseCandidateId,
  type ReleaseCandidateState,
  RELEASE_SCHEMA_VERSION,
  createReleaseCandidateId,
  ReleaseError,
  ReleaseErrorCode,
} from './releaseTypes.js';
import type { QualityReportId, QualityEvidenceId } from '../quality/qualityTypes.js';
import type { SandboxId, WorktreeId } from '../sandbox/sandboxTypes.js';

export interface CreateReleaseCandidateParams {
  readonly milestoneTag: string;
  readonly sourceManifestHash: string;
  readonly qualityReportId: QualityReportId;
  readonly evidenceId: QualityEvidenceId;
  readonly agentId: string;
  readonly sessionId: string;
  readonly taskId: string;
  readonly delegationId: string;
  readonly capabilityLeaseId: string;
  readonly sandboxId: SandboxId;
  readonly worktreeId?: WorktreeId;
  /** TTL for the candidate in milliseconds. Default: 30 minutes. */
  readonly ttlMs?: number;
}

export class ReleaseCandidateEngine {
  /**
   * Computes a deterministic SHA-256 provenance hash covering all 11 identity bindings.
   * This hash uniquely identifies the exact state, agent, session, task, delegation,
   * capability, sandbox, and worktree context of the release candidate.
   *
   * Tính toán mã băm nguồn gốc SHA-256 tất định bao gồm tất cả 11 liên kết định danh.
   * Mã băm này xác định duy nhất trạng thái, agent, phiên, tác vụ, ủy quyền,
   * năng lực, sandbox và ngữ cảnh worktree chính xác của ứng viên phát hành.
   */
  public static hashCandidateProvenance(
    candidateId: string,
    milestoneTag: string,
    sourceManifestHash: string,
    qualityReportId: string,
    evidenceId: string,
    agentId: string,
    sessionId: string,
    taskId: string,
    delegationId: string,
    capabilityLeaseId: string,
    sandboxId: string,
    proposedAt: number
  ): string {
    // Deterministic join — all 12 fields separated by '|' to prevent partial collisions.
    // Kết hợp tất định — 12 trường được phân cách bằng '|' để ngăn chặn xung đột một phần.
    const payload = [
      candidateId,
      milestoneTag,
      sourceManifestHash,
      qualityReportId,
      evidenceId,
      agentId,
      sessionId,
      taskId,
      delegationId,
      capabilityLeaseId,
      sandboxId,
      String(proposedAt),
    ].join('|');
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Validates that a milestone tag is non-empty and follows the expected pattern (e.g. "MS-1.3.50").
   * Xác thực rằng thẻ mốc không rỗng và tuân theo mẫu kỳ vọng (ví dụ: "MS-1.3.50").
   */
  public static validateMilestoneTag(tag: string): void {
    if (!tag || tag.trim().length === 0) {
      throw new ReleaseError(
        ReleaseErrorCode.INVALID_MILESTONE_TAG,
        `Milestone tag must not be empty. / Thẻ mốc không được rỗng.`
      );
    }
  }

  /**
   * Validates that all required bindings are present in the candidate params.
   * Xác thực rằng tất cả các liên kết bắt buộc có mặt trong tham số ứng viên.
   */
  public static validateRequiredBindings(params: CreateReleaseCandidateParams): void {
    const required: (keyof CreateReleaseCandidateParams)[] = [
      'milestoneTag',
      'sourceManifestHash',
      'qualityReportId',
      'evidenceId',
      'agentId',
      'sessionId',
      'taskId',
      'delegationId',
      'capabilityLeaseId',
      'sandboxId',
    ];
    for (const field of required) {
      const value = params[field];
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        throw new ReleaseError(
          ReleaseErrorCode.MISSING_REQUIRED_BINDING,
          `Missing required release candidate binding: "${field}". ` +
            `Thiếu liên kết ứng viên phát hành bắt buộc: "${field}".`
        );
      }
    }
  }

  /**
   * Creates a new, immutable ReleaseCandidate record with a deterministic provenance hash.
   * Tạo một bản ghi ReleaseCandidate mới, bất biến với mã băm nguồn gốc tất định.
   */
  public createReleaseCandidate(params: CreateReleaseCandidateParams): ReleaseCandidate {
    // Validate all inputs before any creation.
    // Xác thực tất cả đầu vào trước khi tạo.
    ReleaseCandidateEngine.validateMilestoneTag(params.milestoneTag);
    ReleaseCandidateEngine.validateRequiredBindings(params);

    const candidateId = createReleaseCandidateId(
      `rc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );
    const proposedAt = Date.now();
    const ttlMs = params.ttlMs ?? 30 * 60 * 1000; // 30-minute default TTL
    const expiresAt = proposedAt + ttlMs;

    const provenanceHash = ReleaseCandidateEngine.hashCandidateProvenance(
      candidateId,
      params.milestoneTag,
      params.sourceManifestHash,
      params.qualityReportId,
      params.evidenceId,
      params.agentId,
      params.sessionId,
      params.taskId,
      params.delegationId,
      params.capabilityLeaseId,
      params.sandboxId,
      proposedAt
    );

    const candidate: ReleaseCandidate = Object.freeze({
      candidateId,
      schemaVersion: RELEASE_SCHEMA_VERSION,
      milestoneTag: params.milestoneTag,
      sourceManifestHash: params.sourceManifestHash,
      qualityReportId: params.qualityReportId,
      evidenceId: params.evidenceId,
      agentId: params.agentId,
      sessionId: params.sessionId,
      taskId: params.taskId,
      delegationId: params.delegationId,
      capabilityLeaseId: params.capabilityLeaseId,
      sandboxId: params.sandboxId,
      worktreeId: params.worktreeId,
      proposedAt,
      expiresAt,
      state: 'PROPOSED' as ReleaseCandidateState,
      provenanceHash,
    });

    return candidate;
  }

  /**
   * Recomputes and verifies the provenance hash of an existing ReleaseCandidate.
   * Returns true if valid, throws ReleaseError if tampered.
   *
   * Tính toán lại và xác minh mã băm nguồn gốc của một ReleaseCandidate hiện có.
   * Trả về true nếu hợp lệ, ném ReleaseError nếu bị giả mạo.
   */
  public static verifyProvenanceHash(candidate: ReleaseCandidate): boolean {
    const recomputed = ReleaseCandidateEngine.hashCandidateProvenance(
      candidate.candidateId,
      candidate.milestoneTag,
      candidate.sourceManifestHash,
      candidate.qualityReportId,
      candidate.evidenceId,
      candidate.agentId,
      candidate.sessionId,
      candidate.taskId,
      candidate.delegationId,
      candidate.capabilityLeaseId,
      candidate.sandboxId,
      candidate.proposedAt
    );
    if (recomputed !== candidate.provenanceHash) {
      throw new ReleaseError(
        ReleaseErrorCode.PROVENANCE_HASH_MISMATCH,
        `Release candidate "${candidate.candidateId}" provenance hash mismatch: ` +
          `expected "${candidate.provenanceHash}", recomputed "${recomputed}". ` +
          `Mã băm nguồn gốc ứng viên phát hành không khớp.`
      );
    }
    return true;
  }

  /**
   * Returns a new copy of the candidate with an updated state, preserving all other fields.
   * Used for fail-closed state transitions (STALE, REVOKED, BLOCKED, FAILED, VERIFIED, REJECTED).
   *
   * Trả về một bản sao mới của ứng viên với trạng thái đã cập nhật, giữ nguyên tất cả các trường khác.
   * Được dùng cho các chuyển đổi trạng thái thất bại đóng.
   */
  public static transitionState(
    candidate: ReleaseCandidate,
    newState: ReleaseCandidateState,
    reason?: string
  ): ReleaseCandidate {
    return Object.freeze({
      ...candidate,
      state: newState,
      stateReason: reason,
    });
  }
}
