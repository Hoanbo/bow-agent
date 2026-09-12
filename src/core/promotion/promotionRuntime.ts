// src/core/promotion/promotionRuntime.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Canonical coordinator for the governed change promotion and project integration subsystem.
// Điều phối viên chuẩn tắc cho phân hệ xúc tiến thay đổi có quản trị và tích hợp dự án.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - PROMOTION_PROPOSAL != AUTHORIZATION
// - PROMOTION != OWNER_APPROVAL
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - ZERO SHELL EXECUTION (Zero eval, new Function, execSync, child_process, SSH).
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type PromotionId,
  type PromotionProposal,
  type PromotionScope,
  type PromotionApprovalRecord,
  type PromotionExecutionResult,
  type PromotionRollbackResult,
  type PromotionValidationResult,
  type PromotionConflict,
  type PromotionEvidenceBundle,
  PromotionError,
} from './promotionTypes.js';
import { PromotionScopeValidator } from './promotionScopeValidator.js';
import { PromotionProposalEngine, type CreateProposalInput } from './promotionProposalEngine.js';
import { PromotionValidationEngine, type ValidateProposalInput } from './promotionValidationEngine.js';
import { PromotionConflictEngine, type ConflictCheckInput } from './promotionConflictEngine.js';
import { PromotionReviewEngine, type PromotionReviewInput } from './promotionReviewEngine.js';
import { PromotionAuthorizationEngine, type IssuePromotionTokenInput } from './promotionAuthorizationEngine.js';
import { ControlledPromotionEngine, type ExecutePromotionInput } from './controlledPromotionEngine.js';
import { PromotionRollbackEngine, type ExecuteRollbackInput } from './promotionRollbackEngine.js';
import { PromotionProvenanceEngine } from './promotionProvenanceEngine.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';

export class PromotionRuntime {
  public readonly proposalEngine: PromotionProposalEngine;
  public readonly validationEngine: PromotionValidationEngine;
  public readonly conflictEngine: PromotionConflictEngine;
  public readonly reviewEngine: PromotionReviewEngine;
  public readonly authEngine: PromotionAuthorizationEngine;
  public readonly promotionEngine: ControlledPromotionEngine;
  public readonly rollbackEngine: PromotionRollbackEngine;
  public readonly provenanceEngine: PromotionProvenanceEngine;

  private proposals = new Map<string, PromotionProposal>();
  private evidenceBundles = new Map<string, PromotionEvidenceBundle>();
  private _isStopped = false;
  private _stopReason = '';

  constructor(private readonly auditLedger: AuditLedger = globalAuditLedger) {
    this.proposalEngine = new PromotionProposalEngine();
    this.validationEngine = new PromotionValidationEngine();
    this.conflictEngine = new PromotionConflictEngine();
    this.reviewEngine = new PromotionReviewEngine();
    this.authEngine = new PromotionAuthorizationEngine();
    this.promotionEngine = new ControlledPromotionEngine(this.authEngine, this.auditLedger);
    this.rollbackEngine = new PromotionRollbackEngine(this.promotionEngine, this.auditLedger);
    this.provenanceEngine = new PromotionProvenanceEngine();
  }

  /**
   * Asserts that emergency USER_STOP is not active.
   * Khẳng định rằng lệnh dừng khẩn cấp USER_STOP không đang kích hoạt.
   */
  private assertNotStopped(opName: string): void {
    if (this._isStopped || globalMasterHumanAuthority.isUserStopActive) {
      throw new PromotionError(
        'USER_STOP_ACTIVE',
        `Operation "${opName}" rejected: USER_STOP is active (${this._stopReason || 'Emergency Stop'}).`
      );
    }
  }

  /**
   * Universal USER_STOP request for the promotion subsystem.
   * Yêu cầu dừng khẩn cấp USER_STOP toàn cục cho phân hệ xúc tiến.
   */
  public requestUserStop(reason: string): void {
    this._isStopped = true;
    this._stopReason = reason;
    this.logAudit(
      'USER_OPERATOR',
      'USER_STOP_REQUESTED',
      'all_promotions',
      'DENY',
      'BLOCKED',
      { reason }
    );
  }

  /**
   * Resets USER_STOP under Master Owner authority.
   * Thiết lập lại USER_STOP dưới thẩm quyền của Master Owner.
   */
  public resetUserStop(): void {
    this._isStopped = false;
    this._stopReason = '';
  }

  /**
   * Checks whether USER_STOP is currently active.
   * Kiểm tra xem USER_STOP có đang kích hoạt hay không.
   */
  public isUserStopped(): boolean {
    return this._isStopped || globalMasterHumanAuthority.isUserStopActive;
  }

  /**
   * Creates and stores a new promotion proposal.
   * Tạo và lưu trữ một đề xuất xúc tiến mới.
   */
  public createProposal(input: CreateProposalInput): PromotionProposal {
    this.assertNotStopped('createProposal');
    const proposal = this.proposalEngine.createProposal(input);
    this.proposals.set(proposal.promotionId, proposal);

    this.logAudit(
      proposal.agentId,
      'PROMOTION_PROPOSAL_CREATED',
      proposal.targetProjectRoot,
      'PERMIT',
      'SUCCESS',
      {
        promotionId: proposal.promotionId,
        diffHash: proposal.diffHash,
        changesCount: proposal.proposedChanges.length,
      }
    );

    return proposal;
  }

