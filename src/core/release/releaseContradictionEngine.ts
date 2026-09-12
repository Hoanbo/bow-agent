// src/core/release/releaseContradictionEngine.ts
// BOWCON V4.0 — MS-1.3.50: GOVERNED CONTINUOUS INTEGRATION & MILESTONE RELEASE VERIFICATION PIPELINE
//
// Engine detecting contradictions between multiple agents' release verification findings.
// Never resolves contradictions autonomously — always escalates to SupervisorHumanGate.
// Động cơ phát hiện mâu thuẫn giữa kết quả xác minh phát hành của nhiều agent.
// Không bao giờ tự động giải quyết mâu thuẫn — luôn leo thang lên SupervisorHumanGate.
//
// STRICT INVARIANTS:
// - CONTRADICTION => ESCALATE_TO_SUPERVISOR (no majority voting, EVER)
// - Two differing verification states for the same candidate = CONTRADICTION
// - One failing, one passing verification for the same candidate = CONTRADICTION
// - Resolution is EXCLUSIVELY by SupervisorHumanGate decision (never auto-resolved)
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import type {
  ReleaseCandidate,
  ReleaseVerificationRecord,
  ReleaseContradiction,
  ReleaseCandidateId,
} from './releaseTypes.js';

export class ReleaseContradictionEngine {
  /**
   * Detects contradictions between multiple release candidate proposals for the same milestone.
   * If two candidates for the same milestoneTag have different sourceManifestHash values,
   * this is a contradiction that must be escalated.
   *
   * Phát hiện mâu thuẫn giữa nhiều đề xuất ứng viên phát hành cho cùng một mốc.
   * Nếu hai ứng viên cho cùng một milestoneTag có giá trị sourceManifestHash khác nhau,
   * đây là mâu thuẫn phải được leo thang.
   */
  public detectCandidateContradictions(
    candidates: readonly ReleaseCandidate[]
  ): readonly ReleaseContradiction[] {
    const contradictions: ReleaseContradiction[] = [];

    // Group candidates by milestoneTag.
    // Nhóm các ứng viên theo milestoneTag.
    const byMilestone = new Map<string, ReleaseCandidate[]>();
    for (const candidate of candidates) {
      const group = byMilestone.get(candidate.milestoneTag) ?? [];
      group.push(candidate);
      byMilestone.set(candidate.milestoneTag, group);
    }

    for (const [milestoneTag, group] of byMilestone) {
      if (group.length < 2) continue;

      // Check for differing sourceManifestHash within the same milestoneTag.
      // Kiểm tra sourceManifestHash khác nhau trong cùng một milestoneTag.
      const distinctHashes = new Set(group.map((c) => c.sourceManifestHash));
      if (distinctHashes.size > 1) {
        const contradictionId = `rc_contradiction_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        contradictions.push(
          Object.freeze({
            contradictionId,
            candidateId: group[0].candidateId,
            conflictingFindings: Object.freeze(
              group.map((c) => ({
                agentId: c.agentId,
                verificationId: c.candidateId,
                verificationState: c.state,
                verificationHash: c.provenanceHash,
                timestamp: c.proposedAt,
              }))
            ),
            detectedAt: Date.now(),
            details:
              `Contradiction detected for milestone "${milestoneTag}": ` +
              `${group.length} candidates have ${distinctHashes.size} distinct sourceManifestHash values. ` +
              `Phát hiện mâu thuẫn cho mốc "${milestoneTag}": ` +
              `${group.length} ứng viên có ${distinctHashes.size} giá trị sourceManifestHash khác nhau. ` +
              `Escalation to SupervisorHumanGate required. / Yêu cầu leo thang lên SupervisorHumanGate.`,
          })
        );
      }
    }

    return Object.freeze(contradictions);
  }

  /**
   * Detects contradictions between multiple verification records for the same release candidate.
   * If two verification records for the same candidateId produce different verificationStates,
   * this is a critical contradiction that must be escalated to SupervisorHumanGate.
   *
   * Phát hiện mâu thuẫn giữa nhiều bản ghi xác minh cho cùng một ứng viên phát hành.
   * Nếu hai bản ghi xác minh cho cùng candidateId tạo ra verificationState khác nhau,
   * đây là mâu thuẫn nghiêm trọng phải được leo thang lên SupervisorHumanGate.
   */
  public detectVerificationContradictions(
    records: readonly ReleaseVerificationRecord[]
  ): readonly ReleaseContradiction[] {
    const contradictions: ReleaseContradiction[] = [];

    // Group records by candidateId.
    // Nhóm các bản ghi theo candidateId.
    const byCandidate = new Map<ReleaseCandidateId, ReleaseVerificationRecord[]>();
    for (const record of records) {
      const group = byCandidate.get(record.candidateId) ?? [];
      group.push(record);
      byCandidate.set(record.candidateId, group);
    }

    for (const [candidateId, group] of byCandidate) {
      if (group.length < 2) continue;

      // Check for differing verificationState within the same candidateId.
      // Kiểm tra verificationState khác nhau trong cùng một candidateId.
      const distinctStates = new Set(group.map((r) => r.verificationState));
      if (distinctStates.size > 1) {
        const contradictionId = `rv_contradiction_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        contradictions.push(
          Object.freeze({
            contradictionId,
            candidateId,
            conflictingFindings: Object.freeze(
              group.map((r) => ({
                agentId: r.candidateId, // verification records don't directly carry agentId; use candidateId
                verificationId: r.verificationId,
                verificationState: r.verificationState,
                verificationHash: r.verificationHash,
                timestamp: r.issuedAt,
              }))
            ),
            detectedAt: Date.now(),
            details:
              `Contradiction detected across ${group.length} verification records for candidate "${candidateId}": ` +
              `states are [${[...distinctStates].join(', ')}]. ` +
              `Phát hiện mâu thuẫn trên ${group.length} bản ghi xác minh cho ứng viên "${candidateId}". ` +
              `MANDATORY SupervisorHumanGate escalation. / Bắt buộc leo thang lên SupervisorHumanGate.`,
          })
        );
      }
    }

    return Object.freeze(contradictions);
  }
}
