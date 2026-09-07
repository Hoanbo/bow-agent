// src/core/commit/commitService.ts
// BOWCON V4.0 — MILESTONE 1.3.15: AUTHORITATIVE DURABLE COMMIT SERVICE
//
// EN:
// Authoritative Durable Commit & State Consistency Service for BOWCON BRAIN.
// Enforces: VERIFIED TASK != DURABLY COMMITTED STATE, atomic state commit modeling,
// pre/post-commit consistency evaluation, replay/conflict detection, and rollback metadata.
//
// VI:
// Dịch vụ Commit Bền vững & Tính Nhất quán Trạng thái có thẩm quyền cho BOWCON BRAIN.
// Thực thi: TÁC VỤ ĐÃ XÁC MINH != TRẠNG THÁI ĐÃ COMMIT BỀN VỮNG, mô hình hóa commit nguyên tử,
// đánh giá tính nhất quán trước/sau commit, phát hiện replay/xung đột và tạo metadata rollback.
import { createPreCommitSnapshot, createPostCommitSnapshot } from './commitSnapshot.js';
import { createCommitPlan } from './commitPlan.js';
import { evaluateCommitConsistency } from './commitConsistency.js';
import { createCommitFailure } from './commitFailure.js';
import { createRollbackMetadata } from './commitRollback.js';
import { createCommitResult } from './commitResult.js';
import { validateCommitScope, hasCommitPrototypePollution, assertCommitRiskPreservation, assertVerifiedForCommit, } from './commitValidator.js';
export class CommitService {
    historyStore = new Map();
    commitIndex = new Map();
    /**
     * EN: Returns the partition key for multi-tenant user/session scoping.
     * VI: Trả về khóa phân vùng để định phạm vi user/session multi-tenant.
     */
    getPartitionKey(userId, sessionId) {
        return `${userId}::${sessionId}`;
    }
    /**
     * EN: Computes a hash string representing the semantic operations payload.
     * VI: Tính toán chuỗi băm đại diện cho payload thao tác ngữ nghĩa.
     */
    computeOperationsHash(request) {
        return request.operations
            .map(op => `${op.operationId}:${op.type}:${op.targetDomain}:${JSON.stringify(op.payload)}`)
            .join('|');
    }
    /**
     * EN: Prepares, validates, and executes an atomic durable state commit.
     * VI: Chuẩn bị, xác thực và thực thi commit trạng thái nguyên tử bền vững.
     */
    commit(request) {
        const { userId, sessionId, verificationResult } = request;
        // 1. Multi-tenant Scope Validation
        validateCommitScope(userId, sessionId);
        // 2. Prototype Pollution Defense
        if (hasCommitPrototypePollution(request)) {
            const failure = createCommitFailure({
                userId,
                sessionId,
                category: 'COMMIT_VALIDATION_FAILURE',
                message: 'Prototype pollution detected in commit request payload',
                recoverable: false,
            });
            const preSnap = createPreCommitSnapshot({
                userId,
                sessionId,
                currentState: 'REJECTED',
                sequence: request.sequence ?? 0,
                verificationId: verificationResult?.verificationId || 'NONE',
                verificationFingerprint: verificationResult?.fingerprint || 'NONE',
                timestamp: request.timestamp,
            });
            const plan = createCommitPlan({
                userId,
                sessionId,
                verificationId: verificationResult?.verificationId || 'NONE',
                operations: [],
                riskLevel: request.verificationResult?.riskLevel || 'CRITICAL',
                preCommitSnapshot: preSnap,
                requestId: request.requestId,
            });
            return createCommitResult({
                commitId: plan.planId,
                userId,
                sessionId,
                status: 'REJECTED',
                isReplay: false,
                plan,
                consistency: {
                    consistent: false,
                    issues: ['UNEXPECTED_STATE_CHANGE'],
                    details: ['Security violation: prototype pollution payload'],
                    fingerprint: 'cons_sec_fail',
                },
                failure,
                fingerprint: plan.fingerprint,
                committedAt: request.timestamp,
            });
        }
        // 3. Invariant 1, 2, 3: Verification Verification Assertions
        try {
            assertVerifiedForCommit(verificationResult);
        }
        catch (err) {
            const failure = createCommitFailure({
                userId,
                sessionId,
                category: 'COMMIT_VALIDATION_FAILURE',
                message: err?.message || 'Unverified state cannot be committed',
                recoverable: false,
            });
            const preSnap = createPreCommitSnapshot({
                userId,
                sessionId,
                currentState: 'REJECTED',
                sequence: request.sequence ?? 0,
                verificationId: verificationResult?.verificationId || 'NONE',
                verificationFingerprint: verificationResult?.fingerprint || 'NONE',
                timestamp: request.timestamp,
            });
            const plan = createCommitPlan({
                userId,
                sessionId,
                verificationId: verificationResult?.verificationId || 'NONE',
                operations: request.operations,
                riskLevel: verificationResult?.riskLevel || 'LOW',
                preCommitSnapshot: preSnap,
                requestId: request.requestId,
            });
            return createCommitResult({
                commitId: plan.planId,
                userId,
                sessionId,
                status: 'REJECTED',
                isReplay: false,
                plan,
                consistency: {
                    consistent: false,
                    issues: ['VERIFICATION_MISMATCH'],
                    details: [err?.message || 'Verification rejected'],
                    fingerprint: 'cons_ver_fail',
                },
                failure,
                fingerprint: plan.fingerprint,
                committedAt: request.timestamp,
            });
        }
        // 4. Pre-Commit Snapshot Capture
        const currentSeq = request.sequence ?? 0;
        const preSnapshot = createPreCommitSnapshot({
            userId,
            sessionId,
            currentState: 'COMMITTING',
            sequence: currentSeq,
            correlationId: request.correlationId,
            decisionId: request.decisionId,
            executionId: request.executionId,
            verificationId: verificationResult.verificationId,
            verificationFingerprint: verificationResult.fingerprint || verificationResult.verificationId,
            metadata: request.metadata,
            timestamp: request.timestamp,
        });
        // 5. Build Commit Plan & Risk Preservation
        const riskLevel = verificationResult.riskLevel || 'LOW';
        const plan = createCommitPlan({
            userId,
            sessionId,
            verificationId: verificationResult.verificationId,
            operations: request.operations,
            riskLevel,
            preCommitSnapshot: preSnapshot,
            requestId: request.requestId,
        });
        if (verificationResult.riskLevel) {
            assertCommitRiskPreservation(verificationResult.riskLevel, plan.riskLevel);
        }
        // 6. Idempotency & Replay Detection
        const partitionKey = this.getPartitionKey(userId, sessionId);
        const commitKey = `${partitionKey}::${plan.planId}`;
        const currentPayloadHash = this.computeOperationsHash(request);
        if (this.commitIndex.has(commitKey)) {
            const existing = this.commitIndex.get(commitKey);
            // Replayed commit with identical payload
            if (existing.payloadHash === currentPayloadHash) {
                return createCommitResult({
                    commitId: plan.planId,
                    userId,
                    sessionId,
                    status: 'ALREADY_COMMITTED',
                    isReplay: true,
                    plan: existing.result.plan,
                    postCommitSnapshot: existing.result.postCommitSnapshot,
                    consistency: existing.result.consistency,
                    fingerprint: plan.fingerprint,
                    committedAt: existing.result.committedAt,
                });
            }
            // Conflicting commit with identical ID but conflicting payload
            const failure = createCommitFailure({
                userId,
                sessionId,
                category: 'COMMIT_CONFLICT',
                message: 'Conflicting commit payload submitted with previously committed transaction identity',
                recoverable: false,
            });
            return createCommitResult({
                commitId: plan.planId,
                userId,
                sessionId,
                status: 'REJECTED',
                isReplay: false,
                plan,
                consistency: {
                    consistent: false,
                    issues: ['COMMIT_FINGERPRINT_MISMATCH'],
                    details: ['Conflicting commit payload detected'],
                    fingerprint: 'cons_conflict',
                },
                failure,
                fingerprint: plan.fingerprint,
                committedAt: request.timestamp,
            });
        }
        // 7. Atomic Execution Simulation & Applied Operations Accounting
        const appliedOperations = [];
        let partialFailure = false;
        for (const op of plan.operations) {
            // If an operation is explicitly marked applied: false in metadata or schema, flag partial commit
            if (op.applied === false) {
                partialFailure = true;
                break;
            }
            appliedOperations.push(op.operationId);
        }
        // 8. Capture Post-Commit Snapshot
        const postSnapshot = createPostCommitSnapshot({
            userId,
            sessionId,
            committedState: partialFailure ? 'PARTIAL_COMMIT' : 'COMMITTED',
            sequence: currentSeq + 1,
            commitId: plan.planId,
            appliedOperations,
            metadata: request.metadata,
            timestamp: request.timestamp,
        });
        // 9. Consistency Evaluation
        const consistency = evaluateCommitConsistency(preSnapshot, postSnapshot, plan);
        let status = 'COMMITTED';
        let failure = undefined;
        let rollback = undefined;
        if (!consistency.consistent || partialFailure) {
            if (consistency.issues.includes('PARTIAL_COMMIT') || partialFailure) {
                status = 'ROLLBACK_REQUIRED';
                failure = createCommitFailure({
                    userId,
                    sessionId,
                    category: 'COMMIT_PARTIAL_FAILURE',
                    message: 'Partial commit detected: not all planned atomic operations were confirmed',
                    recoverable: true,
                });
            }
            else {
                status = 'INCONSISTENT';
                failure = createCommitFailure({
                    userId,
                    sessionId,
                    category: 'COMMIT_CONSISTENCY_FAILURE',
                    message: `Commit consistency validation failed: ${consistency.issues.join(', ')}`,
                    recoverable: false,
                });
            }
            rollback = createRollbackMetadata({
                commitId: plan.planId,
                verificationId: verificationResult.verificationId,
                affectedState: postSnapshot.committedState,
                reason: failure.message,
                eligible: true,
                status: 'ROLLBACK_PENDING',
                timestamp: request.timestamp,
            });
        }
        const commitResult = createCommitResult({
            commitId: plan.planId,
            userId,
            sessionId,
            status,
            isReplay: false,
            plan,
            postCommitSnapshot: postSnapshot,
            consistency,
            failure,
            rollback,
            fingerprint: plan.fingerprint,
            committedAt: request.timestamp || '2026-09-07T00:00:00.000Z',
        });
        // 10. Record in session audit history & idempotency cache
        if (status === 'COMMITTED') {
            this.commitIndex.set(commitKey, {
                payloadHash: currentPayloadHash,
                result: commitResult,
            });
        }
        const history = this.historyStore.get(partitionKey) || [];
        history.push(commitResult);
        this.historyStore.set(partitionKey, history);
        return commitResult;
    }
    /**
     * EN: Retrieves immutable commit history for a given user and session.
     * VI: Truy xuất lịch sử commit bất biến cho user và phiên cụ thể.
     */
    getHistory(userId, sessionId) {
        validateCommitScope(userId, sessionId);
        const partitionKey = this.getPartitionKey(userId, sessionId);
        return Object.freeze([...(this.historyStore.get(partitionKey) || [])]);
    }
    /**
     * EN: Clears commit audit history for a specified session.
     * VI: Xóa lịch sử kiểm toán commit cho phiên được chỉ định.
     */
    clearSession(userId, sessionId) {
        validateCommitScope(userId, sessionId);
        const partitionKey = this.getPartitionKey(userId, sessionId);
        this.historyStore.delete(partitionKey);
    }
}
