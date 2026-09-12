// src/core/releaseExecution/releaseExecutionRuntime.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Central coordinator managing governed release execution lifecycle, bridges, and audit ledger.
// Điều phối viên trung tâm quản lý vòng đời thực thi phát hành có quản trị, các cầu nối và sổ cái kiểm toán.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - RELEASE_VERIFICATION != OWNER_APPROVAL
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - EXECUTION_TOKEN != RELEASE_RESULT
// - NO AUTO-RELEASE SHORTCUT (release() shortcut strictly prohibited).
// - ZERO SHELL EXECUTION.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { ReleaseExecutionError, } from './releaseExecutionTypes.js';
import { ReleaseExecutionPolicyEngine } from './releaseExecutionPolicyEngine.js';
import { ReleaseExecutionAuthorizationBridge } from './releaseExecutionAuthorizationBridge.js';
import { ReleaseExecutionReviewBridge } from './releaseExecutionReviewBridge.js';
import { GovernedReleaseExecutionEngine } from './governedReleaseExecutionEngine.js';
import { ReleaseExecutionVerificationEngine } from './releaseExecutionVerificationEngine.js';
import { ReleaseExecutionRollbackEngine } from './releaseExecutionRollbackEngine.js';
import { ReleaseExecutionProvenanceEngine } from './releaseExecutionProvenanceEngine.js';
import { globalAuditLedger } from '../auditLedger.js';
export class ReleaseExecutionRuntime {
    authBridge;
    reviewBridge;
    executionEngine;
    auditLedger;
    requests = new Map();
    candidates = new Map();
    verifications = new Map();
    approvals = new Map();
    authBindings = new Map();
    results = new Map();
    states = new Map();
    isUserStopActive = false;
    isRevoked = false;
    constructor(authBridge = new ReleaseExecutionAuthorizationBridge(), reviewBridge = new ReleaseExecutionReviewBridge(), executionEngine = new GovernedReleaseExecutionEngine(authBridge), auditLedger = globalAuditLedger) {
        this.authBridge = authBridge;
        this.reviewBridge = reviewBridge;
        this.executionEngine = executionEngine;
        this.auditLedger = auditLedger;
    }
    /**
     * Helper to log an immutable audit event to the canonical AuditLedger.
     * Hàm hỗ trợ ghi sự kiện kiểm toán bất biến vào AuditLedger chuẩn tắc.
     */
    logAudit(actorId, action, target, decision, status, metadata) {
        const rawPayload = JSON.stringify({ target, ...metadata });
        const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
        const event = this.auditLedger.record({
            timestamp: new Date().toISOString(),
            actor: {
                userId: actorId,
                role: 'RELEASE_EXECUTION_RUNTIME',
                channel: 'INTERNAL',
            },
            domain: 'RELEASE_GOVERNANCE',
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
     * Sets USER_STOP emergency state.
     * Thiết lập trạng thái khẩn cấp USER_STOP.
     */
    setUserStop(active) {
        this.isUserStopActive = active;
        if (active) {
            this.logAudit('USER', 'USER_STOP_INVOKED', 'release_execution_runtime', 'DENY', 'BLOCKED', {
                details: 'USER_STOP invoked in ReleaseExecutionRuntime.',
            });
        }
    }
    /**
     * Sets revocation state for authority leases or delegations.
     * Thiết lập trạng thái thu hồi cho các hợp đồng thuê quyền hạn hoặc ủy quyền.
     */
    setRevoked(revoked) {
        this.isRevoked = revoked;
        if (revoked) {
            this.logAudit('AUTHORITY', 'DELEGATION_REVOKED', 'release_execution_runtime', 'DENY', 'BLOCKED', {
                details: 'Authority lease or delegation revoked in ReleaseExecutionRuntime.',
            });
        }
    }
    /**
     * Submits and validates a new release execution request.
     * Gửi và xác thực yêu cầu thực thi phát hành mới.
     */
    requestExecution(request, candidate, verification) {
        ReleaseExecutionPolicyEngine.validateExecutionRequest(request, candidate, verification, {
            isUserStopActive: this.isUserStopActive,
            isRevoked: this.isRevoked,
        });
        this.requests.set(request.executionId, request);
        this.candidates.set(request.executionId, candidate);
        this.verifications.set(request.executionId, verification);
        this.states.set(request.executionId, 'REVIEW_PENDING');
        this.logAudit(request.operatorId, 'RELEASE_EXECUTION_REQUESTED', request.target.projectRoot, 'PERMIT', 'SUCCESS', {
            candidateId: candidate.candidateId,
            milestoneTag: candidate.milestoneTag,
            executionId: request.executionId,
        });
        return request;
    }
    /**
     * Records human supervisory or Master Owner review.
     * Ghi nhận xem xét của người giám sát hoặc Master Owner.
     */
    recordReview(input) {
        ReleaseExecutionPolicyEngine.assertNotUserStopped(this.isUserStopActive);
        ReleaseExecutionPolicyEngine.assertNotRevoked(this.isRevoked);
        const request = this.requests.get(input.executionId);
        const candidate = this.candidates.get(input.executionId);
        const verification = this.verifications.get(input.executionId);
        if (!request || !candidate || !verification) {
            throw new ReleaseExecutionError('MISSING_REQUIRED_BINDING', `No active execution request found for executionId "${input.executionId}".`);
        }
        const approval = this.reviewBridge.recordReview({
            request,
            candidate,
            verification,
            reviewerId: input.reviewerId,
            reviewerType: input.reviewerType,
            decision: input.decision,
            rationale: input.rationale,
        });
        this.approvals.set(input.executionId, approval);
        if (approval.decision === 'APPROVED') {
            this.states.set(input.executionId, 'OWNER_APPROVED');
        }
        else {
            this.states.set(input.executionId, 'REJECTED');
        }
        this.logAudit(input.reviewerId, 'RELEASE_REVIEW_RECORDED', request.target.projectRoot, approval.decision === 'APPROVED' ? 'PERMIT' : 'DENY', approval.decision === 'APPROVED' ? 'SUCCESS' : 'BLOCKED', {
            executionId: input.executionId,
            reviewerType: input.reviewerType,
            isOwner: approval.isOwnerApproval,
            rationale: input.rationale,
        });
        return approval;
    }
    /**
     * Dispatches human gate approval request through canonical SupervisorHumanGate.
     * Gửi yêu cầu phê duyệt cổng con người thông qua SupervisorHumanGate chuẩn tắc.
     */
    requestHumanGate(executionId) {
        const request = this.requests.get(executionId);
        const candidate = this.candidates.get(executionId);
        if (!request || !candidate) {
            throw new ReleaseExecutionError('MISSING_REQUIRED_BINDING', `No active execution request found for executionId "${executionId}".`);
        }
        return this.reviewBridge.requestHumanGate(request, candidate);
    }
    /**
     * Issues execution authorization token via canonical WorldActionAuthorizationEngine.
     * Cấp mã ủy quyền thực thi thông qua WorldActionAuthorizationEngine chuẩn tắc.
     */
    issueAuthorizationToken(executionId, ttlMs) {
        ReleaseExecutionPolicyEngine.assertNotUserStopped(this.isUserStopActive);
        ReleaseExecutionPolicyEngine.assertNotRevoked(this.isRevoked);
        const request = this.requests.get(executionId);
        const candidate = this.candidates.get(executionId);
        const approval = this.approvals.get(executionId);
        if (!request || !candidate || !approval) {
            throw new ReleaseExecutionError('MISSING_REQUIRED_BINDING', `Cannot issue token: missing request, candidate, or approval binding for "${executionId}".`);
        }
        const { token, binding } = this.authBridge.issueReleaseToken({
            request,
            candidate,
            approval,
            ttlMs,
        });
        this.authBindings.set(executionId, binding);
        this.states.set(executionId, 'AUTHORIZED');
        this.logAudit(request.operatorId, 'RELEASE_AUTHORIZATION_ISSUED', request.target.projectRoot, 'PERMIT', 'SUCCESS', {
            executionId,
            tokenId: token.tokenId,
            expiresAt: token.expiresAt,
        });
        return { token, binding };
    }
    /**
     * Executes the authorized release mutation, performs post-verification, and handles rollback.
     * Thực thi đột biến phát hành được ủy quyền, thực hiện xác minh sau thực thi và xử lý hoàn tác.
     */
    executeRelease(executionId, token, options) {
        const startedAt = Date.now();
        ReleaseExecutionPolicyEngine.assertNotUserStopped(this.isUserStopActive);
        ReleaseExecutionPolicyEngine.assertNotRevoked(this.isRevoked);
        const request = this.requests.get(executionId);
        const candidate = this.candidates.get(executionId);
        const approval = this.approvals.get(executionId);
        if (!request || !candidate || !approval) {
            throw new ReleaseExecutionError('MISSING_REQUIRED_BINDING', `Missing execution bindings for "${executionId}".`);
        }
        this.states.set(executionId, 'EXECUTING');
        // 1. Execute mutation.
        // 1. Thực thi đột biến.
        let mutationOutput;
        try {
            mutationOutput = this.executionEngine.executeRelease({
                request,
                candidate,
                approval,
                token,
                sourceFiles: options?.sourceFiles,
                sourceDirectory: options?.sourceDirectory,
                isUserStopActive: this.isUserStopActive,
                isRevoked: this.isRevoked,
            });
        }
        catch (err) {
            this.states.set(executionId, 'FAILED');
            const failedResult = ReleaseExecutionProvenanceEngine.compileResult({
                request,
                state: 'FAILED',
                target: request.target,
                preReleaseManifestHash: 'NONE',
                filesMutated: [],
                rollbackOccurred: false,
                errorDetails: err?.message ?? String(err),
                startedAt,
                completedAt: Date.now(),
            });
            this.results.set(executionId, failedResult);
            return failedResult;
        }
        // 2. Post-execution verification.
        // 2. Xác minh sau thực thi.
        this.states.set(executionId, 'VERIFYING');
        const expectedFiles = options?.expectedFiles ?? mutationOutput.filesMutated;
        const verificationOutput = ReleaseExecutionVerificationEngine.verifyPostExecution({
            target: request.target,
            expectedFiles,
            preManifestHash: mutationOutput.preExecutionManifestHash,
        });
        let finalState = 'COMPLETED';
        let rollbackOccurred = false;
        let rollbackReason;
        if (!verificationOutput.passed) {
            // Automatic rollback triggered upon post-verification failure.
            // Kích hoạt hoàn tác tự động khi xác minh sau thực thi thất bại.
            rollbackReason = `Post-verification failed: ${verificationOutput.failureReasons.join('; ')}`;
            ReleaseExecutionRollbackEngine.rollback({
                target: request.target,
                backups: mutationOutput.backups,
                reason: rollbackReason,
                isUserStopActive: this.isUserStopActive,
                isRevoked: this.isRevoked,
            });
            rollbackOccurred = true;
            finalState = 'FAILED';
        }
        this.states.set(executionId, finalState);
        // 3. Assemble provenance evidence.
        // 3. Lắp ráp bằng chứng nguồn gốc.
        const evidence = ReleaseExecutionProvenanceEngine.assembleEvidence(request, mutationOutput.preExecutionManifestHash, verificationOutput.postManifest.manifestHash, token.tokenId, Date.now());
        const completedResult = ReleaseExecutionProvenanceEngine.compileResult({
            request,
            state: finalState,
            target: request.target,
            preReleaseManifestHash: mutationOutput.preExecutionManifestHash,
            postReleaseManifestHash: verificationOutput.postManifest.manifestHash,
            filesMutated: mutationOutput.filesMutated,
            rollbackOccurred,
            rollbackReason,
            errorDetails: verificationOutput.failureReasons.length > 0 ? verificationOutput.failureReasons.join('; ') : undefined,
            evidence,
            startedAt,
            completedAt: Date.now(),
        });
        this.results.set(executionId, completedResult);
        this.logAudit(request.operatorId, finalState === 'COMPLETED' ? 'RELEASE_EXECUTION_COMPLETED' : 'RELEASE_EXECUTION_FAILED', request.target.projectRoot, finalState === 'COMPLETED' ? 'PERMIT' : 'DENY', finalState === 'COMPLETED' ? 'SUCCESS' : 'FAILURE', {
            executionId,
            finalState,
            rollbackOccurred,
            filesMutatedCount: mutationOutput.filesMutated.length,
        });
        return completedResult;
    }
    /**
     * Detects multi-agent contradictions across release execution results.
     * Rejects majority voting; any conflict yields CONTRADICTED state.
     *
     * Phát hiện mâu thuẫn đa tác nhân giữa các kết quả thực thi phát hành.
     * Từ chối bỏ phiếu đa số; bất kỳ xung đột nào đều dẫn đến trạng thái CONTRADICTED.
     */
    detectContradictions(executionId, agentReports) {
        if (agentReports.length <= 1) {
            return undefined;
        }
        const firstState = agentReports[0].state;
        const firstHash = agentReports[0].resultHash;
        const hasStateConflict = agentReports.some(r => r.state !== firstState);
        const hasHashConflict = agentReports.some(r => r.resultHash !== firstHash);
        if (hasStateConflict || hasHashConflict) {
            this.states.set(executionId, 'CONTRADICTED');
            const contradiction = {
                contradictionId: `contra_${executionId}_${Date.now()}`,
                executionId,
                conflictingAgents: agentReports.map(r => ({
                    ...r,
                    reportedAt: Date.now(),
                })),
                detectedAt: Date.now(),
                reason: hasStateConflict
                    ? 'Agents reported conflicting execution states.'
                    : 'Agents reported conflicting result hashes.',
            };
            this.logAudit('SYSTEM', 'RELEASE_CONTRADICTION_DETECTED', executionId, 'DENY', 'BLOCKED', {
                contradictionId: contradiction.contradictionId,
                reason: contradiction.reason,
                conflictingAgentsCount: agentReports.length,
            });
            return contradiction;
        }
        return undefined;
    }
    /**
     * Retrieves an execution result by executionId.
     * Lấy kết quả thực thi theo executionId.
     */
    getResult(executionId) {
        return this.results.get(executionId);
    }
    /**
     * Retrieves the current execution state by executionId.
     * Lấy trạng thái thực thi hiện tại theo executionId.
     */
    getState(executionId) {
        return this.states.get(executionId);
    }
    /**
     * Clears in-memory runtime records (useful for test resets).
     * Xóa các bản ghi runtime trong bộ nhớ (hữu ích cho việc đặt lại kiểm thử).
     */
    clear() {
        this.requests.clear();
        this.candidates.clear();
        this.verifications.clear();
        this.approvals.clear();
        this.authBindings.clear();
        this.results.clear();
        this.states.clear();
        this.isUserStopActive = false;
        this.isRevoked = false;
    }
}
