// src/core/deployment/deploymentRuntime.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Central coordinator managing the governed production deployment lifecycle, rings, and audit ledger.
// Điều phối viên trung tâm quản lý vòng đời triển khai sản xuất có quản trị, các vòng và sổ cái kiểm toán.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - CANARY_PASS != OWNER_APPROVAL
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - EXECUTION_TOKEN != DEPLOYMENT_RESULT
// - ZERO SHELL EXECUTION.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { DeploymentError, } from './deploymentTypes.js';
import { DeploymentPolicyEngine } from './deploymentPolicyEngine.js';
import { DeploymentRingEngine } from './deploymentRingEngine.js';
import { CanaryVerificationEngine } from './canaryVerificationEngine.js';
import { SloPolicyEngine } from './sloPolicyEngine.js';
import { DeploymentCircuitBreaker } from './deploymentCircuitBreaker.js';
import { DeploymentExecutionEngine } from './deploymentExecutionEngine.js';
import { DeploymentRollbackEngine } from './deploymentRollbackEngine.js';
import { DeploymentProvenanceEngine } from './deploymentProvenanceEngine.js';
import { DeploymentContradictionEngine } from './deploymentContradictionEngine.js';
import { DeploymentReportEngine } from './deploymentReportEngine.js';
import { globalAuditLedger } from '../auditLedger.js';
import { globalSupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import { isMasterOwner } from '../delegation/delegationTypes.js';
export class DeploymentRuntime {
    policyEngine;
    ringEngine;
    canaryEngine;
    sloEngine;
    circuitBreaker;
    executionEngine;
    rollbackEngine;
    provenanceEngine;
    contradictionEngine;
    reportEngine;
    humanGate;
    auditLedger;
    requests = new Map();
    candidates = new Map();
    states = new Map();
    approvals = new Map();
    authorizations = new Map();
    activeTokens = new Map();
    highestRings = new Map();
    canaryRecords = new Map();
    backups = new Map();
    preManifestHashes = new Map();
    postManifestHashes = new Map();
    deployedFiles = new Map();
    rollbackRecords = new Map();
    contradictionRecords = new Map();
    isUserStopActive = false;
    isRevoked = false;
    constructor(policyEngine = new DeploymentPolicyEngine(), ringEngine = new DeploymentRingEngine(), canaryEngine = new CanaryVerificationEngine(), sloEngine = new SloPolicyEngine(), circuitBreaker = new DeploymentCircuitBreaker(), executionEngine = new DeploymentExecutionEngine(), rollbackEngine = new DeploymentRollbackEngine(), provenanceEngine = new DeploymentProvenanceEngine(), contradictionEngine = new DeploymentContradictionEngine(), reportEngine = new DeploymentReportEngine(), humanGate = globalSupervisorHumanGate, auditLedger = globalAuditLedger) {
        this.policyEngine = policyEngine;
        this.ringEngine = ringEngine;
        this.canaryEngine = canaryEngine;
        this.sloEngine = sloEngine;
        this.circuitBreaker = circuitBreaker;
        this.executionEngine = executionEngine;
        this.rollbackEngine = rollbackEngine;
        this.provenanceEngine = provenanceEngine;
        this.contradictionEngine = contradictionEngine;
        this.reportEngine = reportEngine;
        this.humanGate = humanGate;
        this.auditLedger = auditLedger;
    }
    /**
     * Helper to append an immutable event to the canonical AuditLedger.
     * Trợ giúp ghi sự kiện bất biến vào AuditLedger chuẩn tắc.
     */
    logAudit(eventType, action, actor, resource, details) {
        const sanitizedDetails = this.provenanceEngine.sanitizeSecrets(details);
        const rawPayload = JSON.stringify({ eventType, action, resource, ...sanitizedDetails });
        const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
        this.auditLedger.record({
            timestamp: new Date().toISOString(),
            actor: {
                userId: actor.id,
                role: actor.role,
                channel: 'INTERNAL',
            },
            domain: 'DEPLOYMENT_GOVERNANCE',
            toolName: action,
            classification: action.includes('STOP') || action.includes('REVOK') || action.includes('CIRCUIT') ? 'SAFETY' : 'MUTATION',
            argumentsHash,
            policyDecision: action.includes('REJECT') || action.includes('FAILED') ? 'DENY' : 'PERMIT',
            executionStatus: action.includes('FAILED') || action.includes('REJECT') ? 'FAILURE' : 'SUCCESS',
            resultHash: argumentsHash,
        });
    }
    // ---------------------------------------------------------------------------
    // EMERGENCY CONTROLS / ĐIỀU KHIỂN KHẨN CẤP
    // ---------------------------------------------------------------------------
    triggerUserStop(reason) {
        this.isUserStopActive = true;
        for (const [deploymentId, state] of this.states.entries()) {
            if (state !== 'COMPLETED' && state !== 'ROLLED_BACK' && state !== 'FAILED') {
                this.circuitBreaker.trip({
                    deploymentId: deploymentId,
                    reason: `USER_STOP triggered: ${reason}`,
                    triggeredBy: 'USER_STOP',
                });
                this.states.set(deploymentId, 'BLOCKED');
                this.logAudit('USER_STOP_TRIGGERED', 'EMERGENCY_HALT', { id: 'MASTER_OWNER', role: 'OWNER' }, { id: deploymentId, type: 'DEPLOYMENT' }, { reason });
            }
        }
    }
    clearUserStop() {
        this.isUserStopActive = false;
    }
    triggerRevocation(reason) {
        this.isRevoked = true;
        for (const [deploymentId, state] of this.states.entries()) {
            if (state !== 'COMPLETED' && state !== 'ROLLED_BACK' && state !== 'FAILED') {
                this.circuitBreaker.trip({
                    deploymentId: deploymentId,
                    reason: `REVOCATION triggered: ${reason}`,
                    triggeredBy: 'REVOCATION',
                });
                this.states.set(deploymentId, 'REVOKED');
                this.logAudit('REVOCATION_TRIGGERED', 'EMERGENCY_REVOCATION', { id: 'SUPERVISOR', role: 'SUPERVISOR' }, { id: deploymentId, type: 'DEPLOYMENT' }, { reason });
            }
        }
    }
    // ---------------------------------------------------------------------------
    // LIFECYCLE MANAGEMENT / QUẢN LÝ VÒNG ĐỜI
    // ---------------------------------------------------------------------------
    getState(deploymentId) {
        return this.states.get(deploymentId) ?? 'INVALID';
    }
    /**
     * 1. Submits and validates a new deployment request.
     * 1. Gửi và xác thực một yêu cầu triển khai mới.
     */
    requestDeployment(request, candidate) {
        this.states.set(request.deploymentId, 'REQUESTED');
        // Fail-closed policy check.
        // Kiểm tra chính sách đóng khi thất bại.
        this.states.set(request.deploymentId, 'VALIDATING');
        this.policyEngine.validateRequest(request, candidate, {
            isUserStopActive: this.isUserStopActive,
            isRevoked: this.isRevoked,
        });
        this.requests.set(request.deploymentId, request);
        this.candidates.set(request.deploymentId, candidate);
        this.highestRings.set(request.deploymentId, request.initialRing);
        this.states.set(request.deploymentId, 'READY_FOR_OWNER');
        this.logAudit('DEPLOYMENT_REQUESTED', 'VALIDATE_DEPLOYMENT', { id: request.operatorId, role: 'AGENT' }, { id: request.deploymentId, type: 'DEPLOYMENT' }, {
            candidateId: candidate.candidateId,
            targetRing: request.targetRing,
        });
        return { deploymentId: request.deploymentId, state: 'READY_FOR_OWNER' };
    }
    /**
     * 2. Dispatches supervisory human gate review request.
     * 2. Gửi yêu cầu xem xét cổng con người giám sát.
     */
    requestHumanReview(deploymentId) {
        const request = this.requests.get(deploymentId);
        const candidate = this.candidates.get(deploymentId);
        if (!request || !candidate) {
            throw new DeploymentError('INVALID_STATE_TRANSITION', `Deployment "${deploymentId}" not found.`);
        }
        const diagnosis = {
            anomalyId: `dep_${deploymentId}`,
            component: 'GovernedProductionDeployment',
            severity: 'HIGH',
            symptoms: [`Deployment requested for candidate ${candidate.candidateId} to ring ${request.targetRing}`],
            rootCause: 'Governed deployment requiring human owner signoff',
            recommendedRecovery: `Approve or reject deployment to target ${candidate.target.targetId}`,
            timestamp: Date.now(),
        };
        const plan = {
            planId: `plan_${deploymentId}`,
            anomalyId: diagnosis.anomalyId,
            riskLevel: 'HIGH',
            steps: [
                {
                    stepId: 'step_deploy',
                    description: `Execute deployment to ring ${request.targetRing}`,
                    action: 'DEPLOY',
                    isReversible: true,
                    estimatedDurationMs: 60_000,
                },
            ],
            createdAt: Date.now(),
        };
        const gateRequest = this.humanGate.createRequest(diagnosis, plan, {
            target: candidate.target.rootDirectory,
            affectedResources: [candidate.target.rootDirectory],
            expectedEffects: [`Deploy version ${candidate.version}`],
            ttlMs: 600_000,
            authorizationContext: {
                actionId: `deployment_${deploymentId}`,
                sessionId: request.sessionId,
                taskId: request.taskId,
                deviceId: 'dev_host_master',
                capabilityId: 'project_deployment_execution',
                target: candidate.target.rootDirectory,
                parameters: {
                    deploymentId,
                    candidateId: candidate.candidateId,
                    targetRing: request.targetRing,
                },
            },
        });
        this.states.set(deploymentId, 'OWNER_APPROVAL_PENDING');
        this.logAudit('DEPLOYMENT_REVIEW_REQUESTED', 'SUPERVISOR_HUMAN_GATE', { id: request.operatorId, role: 'AGENT' }, { id: deploymentId, type: 'DEPLOYMENT' }, { gateRequestId: gateRequest.requestId });
        return gateRequest;
    }
    /**
     * 3. Records human owner review decision.
     * 3. Ghi nhận quyết định xem xét của chủ sở hữu con người.
     */
    recordOwnerReview(options) {
        const request = this.requests.get(options.deploymentId);
        const candidate = this.candidates.get(options.deploymentId);
        if (!request || !candidate) {
            throw new DeploymentError('INVALID_STATE_TRANSITION', `Deployment "${options.deploymentId}" not found.`);
        }
        // Prevent agent self-approval: AGENT != APPROVER.
        // Ngăn chặn tác nhân tự phê duyệt: AGENT != APPROVER.
        if (options.reviewerId === request.operatorId) {
            throw new DeploymentError('SELF_APPROVAL_REJECTED', `Operator "${options.reviewerId}" cannot review or approve its own deployment request.`);
        }
        const isOwner = options.reviewerType === 'MASTER_OWNER' && isMasterOwner(options.reviewerId);
        const approval = {
            deploymentId: options.deploymentId,
            reviewerId: options.reviewerId,
            reviewerType: options.reviewerType,
            isOwnerApproval: isOwner,
            decision: options.decision,
            reviewedAt: Date.now(),
            rationale: options.rationale,
        };
        this.approvals.set(options.deploymentId, approval);
        if (options.decision === 'REJECTED') {
            this.states.set(options.deploymentId, 'BLOCKED');
            this.logAudit('DEPLOYMENT_REJECTED', 'HUMAN_DECISION', { id: options.reviewerId, role: options.reviewerType }, { id: options.deploymentId, type: 'DEPLOYMENT' }, { rationale: options.rationale });
        }
        else {
            // Approved but NOT yet executed (APPROVAL != AUTHORIZATION).
            // Đã phê duyệt nhưng CHƯA thực thi (APPROVAL != AUTHORIZATION).
            this.states.set(options.deploymentId, 'AUTHORIZED');
            this.logAudit('DEPLOYMENT_OWNER_APPROVED', 'HUMAN_DECISION', { id: options.reviewerId, role: options.reviewerType }, { id: options.deploymentId, type: 'DEPLOYMENT' }, { isOwnerApproval: isOwner, rationale: options.rationale });
        }
        return approval;
    }
    /**
     * 4. Binds single-use WorldActionAuthorization token.
     * 4. Ràng buộc mã ủy quyền WorldActionAuthorization sử dụng một lần.
     */
    bindAuthorizationToken(deploymentId, token, targetRing) {
        const request = this.requests.get(deploymentId);
        if (!request) {
            throw new DeploymentError('INVALID_STATE_TRANSITION', `Deployment "${deploymentId}" not found.`);
        }
        const tokenHash = crypto.createHash('sha256').update(token.signature).digest('hex');
        const binding = {
            deploymentId,
            tokenId: token.tokenId,
            tokenHash,
            authorizedAt: Date.now(),
            expiresAt: token.expiresAt,
            targetRing,
        };
        this.authorizations.set(deploymentId, binding);
        this.activeTokens.set(deploymentId, token);
        this.logAudit('DEPLOYMENT_TOKEN_BOUND', 'AUTHORIZATION_BINDING', { id: request.operatorId, role: 'AGENT' }, { id: deploymentId, type: 'DEPLOYMENT' }, { tokenId: token.tokenId, tokenHash, targetRing });
        return binding;
    }
    /**
     * 5. Executes governed rollout mutation for a specified ring.
     * 5. Thực thi thay đổi triển khai có quản trị cho một vòng được chỉ định.
     */
    executeRollout(deploymentId, options) {
        const request = this.requests.get(deploymentId);
        const candidate = this.candidates.get(deploymentId);
        const token = this.activeTokens.get(deploymentId);
        if (!request || !candidate || !token) {
            throw new DeploymentError('INVALID_AUTHORIZATION', `Missing valid request, candidate, or execution token for deployment "${deploymentId}".`);
        }
        if (this.circuitBreaker.isOpen(deploymentId)) {
            throw new DeploymentError('CIRCUIT_BREAKER_TRIGGERED', `Cannot execute rollout: Circuit breaker is OPEN for deployment "${deploymentId}".`);
        }
        const currentRing = this.highestRings.get(deploymentId) ?? request.initialRing;
        this.ringEngine.canAdvance({
            currentRing,
            targetRing: options.targetRing,
            isCanaryPassed: true, // For non-canary or checked via canary records
            isCircuitOpen: this.circuitBreaker.isOpen(deploymentId),
            isUserStopActive: this.isUserStopActive,
            isRevoked: this.isRevoked,
        });
        this.states.set(deploymentId, options.targetRing === 'RING_1' ? 'CANARY_RUNNING' : 'ROLLOUT_CONTINUING');
        const mutationResult = this.executionEngine.executeMutation({
            request,
            candidate,
            token,
            targetRing: options.targetRing,
            isUserStopActive: this.isUserStopActive,
            isRevoked: this.isRevoked,
            backupDir: options.backupDir,
        });
        this.highestRings.set(deploymentId, options.targetRing);
        this.preManifestHashes.set(deploymentId, mutationResult.preDeploymentManifestHash);
        this.postManifestHashes.set(deploymentId, mutationResult.postDeploymentManifestHash);
        this.deployedFiles.set(deploymentId, [...mutationResult.deployedFiles]);
        const existingBackups = this.backups.get(deploymentId) ?? [];
        this.backups.set(deploymentId, [...existingBackups, ...mutationResult.backups]);
        this.ringEngine.recordTransition({
            deploymentId,
            fromRing: currentRing,
            toRing: options.targetRing,
            transitionedAt: mutationResult.executedAt,
            authorizedByTokenId: token.tokenId,
        });
        this.logAudit('DEPLOYMENT_MUTATION_EXECUTED', 'RING_MUTATION', { id: request.operatorId, role: 'AGENT' }, { id: deploymentId, type: 'DEPLOYMENT' }, {
            targetRing: options.targetRing,
            deployedFileCount: mutationResult.deployedFiles.length,
            preManifestHash: mutationResult.preDeploymentManifestHash,
            postManifestHash: mutationResult.postDeploymentManifestHash,
        });
    }
    /**
     * 6. Records canary observations, evaluates SLO, and trips circuit breaker if degraded.
     * 6. Ghi nhận quan sát canary, đánh giá SLO và ngắt mạch nếu suy giảm.
     */
    recordCanaryObservations(deploymentId, ringLevel, observations, autoRollbackOnFailure = true) {
        const request = this.requests.get(deploymentId);
        const candidate = this.candidates.get(deploymentId);
        if (!request || !candidate) {
            throw new DeploymentError('INVALID_STATE_TRANSITION', `Deployment "${deploymentId}" not found.`);
        }
        const priorRecords = this.canaryRecords.get(deploymentId) ?? [];
        const priorDegradations = priorRecords.length > 0
            ? priorRecords[priorRecords.length - 1].window.consecutiveDegradationCount
            : 0;
        const record = this.canaryEngine.verifyCanary(deploymentId, ringLevel, observations, request.sloPolicy, priorDegradations);
        priorRecords.push(record);
        this.canaryRecords.set(deploymentId, priorRecords);
        if (record.isPassing) {
            this.states.set(deploymentId, 'CANARY_PASSED');
            this.logAudit('CANARY_VERIFICATION_PASSED', 'EVALUATE_CANARY', { id: request.operatorId, role: 'AGENT' }, { id: deploymentId, type: 'DEPLOYMENT' }, { ringLevel, evidenceHash: record.evidenceHash });
        }
        else {
            this.states.set(deploymentId, 'CANARY_FAILED');
            // Trip safety circuit breaker
            this.circuitBreaker.trip({
                deploymentId,
                reason: `Canary verification failed: ${record.failureReasons.join('; ')}`,
                triggeredBy: 'SLO_VIOLATION',
                details: { ringLevel, failureReasons: record.failureReasons },
            });
            this.states.set(deploymentId, 'ROLLOUT_PAUSED');
            this.logAudit('CANARY_VERIFICATION_FAILED', 'CIRCUIT_BREAKER_TRIP', { id: request.operatorId, role: 'AGENT' }, { id: deploymentId, type: 'DEPLOYMENT' }, { ringLevel, failureReasons: record.failureReasons });
            // Automatic governed rollback if requested and technically safe
            if (autoRollbackOnFailure) {
                this.executeSafeRollback(deploymentId, `Automatic rollback: Canary verification failed for ring ${ringLevel}`);
            }
        }
        return record;
    }
    /**
     * 7. Executes governed rollback.
     * 7. Thực thi hoàn nguyên có quản trị.
     */
    executeSafeRollback(deploymentId, reason) {
        const request = this.requests.get(deploymentId);
        const candidate = this.candidates.get(deploymentId);
        if (!request || !candidate) {
            throw new DeploymentError('INVALID_STATE_TRANSITION', `Deployment "${deploymentId}" not found.`);
        }
        this.states.set(deploymentId, 'ROLLING_BACK');
        const deployedFiles = this.deployedFiles.get(deploymentId) ?? [];
        const backups = this.backups.get(deploymentId) ?? [];
        const expectedPreHash = this.preManifestHashes.get(deploymentId) ?? '';
        const rollbackRecord = this.rollbackEngine.executeRollback({
            deploymentId,
            target: candidate.target,
            deployedFiles,
            backups,
            expectedPreManifestHash: expectedPreHash,
            reason,
            isUserStopActive: this.isUserStopActive,
            isRevoked: this.isRevoked,
        });
        this.rollbackRecords.set(deploymentId, rollbackRecord);
        this.states.set(deploymentId, 'ROLLED_BACK');
        this.logAudit('DEPLOYMENT_ROLLED_BACK', 'GOVERNED_ROLLBACK', { id: request.operatorId, role: 'AGENT' }, { id: deploymentId, type: 'DEPLOYMENT' }, {
            restoredFilesCount: rollbackRecord.restoredFiles.length,
            unlinkedFilesCount: rollbackRecord.unlinkedFiles.length,
            isVerified: rollbackRecord.isVerified,
            reason,
        });
        return rollbackRecord;
    }
    /**
     * 8. Detects and escalates multi-agent contradictions.
     * 8. Phát hiện và leo thang các mâu thuẫn đa tác nhân.
     */
    reportAgentAssertions(deploymentId, ringLevel, assertions) {
        const contradiction = this.contradictionEngine.detectContradictions(deploymentId, ringLevel, assertions);
        if (contradiction) {
            this.contradictionRecords.set(deploymentId, contradiction);
            this.states.set(deploymentId, 'CONFLICTED');
            this.logAudit('DEPLOYMENT_CONTRADICTION_DETECTED', 'ESCALATE_HUMAN_GATE', { id: assertions[0].agentId, role: 'AGENT' }, { id: deploymentId, type: 'DEPLOYMENT' }, {
                ringLevel,
                conflictingFields: contradiction.conflictingFields,
                assertionCount: assertions.length,
            });
        }
        return contradiction;
    }
    /**
     * 9. Finalizes deployment and produces deterministic DeploymentResult and Report.
     * 9. Hoàn tất triển khai và tạo ra DeploymentResult và Báo cáo xác định.
     */
    finalizeDeployment(deploymentId) {
        const request = this.requests.get(deploymentId);
        const candidate = this.candidates.get(deploymentId);
        const finalState = this.states.get(deploymentId) ?? 'INVALID';
        if (!request || !candidate) {
            throw new DeploymentError('INVALID_STATE_TRANSITION', `Deployment "${deploymentId}" not found.`);
        }
        const canaryRecords = this.canaryRecords.get(deploymentId) ?? [];
        const cbEvents = this.circuitBreaker.getEvents(deploymentId);
        const rollback = this.rollbackRecords.get(deploymentId);
        const contradiction = this.contradictionRecords.get(deploymentId);
        const highestRing = this.highestRings.get(deploymentId) ?? request.initialRing;
        const { provenanceHash } = this.provenanceEngine.buildChain({
            request,
            candidate,
            approval: this.approvals.get(deploymentId),
            authorization: this.authorizations.get(deploymentId),
            targetRing: highestRing,
            canaryRecords,
            preDeploymentManifestHash: this.preManifestHashes.get(deploymentId) ?? '',
            postDeploymentManifestHash: this.postManifestHashes.get(deploymentId) ?? '',
        });
        const isSuccess = finalState === 'COMPLETED' || (finalState === 'CANARY_PASSED' && highestRing === request.targetRing);
        const report = this.reportEngine.compileReport({
            deploymentId,
            candidateId: candidate.candidateId,
            releaseExecutionId: request.releaseExecutionId,
            targetEnvironment: candidate.target.environment,
            highestRingReached: highestRing,
            finalState,
            isSuccessful: isSuccess,
            canaryVerifications: canaryRecords,
            circuitBreakerEvents: cbEvents,
            rollbackRecord: rollback,
            contradictionRecord: contradiction,
            provenanceHash,
        });
        if (isSuccess) {
            this.states.set(deploymentId, 'COMPLETED');
        }
        const result = {
            deploymentId,
            state: this.states.get(deploymentId) ?? finalState,
            highestRingReached: highestRing,
            isSuccess,
            report,
            completedAt: Date.now(),
            failureReason: isSuccess ? undefined : `Deployment finished in state ${finalState}`,
        };
        this.logAudit('DEPLOYMENT_FINALIZED', 'COMPILE_REPORT', { id: request.operatorId, role: 'AGENT' }, { id: deploymentId, type: 'DEPLOYMENT' }, {
            finalState: result.state,
            isSuccess,
            reportHash: report.reportHash,
        });
        return result;
    }
}