  /**
   * Validates a promotion proposal against live context.
   * Xác thực đề xuất xúc tiến với ngữ cảnh trực tiếp.
   */
  public validateProposal(input: ValidateProposalInput): PromotionValidationResult {
    this.assertNotStopped('validateProposal');
    const result = this.validationEngine.validate({
      ...input,
      isUserStopActive: this.isUserStopped(),
    });

    this.logAudit(
      'PROMOTION_VALIDATION_ENGINE',
      'PROMOTION_PROPOSAL_VALIDATED',
      input.proposal.targetProjectRoot,
      result.valid ? 'PERMIT' : 'DENY',
      result.valid ? 'SUCCESS' : 'FAILURE',
      {
        promotionId: input.proposal.promotionId,
        state: result.state,
        isStale: result.isStale,
        conflictsCount: result.conflicts.length,
      }
    );

    return result;
  }

  /**
   * Detects conflicts for a proposal.
   * Phát hiện các xung đột cho đề xuất.
   */
  public detectConflicts(input: ConflictCheckInput): PromotionConflict[] {
    this.assertNotStopped('detectConflicts');
    return this.conflictEngine.detectConflicts(input);
  }

  /**
   * Reviews and records supervisory or owner approval decision.
   * Đánh giá và ghi nhận quyết định phê duyệt của người giám sát hoặc Owner.
   */
  public reviewProposal(input: PromotionReviewInput): PromotionApprovalRecord {
    this.assertNotStopped('reviewProposal');
    const record = this.reviewEngine.reviewProposal(input);

    this.logAudit(
      input.reviewerId,
      'PROMOTION_REVIEW_COMPLETED',
      input.proposal.targetProjectRoot,
      record.decision === 'APPROVED' ? 'PERMIT' : 'DENY',
      record.decision === 'APPROVED' ? 'SUCCESS' : 'FAILURE',
      {
        promotionId: input.proposal.promotionId,
        decision: record.decision,
        reviewerType: record.reviewerType,
        isOwnerApproval: record.isOwnerApproval,
      }
    );

    return record;
  }

  /**
   * Issues a canonical authorization token for promotion execution.
   * Cấp mã ủy quyền chuẩn tắc để thực thi đợt xúc tiến.
   */
  public issuePromotionToken(input: IssuePromotionTokenInput): AuthorizationToken {
    this.assertNotStopped('issuePromotionToken');
    return this.authEngine.issuePromotionToken(input);
  }

  /**
   * Executes a controlled change promotion and creates the evidence bundle.
   * Thực thi đợt xúc tiến thay đổi có kiểm soát và tạo gói bằng chứng.
   */
  public executePromotion(input: ExecutePromotionInput): {
    result: PromotionExecutionResult;
    evidence: PromotionEvidenceBundle;
  } {
    this.assertNotStopped('executePromotion');
    const result = this.promotionEngine.executePromotion({
      ...input,
      isUserStopActive: this.isUserStopped(),
    });

    const evidence = this.provenanceEngine.createEvidenceBundle(
      input.proposal,
      input.approval,
      result,
      input.authorizationToken.tokenId
    );

    this.evidenceBundles.set(input.proposal.promotionId, evidence);

    return { result, evidence };
  }

  /**
   * Rolls back a previously executed promotion.
   * Hoàn tác đợt xúc tiến đã thực thi trước đó.
   */
  public executeRollback(input: ExecuteRollbackInput): PromotionRollbackResult {
    this.assertNotStopped('executeRollback');
    return this.rollbackEngine.executeRollback({
      ...input,
      isUserStopActive: this.isUserStopped(),
    });
  }

  /**
   * Retrieves a stored proposal by promotionId.
   * Lấy đề xuất được lưu trữ theo promotionId.
   */
  public getProposal(promotionId: PromotionId): PromotionProposal | undefined {
    return this.proposals.get(promotionId);
  }

  /**
   * Retrieves an evidence bundle by promotionId.
   * Lấy gói bằng chứng theo promotionId.
   */
  public getEvidenceBundle(promotionId: PromotionId): PromotionEvidenceBundle | undefined {
    return this.evidenceBundles.get(promotionId);
  }

  /**
   * Records a canonical audit ledger event.
   * Ghi lại một sự kiện nhật ký kiểm toán chuẩn tắc.
   */
  private logAudit(
    actorId: string,
    action: string,
    target: string,
    decision: 'PERMIT' | 'DENY',
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED',
    metadata: Record<string, any>
  ): string {
    const rawPayload = JSON.stringify({ target, ...metadata });
    const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const event = this.auditLedger.record({
      timestamp: new Date().toISOString(),
      actor: {
        userId: actorId,
        role: 'PROMOTION_RUNTIME',
        channel: 'INTERNAL',
      },
      domain: 'PROMOTION_GOVERNANCE',
      toolName: action,
      classification: status === 'BLOCKED' ? 'SAFETY' : 'MUTATION',
      argumentsHash,
      policyDecision: decision,
      executionStatus: status,
      resultHash: argumentsHash,
    });
    return event.eventId;
  }

  /**
   * Clears in-memory runtime records.
   * Xóa sạch các bản ghi runtime trong bộ nhớ.
   */
  public clear(): void {
    this.proposals.clear();
    this.evidenceBundles.clear();
    this.reviewEngine.clear();
    this.promotionEngine.clear();
    this.rollbackEngine.clear();
    this._isStopped = false;
    this._stopReason = '';
  }
}

export const globalPromotionRuntime = new PromotionRuntime();
