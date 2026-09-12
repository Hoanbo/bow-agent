// src/core/remediation/remediationRuntime.ts
// BOWCON V4.0 — MS-1.3.55: GOVERNED INCIDENT REMEDIATION, AUTHORIZED RECOVERY EXECUTION & CLOSED-LOOP POST-MITIGATION VERIFICATION
//
// Governed Incident Remediation Runtime Coordinator.
// Coordinates token validation & consumption, pre-remediation snapshotting, governed execution,
// closed-loop post-mitigation verification, automatic fail-safe rollback, provenance, and audit trail logging.
// Bộ điều phối thời gian chạy khắc phục sự cố có quản trị.
// Điều phối xác thực & tiêu thụ token, chụp ảnh nhanh trước khắc phục, thực thi có quản trị,
// xác minh vòng lặp kín sau khắc phục, tự động khôi phục an toàn, nguồn gốc và nhật ký kiểm toán.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - NO_TOKEN_NO_EXECUTION: Remediation will not execute without an unexpired single-use AuthorizationToken.
// - ZERO_TOKEN_ISSUANCE: RemediationRuntime MUST NEVER issue authorization tokens (issueToken() count === 0).
// - NO_SELF_APPROVAL: RemediationRuntime MUST NEVER approve human gate requests (approve() count === 0).
// - USER_STOP_SUPREMACY: Immediate halt if USER_STOP signal is active.
// - MANDATORY_ROLLBACK: If post-mitigation verification fails, rollback MUST execute immediately.
// - CANONICAL_AUDIT: All actions and events recorded in globalAuditLedger under domain 'INCIDENT_REMEDIATION'.
// - C:\BOW\shopofbow: Zero reads, zero writes, zero touches. Fail closed with SECURITY_VIOLATION.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalSupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import { ObservabilityRuntime } from '../observability/observabilityRuntime.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
import { RemediationTokenValidator } from './remediationTokenValidator.js';
import { RemediationSnapshotEngine } from './remediationSnapshotEngine.js';
import { RemediationExecutionEngine } from './remediationExecutionEngine.js';
import { PostMitigationVerificationEngine } from './postMitigationVerificationEngine.js';
import { RemediationRollbackEngine } from './remediationRollbackEngine.js';
import { RemediationProvenanceEngine } from './remediationProvenanceEngine.js';
export class RemediationRuntime {
    tokenValidator;
    snapshotEngine;
    executionEngine;
    verificationEngine;
    rollbackEngine;
    provenanceEngine;
    observabilityRuntime;
    supervisorHumanGate;
    masterAuthority;
    auditLedger;
    isUserStopActiveFlag = false;
    constructor(tokenValidator = new RemediationTokenValidator(), snapshotEngine = new RemediationSnapshotEngine(), executionEngine = new RemediationExecutionEngine(), verificationEngine = new PostMitigationVerificationEngine(), rollbackEngine = new RemediationRollbackEngine(), provenanceEngine = new RemediationProvenanceEngine(), observabilityRuntime = new ObservabilityRuntime(), supervisorHumanGate = globalSupervisorHumanGate, masterAuthority = new MasterHumanAuthority(), auditLedger = globalAuditLedger) {
        this.tokenValidator = tokenValidator;
        this.snapshotEngine = snapshotEngine;
        this.executionEngine = executionEngine;
        this.verificationEngine = verificationEngine;
        this.rollbackEngine = rollbackEngine;
        this.provenanceEngine = provenanceEngine;
        this.observabilityRuntime = observabilityRuntime;
        this.supervisorHumanGate = supervisorHumanGate;
        this.masterAuthority = masterAuthority;
        this.auditLedger = auditLedger;
    }
    /**
     * Triggers or clears emergency USER_STOP.
     * Kích hoạt hoặc xóa tín hiệu USER_STOP khẩn cấp.
     */
    setUserStop(active) {
        this.isUserStopActiveFlag = active;
        this.logAudit(active ? 'USER_STOP_ACTIVATED' : 'USER_STOP_CLEARED', { id: 'MASTER_OPERATOR', role: 'SUPERVISOR' }, { id: 'GLOBAL', type: 'EMERGENCY_STOP' }, { active });
    }
    isUserStopActive() {
        return this.isUserStopActiveFlag;
    }
    /**
     * Helper to append an immutable event to canonical globalAuditLedger under domain 'INCIDENT_REMEDIATION'.
     * Trợ giúp ghi sự kiện bất biến vào globalAuditLedger chuẩn tắc dưới miền 'INCIDENT_REMEDIATION'.
     */
    logAudit(toolName, actor, resource, details, policyDecision = 'PERMIT', executionStatus = 'SUCCESS') {
        const sanitized = this.provenanceEngine.sanitizeSecrets(details);
        const rawPayload = JSON.stringify({ toolName, actor, resource, details: sanitized });
        const argumentsHash = crypto.createHash('sha256').update(rawPayload, 'utf8').digest('hex');
        this.auditLedger.record({
            timestamp: new Date().toISOString(),
            actor: {
                userId: actor.id,
                role: actor.role,
                channel: 'REMEDIATION_RUNTIME',
            },
            domain: 'INCIDENT_REMEDIATION',
            toolName,
            classification: toolName.includes('SECURITY') || toolName.includes('STOP') || toolName.includes('ESCALAT')
                ? 'SAFETY'
                : 'GOVERNANCE',
            argumentsHash,
            policyDecision,
            executionStatus,
        });
    }
    /**
     * Main closed-loop governed remediation execution pipeline.
     * Đường ống thực thi khắc phục có quản trị vòng lặp kín chính.
     */
    async executeRemediation(request) {
        const { plan, token, operatorId, sessionId: explicitSessionId, baseDirectory = process.cwd(), storageDirectory, simulateVerificationFailure, simulateRollbackFailure, } = request;
        const dummyExecutionId = crypto.randomBytes(4).toString('hex');
        // 0. Protected workspace check upfront (Fail closed with SECURITY_VIOLATION)
        // 0. Kiểm tra không gian làm việc được bảo vệ ngay từ đầu
        try {
            if (plan.targetPath) {
                SandboxPathGuard.assertNotProtectedWorkspace(plan.targetPath);
            }
            SandboxPathGuard.assertNotProtectedWorkspace(plan.targetId);
            if (storageDirectory) {
                SandboxPathGuard.assertNotProtectedWorkspace(storageDirectory);
            }
        }
        catch (err) {
            this.logAudit('SECURITY_VIOLATION', { id: operatorId || 'UNKNOWN', role: 'SECURITY' }, { id: plan.planId, type: 'REMEDIATION_PLAN' }, { targetId: plan.targetId, targetPath: plan.targetPath, error: err.message }, 'DENY', 'BLOCKED');
            const executionResult = {
                executionId: `exec_sec_${dummyExecutionId}`,
                planId: plan.planId,
                lifecycleState: 'SECURITY_VIOLATION',
                actionClass: plan.actionClass,
                targetId: plan.targetId,
                startedAt: Date.now(),
                completedAt: Date.now(),
                appliedChanges: [],
                outputSummary: `Security violation: ${err.message}`,
                executionSha256: crypto.createHash('sha256').update(`SECURITY_VIOLATION:${plan.planId}`).digest('hex'),
            };
            return { executionResult };
        }
        // 1. Invariant: Check USER_STOP
        // 1. Bất biến: Kiểm tra USER_STOP
        if (this.isUserStopActive()) {
            this.logAudit('USER_STOP_ABORT', { id: operatorId || 'MASTER_OPERATOR', role: 'OPERATOR' }, { id: plan.planId, type: 'REMEDIATION_PLAN' }, { reason: 'Remediation aborted prior to start by active USER_STOP' }, 'DENY', 'BLOCKED');
            const executionResult = {
                executionId: `exec_abort_${dummyExecutionId}`,
                planId: plan.planId,
                lifecycleState: 'ABORTED',
                actionClass: plan.actionClass,
                targetId: plan.targetId,
                startedAt: Date.now(),
                completedAt: Date.now(),
                appliedChanges: [],
                outputSummary: 'Execution aborted: USER_STOP signal is active.',
                executionSha256: crypto.createHash('sha256').update(`ABORTED:${plan.planId}`).digest('hex'),
            };
            return { executionResult };
        }
        // 2. Validate and consume cryptographic authorization token
        // 2. Thẩm định và tiêu thụ mã ủy quyền mật mã
        let validatedTokenContext;
        try {
            validatedTokenContext = this.tokenValidator.validateAndConsume({
                token,
                plan,
                operatorId,
            });
            this.logAudit('AUTHORIZATION_VALIDATED', { id: validatedTokenContext.operatorId, role: 'MASTER_OPERATOR' }, { id: validatedTokenContext.tokenId, type: 'AUTHORIZATION_TOKEN' }, { planId: plan.planId, actionId: plan.actionId });
            this.logAudit('TOKEN_CONSUMED', { id: validatedTokenContext.operatorId, role: 'MASTER_OPERATOR' }, { id: validatedTokenContext.tokenId, type: 'AUTHORIZATION_TOKEN' }, { planId: plan.planId, consumedAt: validatedTokenContext.consumedAt });
        }
        catch (err) {
            this.logAudit('UNAUTHORIZED_EXECUTION_ATTEMPT', { id: operatorId || 'UNKNOWN', role: 'REMEDIATION' }, { id: plan.planId, type: 'REMEDIATION_PLAN' }, { error: err.message }, 'DENY', 'BLOCKED');
            const executionResult = {
                executionId: `exec_unauth_${dummyExecutionId}`,
                planId: plan.planId,
                lifecycleState: 'PENDING_AUTHORIZATION',
                actionClass: plan.actionClass,
                targetId: plan.targetId,
                startedAt: Date.now(),
                completedAt: Date.now(),
                appliedChanges: [],
                outputSummary: `Authorization validation failed: ${err.message}`,
                executionSha256: crypto.createHash('sha256').update(`UNAUTHORIZED:${plan.planId}`).digest('hex'),
            };
            return { executionResult };
        }
        // 3. Invariant: Atomic pre-remediation snapshot
        // 3. Bất biến: Chụp ảnh nhanh nguyên tử trước khi khắc phục
        let snapshot;
        try {
            snapshot = this.snapshotEngine.capturePreRemediationSnapshot({
                plan,
                baseDirectory,
                storageDirectory,
            });
            this.logAudit('SNAPSHOT_CREATED', { id: validatedTokenContext.operatorId, role: 'REMEDIATION_ENGINE' }, { id: snapshot.snapshotId, type: 'REMEDIATION_SNAPSHOT' }, { planId: plan.planId, snapshotSha256: snapshot.snapshotSha256, itemCount: snapshot.items.length });
        }
        catch (err) {
            this.logAudit('SNAPSHOT_FAILED', { id: validatedTokenContext.operatorId, role: 'REMEDIATION_ENGINE' }, { id: plan.planId, type: 'REMEDIATION_PLAN' }, { error: err.message }, 'DENY', 'FAILURE');
            const executionResult = {
                executionId: `exec_snap_fail_${dummyExecutionId}`,
                planId: plan.planId,
                lifecycleState: 'FAILED',
                actionClass: plan.actionClass,
                targetId: plan.targetId,
                startedAt: Date.now(),
                completedAt: Date.now(),
                appliedChanges: [],
                outputSummary: `Pre-remediation snapshot creation failed: ${err.message}. Mutating execution aborted.`,
                executionSha256: crypto.createHash('sha256').update(`SNAPSHOT_FAILED:${plan.planId}`).digest('hex'),
            };
            return { executionResult };
        }
        // 4. Governed Execution
        // 4. Thực thi có quản trị
        this.logAudit('REMEDIATION_STARTED', { id: validatedTokenContext.operatorId, role: 'REMEDIATION_ENGINE' }, { id: plan.planId, type: 'REMEDIATION_PLAN' }, { actionClass: plan.actionClass, targetId: plan.targetId });
        const executionResult = await this.executionEngine.executePlan({
            plan,
            snapshot,
            isUserStopActive: () => this.isUserStopActive(),
            baseDirectory,
        });
        this.logAudit('REMEDIATION_COMPLETED', { id: validatedTokenContext.operatorId, role: 'REMEDIATION_ENGINE' }, { id: executionResult.executionId, type: 'REMEDIATION_EXECUTION' }, {
            planId: plan.planId,
            lifecycleState: executionResult.lifecycleState,
            changesCount: executionResult.appliedChanges.length,
        });
        // If execution itself was aborted or security violation occurred
        if (executionResult.lifecycleState === 'ABORTED' || executionResult.lifecycleState === 'SECURITY_VIOLATION') {
            const provenanceRecord = this.provenanceEngine.buildProvenanceRecord({
                plan,
                tokenId: validatedTokenContext.tokenId,
                snapshot,
                executionResult,
            });
            return { executionResult, snapshot, provenanceRecord };
        }
        // 5. Closed-Loop Post-Mitigation Verification
        // 5. Xác minh sau giảm thiểu vòng lặp kín
        this.logAudit('VERIFICATION_STARTED', { id: validatedTokenContext.operatorId, role: 'VERIFICATION_ENGINE' }, { id: executionResult.executionId, type: 'REMEDIATION_EXECUTION' }, { windowMs: 30000 });
        // Prepare observability session
        const sessionId = explicitSessionId || this.observabilityRuntime.startSession({
            targetId: plan.targetId,
            deploymentId: `deploy_${plan.planId}`,
            deploymentVersion: '1.0.0-remediated',
        });
        let verificationResult = await this.verificationEngine.verifyMitigation({
            plan,
            observabilityRuntime: this.observabilityRuntime,
            sessionId,
        });
        if (simulateVerificationFailure) {
            verificationResult = {
                ...verificationResult,
                passed: false,
                violationDetails: ['SIMULATED_VERIFICATION_FAILURE: Injected regression violation.'],
            };
        }
        let finalLifecycleState = executionResult.lifecycleState;
        let rollbackResult;
        // 6. Branch: PASS -> SUCCESS / FAIL -> AUTOMATIC FAIL-SAFE ROLLBACK
        // 6. Rẽ nhánh: PASS -> THÀNH CÔNG / FAIL -> TỰ ĐỘNG KHÔI PHỤC AN TOÀN
        if (verificationResult.passed && !this.isUserStopActive()) {
            finalLifecycleState = 'SUCCESS';
            this.logAudit('VERIFICATION_PASSED', { id: validatedTokenContext.operatorId, role: 'VERIFICATION_ENGINE' }, { id: executionResult.executionId, type: 'REMEDIATION_EXECUTION' }, { verificationSha256: verificationResult.verificationSha256 });
            this.logAudit('REMEDIATION_CLOSED', { id: validatedTokenContext.operatorId, role: 'SUPERVISOR' }, { id: plan.planId, type: 'REMEDIATION_PLAN' }, { outcome: 'SUCCESS' });
        }
        else {
            // Failure branch
            const reason = !verificationResult.passed
                ? `Post-mitigation verification failed: ${verificationResult.violationDetails.join('; ')}`
                : 'Execution interrupted by active USER_STOP.';
            this.logAudit('VERIFICATION_FAILED', { id: validatedTokenContext.operatorId, role: 'VERIFICATION_ENGINE' }, { id: executionResult.executionId, type: 'REMEDIATION_EXECUTION' }, { reason }, 'PERMIT', 'FAILURE');
            this.logAudit('ROLLBACK_STARTED', { id: validatedTokenContext.operatorId, role: 'ROLLBACK_ENGINE' }, { id: snapshot.snapshotId, type: 'REMEDIATION_SNAPSHOT' }, { reason });
            rollbackResult = await this.rollbackEngine.executeRollback({
                plan,
                executionId: executionResult.executionId,
                snapshot,
                reason,
                baseDirectory,
                simulateRollbackFailure,
            });
            if (rollbackResult.success) {
                finalLifecycleState = 'ROLLED_BACK';
                this.logAudit('ROLLBACK_COMPLETED', { id: validatedTokenContext.operatorId, role: 'ROLLBACK_ENGINE' }, { id: rollbackResult.snapshotId, type: 'REMEDIATION_SNAPSHOT' }, { restoredItemsCount: rollbackResult.restoredItems.length });
            }
            else {
                finalLifecycleState = 'ESCALATED';
                this.logAudit('ESCALATION_REQUIRED', { id: validatedTokenContext.operatorId, role: 'ROLLBACK_ENGINE' }, { id: plan.planId, type: 'REMEDIATION_PLAN' }, { errors: rollbackResult.errors }, 'PERMIT', 'FAILURE');
            }
            this.logAudit('REMEDIATION_CLOSED', { id: validatedTokenContext.operatorId, role: 'SUPERVISOR' }, { id: plan.planId, type: 'REMEDIATION_PLAN' }, { outcome: finalLifecycleState });
        }
        // 7. Update final execution result DTO
        // 7. Cập nhật DTO kết quả thực thi cuối cùng
        const finalExecutionResult = {
            ...executionResult,
            lifecycleState: finalLifecycleState,
            completedAt: Date.now(),
            outputSummary: `${executionResult.outputSummary} [Final State: ${finalLifecycleState}]`,
        };
        // 8. Commit Cryptographic Provenance Record
        // 8. Lưu bản ghi nguồn gốc mật mã
        const provenanceRecord = this.provenanceEngine.buildProvenanceRecord({
            plan,
            tokenId: validatedTokenContext.tokenId,
            snapshot,
            executionResult: finalExecutionResult,
            verificationResult,
            rollbackResult,
        });
        return {
            executionResult: finalExecutionResult,
            snapshot,
            verificationResult,
            rollbackResult,
            provenanceRecord,
        };
    }
}
