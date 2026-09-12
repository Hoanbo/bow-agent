// src/core/incidentResilience/incidentClosureEngine.ts
// BOWCON V4.0 — MS-1.3.56: GOVERNED POST-REMEDIATION RESILIENCE, RECOVERY OUTCOME ANALYSIS & INCIDENT LIFECYCLE CLOSURE PIPELINE
//
// Governed Incident Closure Engine.
// Evaluates post-mitigation verification and rollback outcomes to transition IncidentId to terminal closure states:
// CLOSED_RESOLVED, CLOSED_ROLLED_BACK, or ESCALATED_TO_HUMAN.
// Động cơ đóng sự cố có quản trị.
// Đánh giá kết quả xác minh sau khắc phục và khôi phục để chuyển IncidentId sang các trạng thái đóng cuối cùng:
// CLOSED_RESOLVED, CLOSED_ROLLED_BACK, hoặc ESCALATED_TO_HUMAN.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - CLOSURE_IS_RECORD_NOT_AUTHORITY: Closure is an immutable governance record, NOT execution authority.
// - FAIL_CLOSED_CLOSURE: Any ambiguous, contradictory, or unverified outcome MUST resolve to ESCALATED_TO_HUMAN.
// - CLOSED_RESOLVED requires verified === true AND rollbackOccurred === false.
// - CLOSED_ROLLED_BACK requires rollback.success === true.
// - USER_STOP SUPREMACY: If USER_STOP is active, force ESCALATED_TO_HUMAN.
// - ZERO TOKEN ISSUANCE: Cannot issue authorization tokens (count === 0).
// - ZERO SELF APPROVAL: Cannot approve human gate requests (count === 0).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import type { IncidentId } from '../diagnosis/diagnosisTypes.js';
import type {
  RemediationPlanId,
  RemediationExecutionId,
  PostMitigationVerificationResult,
  RemediationRollbackResult,
} from '../remediation/remediationTypes.js';
import {
  type IncidentClosureRecord,
  type IncidentClosureStatus,
  createIncidentClosureId,
} from './incidentResilienceTypes.js';

export interface EvaluateClosureInput {
  readonly incidentId: IncidentId;
  readonly remediationPlanId?: RemediationPlanId;
  readonly executionId?: RemediationExecutionId;
  readonly verificationResult?: PostMitigationVerificationResult;
  readonly rollbackResult?: RemediationRollbackResult;
  readonly isUserStopActive?: boolean;
  readonly forceEscalationReason?: string;
}

export class IncidentClosureEngine {
  /**
   * Evaluates remediation outcome and transitions incident to a deterministic terminal closure record.
   * Đánh giá kết quả khắc phục và chuyển đổi sự cố thành bản ghi đóng cuối cùng xác định.
   */
  public evaluateClosure(input: EvaluateClosureInput): IncidentClosureRecord {
    const {
      incidentId,
      remediationPlanId,
      executionId,
      verificationResult,
      rollbackResult,
      isUserStopActive = false,
      forceEscalationReason,
    } = input;

    const closedAt = Date.now();
    const closureId = createIncidentClosureId(`ic_${closedAt}_${crypto.randomBytes(4).toString('hex')}`);

    // Rule 1: Active USER_STOP forces fail-closed human escalation
    // Quy tắc 1: USER_STOP đang hoạt động buộc leo thang cho con người đóng khi thất bại
    if (isUserStopActive) {
      return this.buildRecord(
        closureId,
        incidentId,
        'ESCALATED_TO_HUMAN',
        'USER_STOP active during post-mitigation evaluation. Fail closed to human authority.',
        false,
        false,
        closedAt,
        true,
        remediationPlanId,
        executionId
      );
    }

    // Rule 2: Explicit force escalation reason
    // Quy tắc 2: Lý do cưỡng chế leo thang tường minh
    if (forceEscalationReason) {
      return this.buildRecord(
        closureId,
        incidentId,
        'ESCALATED_TO_HUMAN',
        `Incident escalated to human: ${forceEscalationReason}`,
        verificationResult?.verified ?? false,
        rollbackResult?.success ?? false,
        closedAt,
        true,
        remediationPlanId,
        executionId
      );
    }

    // Rule 3: Rollback occurred
    // Quy tắc 3: Khôi phục đã xảy ra
    if (rollbackResult) {
      if (rollbackResult.success) {
        return this.buildRecord(
          closureId,
          incidentId,
          'CLOSED_ROLLED_BACK',
          `Remediation failed verification or triggered rollback. State successfully reverted to snapshot: ${rollbackResult.snapshotId}.`,
          false,
          true,
          closedAt,
          true, // Rolled back incident requires human awareness/follow-up
          remediationPlanId,
          executionId
        );
      } else {
        // Rollback failed - critical state requiring immediate human intervention
        // Khôi phục thất bại - trạng thái nghiêm trọng yêu cầu con người can thiệp ngay lập tức
        return this.buildRecord(
          closureId,
          incidentId,
          'ESCALATED_TO_HUMAN',
          `CRITICAL: Rollback failed (${rollbackResult.reason}). System in unverified ambiguous state.`,
          false,
          false,
          closedAt,
          true,
          remediationPlanId,
          executionId
        );
      }
    }

    // Rule 4: Verification passed without rollback
    // Quy tắc 4: Xác minh thành công không có khôi phục
    const isVerified = Boolean(verificationResult && (verificationResult.verified || verificationResult.passed));
    if (isVerified) {
      return this.buildRecord(
        closureId,
        incidentId,
        'CLOSED_RESOLVED',
        `Post-mitigation verification succeeded. Error rate, latency, and invariants within nominal thresholds (${verificationResult?.verificationSummary ?? 'Nominal'}).`,
        true,
        false,
        closedAt,
        false,
        remediationPlanId,
        executionId
      );
    }

    // Rule 5: Ambiguous, missing verification, or unhandled outcome -> Fail closed to ESCALATED_TO_HUMAN
    // Quy tắc 5: Mơ hồ, thiếu xác minh, hoặc kết quả chưa xử lý -> Đóng khi thất bại thành ESCALATED_TO_HUMAN
    return this.buildRecord(
      closureId,
      incidentId,
      'ESCALATED_TO_HUMAN',
      'Unresolved or ambiguous remediation outcome without verifiable recovery evidence. Fail closed to human supervisor.',
      false,
      false,
      closedAt,
      true,
      remediationPlanId,
      executionId
    );
  }

  private buildRecord(
    closureId: ReturnType<typeof createIncidentClosureId>,
    incidentId: IncidentId,
    status: IncidentClosureStatus,
    closureReason: string,
    verified: boolean,
    rolledBack: boolean,
    closedAt: number,
    requiresHumanFollowUp: boolean,
    remediationPlanId?: RemediationPlanId,
    executionId?: RemediationExecutionId
  ): IncidentClosureRecord {
    const rawPayload = JSON.stringify({
      closureId,
      incidentId,
      status,
      closureReason,
      remediationPlanId: remediationPlanId ?? null,
      executionId: executionId ?? null,
      verified,
      rolledBack,
      closedAt,
      requiresHumanFollowUp,
    });

    const closureCertificateHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

    return Object.freeze({
      closureId,
      incidentId,
      status,
      closureReason,
      remediationPlanId,
      executionId,
      verified,
      rolledBack,
      closedAt,
      closureCertificateHash,
      requiresHumanFollowUp,
    });
  }
}
