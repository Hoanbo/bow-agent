// src/core/recovery/recoveryService.ts
// BOWCON V4.0 — MILESTONE 1.3.16: BRAIN RECOVERY SERVICE
//
// EN:
// Central orchestrator for the Brain Recovery & Crash Consistency subsystem.
// Inspects in-flight and durable state post-crash, reconstructs the authoritative state,
// validates crash consistency, enforces multi-tenant isolation, and produces an immutable RecoveryResult.
//
// VI:
// Bộ điều phối trung tâm cho phân hệ Phục hồi Não bộ & Tính Nhất quán Sự cố.
// Kiểm tra trạng thái đang diễn ra và bền vững sau sự cố, tái thiết lập trạng thái có thẩm quyền,
// xác thực tính nhất quán sự cố, thực thi cô lập multi-tenant và tạo ra RecoveryResult bất biến.
import { assertValidRecoveryTransition } from './recoveryTransitions.js';
import { computeRecoveryId, computeReconstructedStateFingerprint, } from './recoveryFingerprint.js';
import { validateRecoveryScope, hasRecoveryPrototypePollution, containsRecoverySecret, assertRecoveryRiskPreservation, } from './recoveryValidator.js';
import { resolveLastKnownGoodState } from './recoveryCheckpoint.js';
import { RecoveryJournal } from './recoveryJournal.js';
import { evaluateCrashConsistency } from './recoveryConsistency.js';
import { classifyInterruptedOperation, evaluateApprovalRecoveryStatus, } from './recoveryClassifier.js';
import { determineRecoveryDecision } from './recoveryDecision.js';
import { createRecoveryResult, createRecoveryFailure, } from './recoveryResult.js';
/**
 * EN: Authoritative recovery service for the BOWCON Brain.
 * VI: Dịch vụ phục hồi có thẩm quyền cho BOWCON Brain.
 */
