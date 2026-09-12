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
import { PromotionError, } from './promotionTypes.js';
import { PromotionProposalEngine } from './promotionProposalEngine.js';
import { PromotionValidationEngine } from './promotionValidationEngine.js';
import { PromotionConflictEngine } from './promotionConflictEngine.js';
import { PromotionReviewEngine } from './promotionReviewEngine.js';
import { PromotionAuthorizationEngine } from './promotionAuthorizationEngine.js';
import { ControlledPromotionEngine } from './controlledPromotionEngine.js';
import { PromotionRollbackEngine } from './promotionRollbackEngine.js';
import { PromotionProvenanceEngine } from './promotionProvenanceEngine.js';
import { globalAuditLedger } from '../auditLedger.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class PromotionRuntime {
    auditLedger;
    proposalEngine;
    validationEngine;
    conflictEngine;
    reviewEngine;
    authEngine;
    promotionEngine;
    rollbackEngine;
    provenanceEngine;
    proposals = new Map();
    evidenceBundles = new Map();
    _isStopped = false;
    _stopReason = '';
    constructor(auditLedger = globalAuditLedger) {
        this.auditLedger = auditLedger;
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
    assertNotStopped(opName) {
        if (this._isStopped || globalMasterHumanAuthority.isUserStopActive) {
            throw new PromotionError('USER_STOP_ACTIVE', `Operation "${opName}" rejected: USER_STOP is active (${this._stopReason || 'Emergency Stop'}).`);
        }
    }
    /**
     * Universal USER_STOP request for the promotion subsystem.
     * Yêu cầu dừng khẩn cấp USER_STOP toàn cục cho phân hệ xúc tiến.
     */
    requestUserStop(reason) {
        this._isStopped = true;
        this._stopReason = reason;
        this.logAudit('USER_OPERATOR', 'USER_STOP_REQUESTED', 'all_promotions', 'DENY', 'BLOCKED', { reason });
    }
    /**
     * Resets USER_STOP under Master Owner authority.
     * Thiết lập lại USER_STOP dưới thẩm quyền của Master Owner.
     */
    resetUserStop() {
        this._isStopped = false;
        this._stopReason = '';
    }
    /**
     * Checks whether USER_STOP is currently active.
     * Kiểm tra xem USER_STOP có đang kích hoạt hay không.
     */
    isUserStopped() {
        return this._isStopped || globalMasterHumanAuthority.isUserStopActive;
    }
    /**
     * Creates and stores a new promotion proposal.
     * Tạo và lưu trữ một đề xuất xúc tiến mới.
     */
    createProposal(input) {
        this.assertNotStopped('createProposal');
        const proposal = this.proposalEngine.createProposal(input);
        this.proposals.set(proposal.promotionId, proposal);
        this.logAudit(proposal.agentId, 'PROMOTION_PROPOSAL_CREATED', proposal.targetProjectRoot, 'PERMIT', 'SUCCESS', {
            promotionId: proposal.promotionId,
            diffHash: proposal.diffHash,
            changesCount: proposal.proposedChanges.length,
        });
        return proposal;
    }
    /**
     * Validates a promotion proposal against live context.
     * Xác thực đề xuất xúc tiến với ngữ cảnh trực tiếp.
     */
    validateProposal(input) {
        this.assertNotStopped('validateProposal');
        const result = this.validationEngine.validate({
            ...input,
            isUserStopActive: this.isUserStopped(),
        });
        this.logAudit('PROMOTION_VALIDATION_ENGINE', 'PROMOTION_PROPOSAL_VALIDATED', input.proposal.targetProjectRoot, result.valid ? 'PERMIT' : 'DENY', result.valid ? 'SUCCESS' : 'FAILURE', {
            promotionId: input.proposal.promotionId,
            state: result.state,
            isStale: result.isStale,
            conflictsCount: result.conflicts.length,
        });
        return result;
    }
    /**
     * Detects conflicts for a proposal.
     * Phát hiện các xung đột cho đề xuất.
     */
    detectConflicts(input) {
        this.assertNotStopped('detectConflicts');
        return this.conflictEngine.detectConflicts(input);
    }
    /**
     * Reviews and records supervisory or owner approval decision.
     * Đánh giá và ghi nhận quyết định phê duyệt của người giám sát hoặc Owner.
     */
    reviewProposal(input) {
        this.assertNotStopped('reviewProposal');
        const record = this.reviewEngine.reviewProposal(input);
        this.logAudit(input.reviewerId, 'PROMOTION_REVIEW_COMPLETED', input.proposal.targetProjectRoot, record.decision === 'APPROVED' ? 'PERMIT' : 'DENY', record.decision === 'APPROVED' ? 'SUCCESS' : 'FAILURE', {
            promotionId: input.proposal.promotionId,
            decision: record.decision,
            reviewerType: record.reviewerType,
            isOwnerApproval: record.isOwnerApproval,
        });
        return record;
    }
    /**
     * Issues a canonical authorization token for promotion execution.
     * Cấp mã ủy quyền chuẩn tắc để thực thi đợt xúc tiến.
     */
    issuePromotionToken(input) {
        this.assertNotStopped('issuePromotionToken');
        return this.authEngine.issuePromotionToken(input);
    }
    /**
     * Executes a controlled change promotion and creates the evidence bundle.
     * Thực thi đợt xúc tiến thay đổi có kiểm soát và tạo gói bằng chứng.
     */
    executePromotion(input) {
        this.assertNotStopped('executePromotion');
        const result = this.promotionEngine.executePromotion({
            ...input,
            isUserStopActive: this.isUserStopped(),
        });
        const evidence = this.provenanceEngine.createEvidenceBundle(input.proposal, input.approval, result, input.authorizationToken.tokenId);
        this.evidenceBundles.set(input.proposal.promotionId, evidence);
        return { result, evidence };
    }
    /**
     * Rolls back a previously executed promotion.
     * Hoàn tác đợt xúc tiến đã thực thi trước đó.
     */
    executeRollback(input) {
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
    getProposal(promotionId) {
        return this.proposals.get(promotionId);
    }
    /**
     * Retrieves an evidence bundle by promotionId.
     * Lấy gói bằng chứng theo promotionId.
     */
    getEvidenceBundle(promotionId) {
        return this.evidenceBundles.get(promotionId);
    }
    /**
     * Records a canonical audit ledger event.
     * Ghi lại một sự kiện nhật ký kiểm toán chuẩn tắc.
     */
    logAudit(actorId, action, target, decision, status, metadata) {
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
    clear() {
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
