// src/core/promotion/promotionReviewEngine.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Supervisory review and approval verification engine for change promotions.
// Động cơ đánh giá giám sát và xác minh phê duyệt cho các đợt xúc tiến thay đổi.
//
// STRICT INVARIANTS:
// - VERIFIED != OWNER_APPROVED
// - VALIDATED != OWNER_APPROVED
// - PROPOSAL != APPROVAL
// - AGENT != APPROVER (No agent self-approval: SELF_APPROVAL_REJECTED).
// - SUB_AGENT != OWNER
// - SUPERVISOR != MASTER_OWNER
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import { PromotionError, } from './promotionTypes.js';
import { globalSupervisorHumanGate, } from '../supervisor/supervisorHumanGate.js';
import { isMasterOwner } from '../delegation/delegationTypes.js';
export class PromotionReviewEngine {
    humanGate;
    approvals = new Map();
    constructor(humanGate = globalSupervisorHumanGate) {
        this.humanGate = humanGate;
    }
    /**
     * Evaluates and records a supervisory or Master Owner review decision on a proposal.
     * Đánh giá và ghi nhận quyết định xem xét của người giám sát hoặc Master Owner trên đề xuất.
     */
    reviewProposal(input) {
        const now = Date.now();
        // 1. Prevent agent self-approval (AGENT != APPROVER).
        // 1. Ngăn chặn tác nhân tự phê duyệt (AGENT != APPROVER).
        if (input.reviewerId === input.proposal.agentId) {
            throw new PromotionError('SELF_APPROVAL_REJECTED', `Agent "${input.reviewerId}" cannot review or approve its own promotion proposal "${input.proposal.promotionId}".`);
        }
        // 2. Enforce Master Owner authority separation.
        // 2. Thực thi phân tách quyền hạn của Master Owner.
        const isOwner = input.reviewerType === 'MASTER_OWNER' && isMasterOwner(input.reviewerId);
        // 3. Ensure expired proposals cannot be approved.
        // 3. Đảm bảo các đề xuất đã hết hạn không thể được phê duyệt.
        if (now > input.proposal.expiresAt) {
            throw new PromotionError('EXPIRED_PROPOSAL', `Cannot review expired promotion proposal "${input.proposal.promotionId}".`);
        }
        const record = {
            promotionId: input.proposal.promotionId,
            reviewerId: input.reviewerId,
            reviewerType: input.reviewerType,
            isOwnerApproval: isOwner,
            decision: input.decision,
            reviewedAt: now,
            rationale: input.rationale,
        };
        this.approvals.set(input.proposal.promotionId, record);
        return record;
    }
    /**
     * Creates a formal HumanGate request through the canonical SupervisorHumanGate.
     * Tạo yêu cầu HumanGate chính thức thông qua SupervisorHumanGate chuẩn tắc.
     */
    async requestHumanGateApproval(proposal, gateId = 'promotion_gate') {
        const diagnosis = {
            anomalyId: `anomaly_promotion_${proposal.promotionId}`,
            detectedAt: Date.now(),
            classification: 'GOVERNANCE_ESCALATION',
            severity: 'HIGH',
            rootCause: gateId,
            recommendedRecovery: `Supervisory review for promotion ${proposal.promotionId}`,
            confidence: 1.0,
            evidence: [proposal.diffHash],
            requiresHumanIntervention: true,
            suggestedTimeoutMs: 30000,
        };
        const plan = {
            planId: `plan_${proposal.promotionId}`,
            anomalyId: diagnosis.anomalyId,
            riskLevel: 'HIGH',
            steps: [{ stepId: 'step_promote', description: `Promote changes for ${proposal.promotionId}`, isReversible: true }],
            timeoutMs: 30000,
        };
        const request = this.humanGate.createRequest(diagnosis, plan, {
            target: proposal.targetProjectRoot,
            affectedResources: proposal.proposedChanges.map(c => c.relativePath),
        });
        // Enforce that creation does not automatically imply approval.
        // Thực thi việc tạo yêu cầu không tự động đồng nghĩa với phê duyệt.
        return request.status === 'PENDING';
    }
    /**
     * Retrieves an existing approval record for a promotion.
     * Lấy bản ghi phê duyệt hiện có cho một đợt xúc tiến.
     */
    getApproval(promotionId) {
        return this.approvals.get(promotionId);
    }
    /**
     * Clears in-memory approval records.
     * Xóa sạch các bản ghi phê duyệt trong bộ nhớ.
     */
    clear() {
        this.approvals.clear();
    }
}
