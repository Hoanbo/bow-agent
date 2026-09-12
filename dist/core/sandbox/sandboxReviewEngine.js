// src/core/sandbox/sandboxReviewEngine.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - VERIFIED != OWNER_APPROVED
// - DIFF_VALID != OWNER_APPROVED
// - SANDBOX_READY != AUTHORIZATION
// - SELF_APPROVAL_REJECTED: An agent cannot approve its own sandbox worktree.
// - Reuses canonical SupervisorHumanGate and MasterHumanAuthority.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { SandboxError, } from './sandboxTypes.js';
import { globalMasterHumanAuthority, } from '../authority/masterHumanAuthority.js';
import { isMasterOwner } from '../delegation/delegationTypes.js';
import { globalSupervisorHumanGate, } from '../supervisor/supervisorHumanGate.js';
export class SandboxReviewEngine {
    humanGate;
    reviews = new Map();
    constructor(humanGate = globalSupervisorHumanGate) {
        this.humanGate = humanGate;
    }
    /**
     * Reviews a prepared sandbox, manifest, and diff prior to potential commit or export.
     * Xem xét một sandbox, bản kê khai và bản diff đã chuẩn bị trước khi cho phép commit hoặc xuất.
     */
    reviewSandbox(input) {
        const { sandbox, manifest, diff, reviewerId, reviewerType, notes } = input;
        // 1. Enforce USER_STOP supremacy.
        // 1. Thực thi tính tối thượng của USER_STOP.
        if (globalMasterHumanAuthority.isUserStopActive || sandbox.isStopped) {
            throw new SandboxError('USER_STOP_ACTIVE', 'Cannot perform sandbox review while USER_STOP is active.');
        }
        // 2. Reject self-approval: Agent cannot approve its own sandbox.
        // 2. Từ chối tự phê duyệt: Tác nhân không thể tự phê duyệt sandbox của chính mình.
        if (sandbox.binding.agentId === reviewerId) {
            throw new SandboxError('SELF_APPROVAL_REJECTED', `Agent "${reviewerId}" cannot review or approve its own sandbox "${sandbox.id}".`);
        }
        // 3. Validate manifest and diff binding.
        // 3. Xác thực tính gắn kết giữa bản kê khai và bản diff.
        if (manifest.sandboxId !== sandbox.id || diff.sandboxId !== sandbox.id) {
            throw new SandboxError('POLICY_VIOLATION', 'Manifest or diff does not match the target sandbox identity.');
        }
        // 4. Determine supervisory decision.
        // 4. Xác định quyết định giám sát.
        let decision = input.decision ?? 'APPROVED';
        // 5. Invariant: Only authoritative Master Owner can issue OWNER_APPROVED.
        // 5. Bất biến: Chỉ có Master Owner có thẩm quyền mới có thể cấp OWNER_APPROVED.
        const ownerApproved = reviewerType === 'MASTER_OWNER' && isMasterOwner(reviewerId);
        const reviewId = `sbrev_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const record = {
            reviewId,
            sandboxId: sandbox.id,
            taskId: sandbox.binding.taskId,
            sessionId: sandbox.binding.sessionId,
            reviewedAt: Date.now(),
            reviewerType,
            reviewerId,
            decision,
            ownerApproved,
            manifestHash: manifest.manifestHash,
            diffHash: diff.diffHash,
            notes,
        };
        this.reviews.set(reviewId, record);
        return record;
    }
    /**
     * Requests canonical HumanGate approval for high-consequence sandbox modifications.
     * Yêu cầu phê duyệt qua HumanGate chuẩn tắc đối với các sửa đổi sandbox có hệ quả cao.
     */
    async requestHumanGateApproval(sandbox, diff, actionName = 'sandbox_worktree_export') {
        if (globalMasterHumanAuthority.isUserStopActive || sandbox.isStopped) {
            throw new SandboxError('USER_STOP_ACTIVE', 'Cannot request HumanGate approval while USER_STOP is active.');
        }
        const diagnosis = {
            anomalyId: `anomaly_sandbox_${sandbox.id}`,
            detectedAt: Date.now(),
            classification: 'GOVERNANCE_ESCALATION',
            severity: 'HIGH',
            rootCause: actionName,
            recommendedRecovery: `Supervisory review for sandbox ${sandbox.id}`,
            confidence: 1.0,
            evidence: [diff.diffHash],
            requiresHumanIntervention: true,
            suggestedTimeoutMs: 30000,
        };
        const plan = {
            planId: `plan_${sandbox.id}`,
            anomalyId: diagnosis.anomalyId,
            riskLevel: 'HIGH',
            steps: [
                {
                    stepId: 'step_export',
                    description: `Export sandbox ${sandbox.id}`,
                    isReversible: true,
                },
            ],
            timeoutMs: 30000,
        };
        const gateReq = this.humanGate.createRequest(diagnosis, plan, {
            target: sandbox.rootPath,
            authorizationContext: {
                actionId: `act_${Date.now()}`,
                sessionId: sandbox.binding.sessionId,
                taskId: sandbox.binding.taskId,
                deviceId: sandbox.binding.deviceId,
                capabilityId: sandbox.binding.capabilityLeaseId,
                parameters: {
                    sandboxId: sandbox.id,
                    diffHash: diff.diffHash,
                    changesCount: diff.changes.length,
                },
                target: sandbox.rootPath,
            },
        });
        return gateReq.status === 'APPROVED';
    }
    /**
     * Retrieves a recorded review record by reviewId.
     * Lấy bản ghi đánh giá đã lưu theo reviewId.
     */
    getReview(reviewId) {
        return this.reviews.get(reviewId);
    }
    /**
     * Clears in-memory reviews.
     * Xóa lịch sử đánh giá trong bộ nhớ.
     */
    clear() {
        this.reviews.clear();
    }
}
