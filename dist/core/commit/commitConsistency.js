// src/core/commit/commitConsistency.ts
// BOWCON V4.0 — MILESTONE 1.3.15: COMMIT CONSISTENCY ENGINE
//
// EN:
// Authoritative State Consistency Evaluator comparing pre-commit and post-commit state.
// Detects partial commits, sequence deviations, identity mismatches, and governance tampering.
//
// VI:
// Bộ Đánh giá Tính Nhất quán Trạng thái có thẩm quyền so sánh trạng thái trước và sau commit.
// Phát hiện commit một phần, sai lệch chuỗi tuần tự, không khớp định danh và can thiệp quản trị.
import { computeCommitConsistencyFingerprint } from './commitFingerprint.js';
/**
 * EN: Deeply freezes an object and its properties.
 * VI: Đóng băng sâu một đối tượng và các thuộc tính của nó.
 */
function deepFreeze(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        const value = obj[name];
        if (value && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    }
    return Object.freeze(obj);
}
/**
 * EN: Evaluates mutual state consistency across pre-commit, post-commit, and commit plan.
 * VI: Đánh giá tính nhất quán trạng thái tương hỗ giữa pre-commit, post-commit và kế hoạch commit.
 */
export function evaluateCommitConsistency(preSnapshot, postSnapshot, plan) {
    const issues = [];
    const details = [];
    // Check 1: Post-commit snapshot presence
    if (!postSnapshot) {
        issues.push('EXPECTED_STATE_MISSING');
        details.push('Post-commit snapshot is missing: durable state could not be verified');
        const fp = computeCommitConsistencyFingerprint(false, issues);
        return deepFreeze({ consistent: false, issues: Object.freeze(issues), details: Object.freeze(details), fingerprint: fp });
    }
    // Check 2: User and Session Scope Mismatch
    if (preSnapshot.userId !== postSnapshot.userId) {
        issues.push('USER_SCOPE_MISMATCH');
        details.push(`User mismatch: pre "${preSnapshot.userId}" vs post "${postSnapshot.userId}"`);
    }
    if (preSnapshot.sessionId !== postSnapshot.sessionId) {
        issues.push('SESSION_SCOPE_MISMATCH');
        details.push(`Session mismatch: pre "${preSnapshot.sessionId}" vs post "${postSnapshot.sessionId}"`);
    }
    // Check 3: Sequence Mismatch (expected sequence: pre.sequence + 1 or equal for atomic step)
    if (postSnapshot.sequence < preSnapshot.sequence) {
        issues.push('SEQUENCE_MISMATCH');
        details.push(`Sequence regression: pre ${preSnapshot.sequence} vs post ${postSnapshot.sequence}`);
    }
    // Check 4: Identity Mismatch
    if (plan) {
        if (plan.userId !== postSnapshot.userId || plan.sessionId !== postSnapshot.sessionId) {
            issues.push('IDENTITY_MISMATCH');
            details.push('Plan identity does not match post-commit tenant identity');
        }
        if (plan.verificationId !== preSnapshot.verificationId) {
            issues.push('VERIFICATION_MISMATCH');
            details.push('Plan verificationId does not match pre-commit verificationId');
        }
        if (plan.planId !== postSnapshot.commitId) {
            issues.push('COMMIT_FINGERPRINT_MISMATCH');
            details.push(`Commit ID mismatch: plan "${plan.planId}" vs post "${postSnapshot.commitId}"`);
        }
        // Check 5: Partial Commit Detection
        if (plan.operations.length > 0) {
            const planOpIds = new Set(plan.operations.map(o => o.operationId));
            const appliedOpIds = new Set(postSnapshot.appliedOperations);
            for (const opId of planOpIds) {
                if (!appliedOpIds.has(opId)) {
                    issues.push('PARTIAL_COMMIT');
                    details.push(`Operation "${opId}" was not confirmed in post-commit applied list`);
                    break;
                }
            }
        }
    }
    // Check 6: Committed State Verification
    if (!postSnapshot.committedState || postSnapshot.committedState === 'UNKNOWN') {
        issues.push('UNKNOWN_COMMIT_STATE');
        details.push('Post-commit state reported unknown or undefined');
    }
    const consistent = issues.length === 0;
    if (consistent) {
        issues.push('STATE_MATCH');
        details.push('All state consistency assertions passed cleanly');
    }
    const fingerprint = computeCommitConsistencyFingerprint(consistent, issues);
    return deepFreeze({
        consistent,
        issues: Object.freeze(issues),
        details: Object.freeze(details),
        fingerprint,
    });
}