export class RecoveryService {
    journals = new Map();
    lastResults = new Map();
    getPartitionKey(userId, sessionId) {
        return `${userId}::${sessionId}`;
    }
    getOrCreateJournal(userId, sessionId) {
        const key = this.getPartitionKey(userId, sessionId);
        let journal = this.journals.get(key);
        if (!journal) {
            journal = new RecoveryJournal(userId, sessionId);
            this.journals.set(key, journal);
        }
        return journal;
    }
    /**
     * EN: Executes post-crash recovery inspection, state reconstruction, and safety classification.
     * VI: Thực thi kiểm tra phục hồi sau sự cố, tái thiết lập trạng thái và phân loại an toàn.
     */
    async recover(request) {
        const { userId, sessionId } = request;
        // 1. Security & Scope Validation
        validateRecoveryScope(userId, sessionId);
        if (hasRecoveryPrototypePollution(request)) {
            throw new Error('PROTOTYPE_POLLUTION: Recovery request contains disallowed prototype pollution keys');
        }
        if (containsRecoverySecret(request.requestId) || containsRecoverySecret(request.correlationId)) {
            throw new Error('SECRET_DETECTED: Recovery request contains unscrubbed credentials or secrets');
        }
        const journal = this.getOrCreateJournal(userId, sessionId);
        const primaryCheckpoint = request.checkpoints && request.checkpoints.length > 0
            ? request.checkpoints[request.checkpoints.length - 1]
            : undefined;
        const recoveryId = computeRecoveryId(userId, sessionId, primaryCheckpoint?.checkpointId, request.requestId);
        let currentState = 'RECOVERY_REQUIRED';
        journal.record(recoveryId, 'RECOVERY_STARTED', currentState, {
            requestId: request.requestId,
            activeState: request.activeLifecycleState,
        });
        try {
            // 2. State Inspection
            assertValidRecoveryTransition(currentState, 'RECOVERY_INSPECTING');
            currentState = 'RECOVERY_INSPECTING';
            journal.record(recoveryId, 'STATE_INSPECTED', currentState, {
                checkpointsCount: request.checkpoints?.length ?? 0,
                hasVerification: !!request.verificationRecord,
                hasCommit: !!request.commitRecord,
            });
            // 3. State Reconstruction & Checkpoint Selection
            assertValidRecoveryTransition(currentState, 'RECOVERY_RECONSTRUCTING');
            currentState = 'RECOVERY_RECONSTRUCTING';
            const lkgs = resolveLastKnownGoodState(userId, sessionId, request.checkpoints, request.commitRecord, request.verificationRecord);
            journal.record(recoveryId, 'CHECKPOINT_SELECTED', currentState, {
                selectedCheckpointId: lkgs?.checkpointId,
                lkgsSequence: lkgs?.sequence,
            });
            // 4. Consistency Evaluation
            const consistency = evaluateCrashConsistency(request.activeLifecycleState, request.checkpoints, request.verificationRecord, request.commitRecord);
            journal.record(recoveryId, 'CONSISTENCY_EVALUATED', currentState, {
                condition: consistency.condition,
                isConsistent: consistency.isConsistent,
            });
            // 5. Validation & Safety Classification
            assertValidRecoveryTransition(currentState, 'RECOVERY_VALIDATING');
            currentState = 'RECOVERY_VALIDATING';
            const approvalStatus = evaluateApprovalRecoveryStatus(request.approvalMetadata, request.activeLifecycleState);
            const classification = classifyInterruptedOperation(consistency.condition, request.activeLifecycleState, request.risk || 'LOW', approvalStatus, request.commitRecord?.isPartial);
            journal.record(recoveryId, 'CLASSIFICATION_DETERMINED', currentState, {
                classification,
                approvalStatus,
            });
            // 6. Decision Determination
            const decision = determineRecoveryDecision(classification, approvalStatus, request.risk || 'LOW');
            journal.record(recoveryId, 'DECISION_RECORDED', currentState, {
                decision,
            });
            // 7. Transition to Resumable, Stopped, or Blocked
            if (decision === 'BLOCK_RECOVERY' || decision === 'REQUIRE_OPERATOR_INTERVENTION') {
                assertValidRecoveryTransition(currentState, 'RECOVERY_BLOCKED');
                currentState = 'RECOVERY_BLOCKED';
            }
            else if (decision === 'SAFE_TO_READY' || decision === 'SAFE_TO_RESUME') {
                assertValidRecoveryTransition(currentState, 'RECOVERY_RESUMABLE');
                currentState = 'RECOVERY_RESUMABLE';
                assertValidRecoveryTransition(currentState, 'RECOVERY_COMPLETED');
                currentState = 'RECOVERY_COMPLETED';
            }
            else {
                // Governance or verification required
                assertValidRecoveryTransition(currentState, 'RECOVERY_STOPPED');
                currentState = 'RECOVERY_STOPPED';
            }
            // Preserve risk level
            if (request.risk && lkgs?.metadata?.risk) {
                assertRecoveryRiskPreservation(lkgs.metadata.risk, request.risk);
            }
            // 8. Construct ReconstructedState
            const lifecycleState = request.activeLifecycleState || lkgs?.lifecycleState || 'READY';
            const stage = primaryCheckpoint?.stage || lkgs?.stage || 'INITIALIZATION';
            const sequence = primaryCheckpoint?.sequence || lkgs?.sequence || 0;
            const risk = request.risk || 'LOW';
            const reconstructedFingerprint = computeReconstructedStateFingerprint(userId, sessionId, lifecycleState, sequence, consistency.condition, classification, risk);
            const reconstructedState = {
                userId,
                sessionId,
                correlationId: request.correlationId || 'NONE',
                requestId: request.requestId,
                lastDurableCheckpointId: lkgs?.checkpointId,
                lifecycleState,
                stage,
                sequence,
                risk,
                governanceMetadata: request.governanceMetadata,
                approvalMetadata: request.approvalMetadata,
                approvalStatus,
                verificationEvidence: request.verificationRecord ? {
                    verificationId: request.verificationRecord.verificationId,
                    status: request.verificationRecord.status,
                    taskSucceeded: request.verificationRecord.taskSucceeded,
                    fingerprint: request.verificationRecord.fingerprint,
                } : undefined,
                commitEvidence: request.commitRecord ? {
                    commitId: request.commitRecord.commitId,
                    status: request.commitRecord.status,
                    isPartial: !!request.commitRecord.isPartial,
                    fingerprint: request.commitRecord.fingerprint,
                } : undefined,
                crashCondition: consistency.condition,
                classification,
                fingerprint: reconstructedFingerprint,
            };
            journal.record(recoveryId, 'RECOVERY_FINISHED', currentState, {
                decision,
                classification,
            });
            const result = createRecoveryResult(recoveryId, userId, sessionId, currentState, decision, classification, consistency.condition, reconstructedState, lkgs, journal.getEvents());
            this.lastResults.set(this.getPartitionKey(userId, sessionId), result);
            return result;
        }
        catch (err) {
            const failure = createRecoveryFailure('RECOVERY_INTERNAL_FAILURE', err?.message || 'Unknown internal recovery error', userId, sessionId, false, { error: err?.name });
            currentState = 'RECOVERY_FAILED';
            journal.record(recoveryId, 'RECOVERY_FINISHED', currentState, {
                failureMessage: failure.message,
            });
            const fallbackReconstructedState = {
                userId,
                sessionId,
                correlationId: request.correlationId || 'NONE',
                requestId: request.requestId,
                lifecycleState: request.activeLifecycleState || 'FAILED',
                stage: 'TERMINAL',
                sequence: 0,
                risk: request.risk || 'LOW',
                approvalStatus: 'APPROVAL_UNKNOWN',
                crashCondition: 'UNKNOWN_DURABLE_STATE',
                classification: 'UNKNOWN_STATE',
                fingerprint: 'rec_failed_fingerprint',
            };
            const failedResult = createRecoveryResult(recoveryId, userId, sessionId, currentState, 'BLOCK_RECOVERY', 'UNKNOWN_STATE', 'UNKNOWN_DURABLE_STATE', fallbackReconstructedState, null, journal.getEvents(), failure);
            this.lastResults.set(this.getPartitionKey(userId, sessionId), failedResult);
            return failedResult;
        }
    }
    /**
     * EN: Retrieves the most recent recovery result for a specific user and session.
     * VI: Lấy kết quả phục hồi gần đây nhất cho một người dùng và phiên cụ thể.
     */
    getLastRecoveryResult(userId, sessionId) {
        return this.lastResults.get(this.getPartitionKey(userId, sessionId));
    }
    /**
     * EN: Returns the immutable recovery journal for a specific user and session.
     * VI: Trả về nhật ký phục hồi bất biến cho một người dùng và phiên cụ thể.
     */
    getJournal(userId, sessionId) {
        const journal = this.journals.get(this.getPartitionKey(userId, sessionId));
        return journal ? journal.getEvents() : Object.freeze([]);
    }
    /**
     * EN: Resets recovery state and journal for a specific user and session.
     * VI: Đặt lại trạng thái phục hồi và nhật ký cho một người dùng và phiên cụ thể.
     */
    resetSessionRecovery(userId, sessionId) {
        const key = this.getPartitionKey(userId, sessionId);
        this.journals.delete(key);
        this.lastResults.delete(key);
    }
}
