// src/core/durableCommit/durableCommitRuntime.ts
// BOWCON V4.0 — MS-1.4.08: DURABLE COMMIT RUNTIME
//
// EN:
// Master runtime façade coordinating the Durable Commit Engine lifecycle:
// Gate 1 -> Request Validation -> Reality Verification Gating -> Binding Validation ->
// Gate 2 -> Duplicate Detection -> Provenance Calculation -> Gate 3 -> Atomic Persistence ->
// Gate 4 -> Audit Logging -> Immutable Result.
//
// VI:
// Façade runtime trung tâm điều phối toàn bộ vòng đời của Động cơ Commit Bền vững:
// Cổng 1 -> Xác thực Yêu cầu -> Gating Xác minh Thực tế -> Xác thực Liên kết ->
// Cổng 2 -> Phát hiện Trùng lặp -> Tính toán Provenance -> Cổng 3 -> Lưu trữ Nguyên tử ->
// Cổng 4 -> Ghi Audit -> Kết quả Bất biến.
import crypto from 'node:crypto';
import { DURABLE_COMMIT_AUDIT_DOMAIN, DuplicateCommitError, StaleTaskCommitError, CrossTenantCommitError, CommitSecurityViolationError, CommitAbortedError, } from './durableCommitTypes.js';
import { globalDurableCommitValidator, } from './durableCommitValidator.js';
import { globalDurableCommitExecutionGate, } from './durableCommitExecutionGate.js';
import { globalDurableCommitStore, } from './durableCommitStore.js';
import { globalAuditLedger, } from '../auditLedger.js';
import { globalDiagnosisSanitizer, } from '../diagnosis/diagnosisSanitizer.js';
export class DurableCommitRuntime {
    validator;
    gate;
    store;
    auditLedger;
    sanitizer;
    constructor(options) {
        this.validator = options?.validator ?? globalDurableCommitValidator;
        this.gate = options?.gate ?? globalDurableCommitExecutionGate;
        this.store = options?.store ?? globalDurableCommitStore;
        this.auditLedger = options?.auditLedger ?? globalAuditLedger;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * EN: Recursively deep-freezes an object to guarantee absolute immutability.
     */
    deepFreeze(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        Object.freeze(obj);
        for (const key of Object.getOwnPropertyNames(obj)) {
            const val = obj[key];
            if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
                this.deepFreeze(val);
            }
        }
        return obj;
    }
    /**
     * EN: Produces a canonical JSON string with deterministically sorted keys.
     */
    canonicalJSON(obj) {
        if (obj === null || typeof obj !== 'object') {
            return JSON.stringify(obj);
        }
        if (Array.isArray(obj)) {
            return '[' + obj.map((x) => this.canonicalJSON(x)).join(',') + ']';
        }
        const keys = Object.keys(obj).sort();
        const pairs = keys.map((k) => JSON.stringify(k) + ':' + this.canonicalJSON(obj[k]));
        return '{' + pairs.join(',') + '}';
    }
    /**
     * EN: Calculates SHA-256 cryptographic commit provenance hash.
     */
    calculateCommitProvenanceHash(params) {
        const canonicalState = this.canonicalJSON(params.committedState);
        const raw = [
            params.verificationProvenanceHash.trim(),
            params.taskId.trim(),
            params.tenantId.trim(),
            params.stepId.trim(),
            params.executionId.trim(),
            params.commitStatus.trim(),
            canonicalState,
            params.committedAt.trim(),
        ].join(':');
        return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
    }
    /**
     * EN: Records structured audit event in globalAuditLedger.
     */
    recordAudit(eventType, tenantId, metadata) {
        const sanitizedMetadata = this.sanitizer.sanitize(metadata);
        this.auditLedger.record({
            timestamp: new Date().toISOString(),
            eventType,
            domain: DURABLE_COMMIT_AUDIT_DOMAIN,
            toolName: 'durable_commit_runtime',
            classification: eventType.includes('ABORTED') ? 'INTERRUPT' : eventType.includes('FAILED') || eventType.includes('REJECTED') ? 'SECURITY' : 'OBSERVE',
            argumentsHash: '',
            policyDecision: eventType.includes('COMMITTED') ? 'PERMIT' : 'DENY',
            executionStatus: eventType.includes('COMMITTED') ? 'SUCCESS' : 'FAILURE',
            resultHash: metadata.commitProvenanceHash ?? '',
            actor: {
                userId: 'agent_durable_commit_runtime',
                role: 'SYSTEM',
                channel: 'DURABLE_COMMIT',
            },
            tenantId,
            metadata: sanitizedMetadata,
        });
    }
    /**
     * EN: Primary execution entrypoint: commits verified reality into durable state.
     * Throws typed errors on gate aborts, binding violations, stale versions, duplicate commits,
     * security violations, and unverified inputs.
     */
    async commitDurable(request) {
        const verification = request?.verificationResult;
        const task = request?.authoritativeTask;
        const gateContext = {
            taskId: task?.taskId ?? verification?.taskId,
            tenantId: task?.tenantId ?? verification?.tenantId,
            stepId: verification?.stepId,
            executionId: verification?.executionId,
            verificationId: verification?.verificationId,
        };
        // 1. Gate 1: Request Acceptance Checkpoint
        this.gate.assertGate1_RequestAcceptance(gateContext);
        // 2. Request Envelope Structural Validation
        this.validator.validateRequestEnvelope(request);
        // Record request audit
        this.recordAudit('DURABLE_COMMIT_REQUESTED', task.tenantId, {
            taskId: task.taskId,
            tenantId: task.tenantId,
            verificationId: verification.verificationId,
            stepId: verification.stepId,
            executionId: verification.executionId,
            taskVersion: task.version,
        });
        // 3. Reality Verification Authority Validation (VERIFIED & allRequiredPassed)
        this.validator.validateVerificationAuthority(verification);
        // 4. Multi-Tuple Bindings & Task Version Concurrency Validation
        this.validator.validateBindings(verification, task, request.commitContext, request.expectedTaskVersion);
        // 5. Gate 2: Pre-State Read / Duplicate Check
        this.gate.assertGate2_StateRead(gateContext);
        // 6. Compute Deterministic Commit ID & Replay Check
        const commitId = this.store.computeCommitId({
            taskId: task.taskId,
            tenantId: task.tenantId,
            stepId: verification.stepId,
            executionId: verification.executionId,
            verificationId: verification.verificationId,
            taskVersion: task.version,
        });
        if (this.store.hasCommit(task.tenantId, commitId)) {
            this.recordAudit('DURABLE_COMMIT_DUPLICATE_REJECTED', task.tenantId, {
                commitId,
                taskId: task.taskId,
                tenantId: task.tenantId,
                verificationId: verification.verificationId,
                stepId: verification.stepId,
                executionId: verification.executionId,
            });
            throw new DuplicateCommitError(`Commit '${commitId}' has already been persisted for tenant '${task.tenantId}'. Replay rejected.`, { commitId, taskId: task.taskId, tenantId: task.tenantId });
        }
        // 7. Prepare State Payload & Commit Provenance
        const committedAt = new Date().toISOString();
        const committedState = request.committedStateOverride ?? {
            verificationId: verification.verificationId,
            stepId: verification.stepId,
            executionId: verification.executionId,
            toolName: verification.toolName,
            status: verification.status,
            confidence: verification.confidence,
            summary: verification.summary,
            evidenceCount: verification.evidence.length,
            postconditionCount: verification.postconditionResults.length,
        };
        const commitProvenanceHash = this.calculateCommitProvenanceHash({
            verificationProvenanceHash: verification.verificationProvenanceHash,
            taskId: task.taskId,
            tenantId: task.tenantId,
            stepId: verification.stepId,
            executionId: verification.executionId,
            commitStatus: 'COMMITTED',
            committedState,
            committedAt,
        });
        const commitRecord = {
            commitId,
            taskId: task.taskId,
            tenantId: task.tenantId,
            stepId: verification.stepId,
            executionId: verification.executionId,
            verificationId: verification.verificationId,
            toolName: verification.toolName,
            committedState,
            taskVersion: task.version,
            status: 'COMMITTED',
            verificationProvenanceHash: verification.verificationProvenanceHash,
            commitProvenanceHash,
            committedAt,
        };
        // 8. Gate 3: Immediately before durable write
        this.gate.assertGate3_PreWrite({ ...gateContext, commitId });
        // 9. Atomic Persistence Write
        try {
            this.store.saveCommit(commitRecord);
        }
        catch (err) {
            this.recordAudit('DURABLE_COMMIT_PERSISTENCE_FAILED', task.tenantId, {
                commitId,
                taskId: task.taskId,
                tenantId: task.tenantId,
                error: err.message,
            });
            throw err;
        }
        // 10. Gate 4: After write and before result emission
        this.gate.assertGate4_PostWrite({ ...gateContext, commitId });
        // 11. Finalize Audit Logging
        this.recordAudit('DURABLE_COMMIT_COMMITTED', task.tenantId, {
            commitId,
            taskId: task.taskId,
            tenantId: task.tenantId,
            stepId: verification.stepId,
            executionId: verification.executionId,
            verificationId: verification.verificationId,
            commitProvenanceHash,
            committedAt,
        });
        // 12. Emit Sealed Deeply Immutable Result
        const result = {
            commitId,
            taskId: task.taskId,
            tenantId: task.tenantId,
            stepId: verification.stepId,
            executionId: verification.executionId,
            verificationId: verification.verificationId,
            status: 'COMMITTED',
            committedAt,
            record: commitRecord,
            verificationProvenanceHash: verification.verificationProvenanceHash,
            commitProvenanceHash,
        };
        return this.deepFreeze(result);
    }
    /**
     * EN: Safe execution wrapper: returns sealed DurableCommitResult without throwing.
     * Useful when callers require result inspection without exception handling.
     */
    async tryCommitDurable(request) {
        try {
            return await this.commitDurable(request);
        }
        catch (err) {
            const nowIso = new Date().toISOString();
            const task = request?.authoritativeTask;
            const verification = request?.verificationResult;
            let status = 'REJECTED';
            if (err instanceof CommitAbortedError) {
                status = 'USER_STOP_ABORTED';
            }
            else if (err instanceof DuplicateCommitError) {
                status = 'DUPLICATE_REJECTED';
            }
            else if (err instanceof StaleTaskCommitError) {
                status = 'STALE_REJECTED';
            }
            else if (err instanceof CommitSecurityViolationError || err instanceof CrossTenantCommitError) {
                status = 'SECURITY_REJECTED';
            }
            const commitProvenanceHash = this.calculateCommitProvenanceHash({
                verificationProvenanceHash: verification?.verificationProvenanceHash ?? '0'.repeat(64),
                taskId: task?.taskId ?? 'unknown_task',
                tenantId: task?.tenantId ?? 'unknown_tenant',
                stepId: verification?.stepId ?? 'unknown_step',
                executionId: verification?.executionId ?? 'unknown_execution',
                commitStatus: status,
                committedState: { error: err.message },
                committedAt: nowIso,
            });
            const failedResult = {
                commitId: 'commit_rejected',
                taskId: task?.taskId ?? verification?.taskId ?? 'unknown_task',
                tenantId: task?.tenantId ?? verification?.tenantId ?? 'unknown_tenant',
                stepId: verification?.stepId ?? 'unknown_step',
                executionId: verification?.executionId ?? 'unknown_execution',
                verificationId: verification?.verificationId ?? 'unknown_verification',
                status,
                committedAt: nowIso,
                failureReason: err.message,
                failure: {
                    category: err.code ?? err.name ?? 'COMMIT_ERROR',
                    message: err.message,
                    details: err.details,
                },
                verificationProvenanceHash: verification?.verificationProvenanceHash ?? '0'.repeat(64),
                commitProvenanceHash,
            };
            return this.deepFreeze(failedResult);
        }
    }
}
export const globalDurableCommitRuntime = new DurableCommitRuntime();
