// src/core/releaseExecution/releaseExecutionReviewBridge.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Supervisory review and approval bridge for governed release execution.
// Cầu nối xem xét và phê duyệt giám sát cho thực thi phát hành có quản trị.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - VERIFICATION != APPROVAL
// - APPROVAL != AUTHORIZATION
// - AGENT != APPROVER (Self-approval rejected: SELF_APPROVAL_REJECTED).
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import { ReleaseExecutionError, } from './releaseExecutionTypes.js';
import { globalSupervisorHumanGate, } from '../supervisor/supervisorHumanGate.js';
import { isMasterOwner } from '../delegation/delegationTypes.js';
export class ReleaseExecutionReviewBridge {
    humanGate;
    approvals = new Map();
    constructor(humanGate = globalSupervisorHumanGate) {
        this.humanGate = humanGate;
    }
    /**
     * Records a human supervisory or Master Owner review decision on a release execution request.
     * Ghi nhận quyết định xem xét của người giám sát hoặc Master Owner trên yêu cầu thực thi phát hành.
     */
    recordReview(input) {
        const now = Date.now();
        // 1. Prevent agent self-approval (AGENT != APPROVER).
        // 1. Ngăn chặn tác nhân tự phê duyệt (AGENT != APPROVER).
        if (input.reviewerId === input.candidate.agentId) {
            throw new ReleaseExecutionError('SELF_APPROVAL_REJECTED', `Agent "${input.reviewerId}" cannot review or approve its own release candidate "${input.candidate.candidateId}".`);
        }
        // 2. Prevent candidate expiration.
        // 2. Ngăn chặn ứng viên hết hạn.
        if (now > input.candidate.expiresAt) {
            throw new ReleaseExecutionError('INVALID_CANDIDATE', `Cannot approve expired candidate "${input.candidate.candidateId}".`);
        }
        // 3. Verify Master Owner role if designated.
        // 3. Xác minh vai trò Master Owner nếu được chỉ định.
        const isOwner = input.reviewerType === 'MASTER_OWNER' && isMasterOwner(input.reviewerId);
        const approval = {
            executionId: input.request.executionId,
            reviewerId: input.reviewerId,
            reviewerType: input.reviewerType,
            isOwnerApproval: isOwner,
            decision: input.decision,
            reviewedAt: now,
            rationale: input.rationale,
        };
        this.approvals.set(input.request.executionId, approval);
        return approval;
    }
    /**
     * Dispatches a formal gate request to the canonical SupervisorHumanGate.
     * Gửi yêu cầu cổng chính thức đến SupervisorHumanGate chuẩn tắc.
     */
    requestHumanGate(request, candidate) {
        const diagnosis = {
            anomalyId: `release_execution_gate_${request.executionId}`,
            detectedAt: Date.now(),
            description: `Release execution requested for milestone ${candidate.milestoneTag}`,
            recommendedRecovery: `Authorize release deployment to target ${request.target.targetId} (${request.target.projectRoot})`,
            category: 'SUPERVISORY',
        };
        const recoveryPlan = {
            planId: `plan_${request.executionId}`,
            riskLevel: 'CRITICAL',
            steps: [
                {
                    stepId: 'step_apply_release',
                    capabilityId: 'project_release_execution',
                    parameters: {
                        executionId: request.executionId,
                        candidateId: request.candidateId,
                    },
                    isReversible: true,
                },
            ],
        };
        return this.humanGate.createRequest(diagnosis, recoveryPlan, {
            target: request.target.projectRoot,
            affectedResources: [request.target.projectRoot],
            expectedEffects: [`Deploy release candidate ${candidate.candidateId} to ${request.target.projectRoot}`],
            ttlMs: 600_000, // 10 minutes
            authorizationContext: {
                actionId: `release_execution_${request.executionId}`,
                sessionId: request.sessionId,
                taskId: request.taskId,
                deviceId: 'dev_host_master',
                capabilityId: 'project_release_execution',
                target: request.target.projectRoot,
                parameters: {
                    executionId: request.executionId,
                    candidateId: request.candidateId,
                },
            },
        });
    }
    /**
     * Retrieves an existing approval record by executionId.
     * Lấy bản ghi phê duyệt hiện có theo executionId.
     */
    getApproval(executionId) {
        return this.approvals.get(executionId);
    }
}
