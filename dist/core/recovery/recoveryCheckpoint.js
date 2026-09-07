// src/core/recovery/recoveryCheckpoint.ts
// BOWCON V4.0 — MILESTONE 1.3.16: LAST KNOWN GOOD STATE & CHECKPOINTS
//
// EN:
// Resolves the authoritative Last Known Good State (LKGS) from durable checkpoints.
// Distinguishes the latest ephemeral state from the last verified durable state.
//
// VI:
// Phân giải Trạng thái Tốt được Biết Cuối cùng (LKGS) có thẩm quyền từ các điểm kiểm tra bền vững.
// Phân biệt trạng thái tạm thời mới nhất với trạng thái bền vững đã được xác minh cuối cùng.
import { computeLastKnownGoodStateFingerprint } from './recoveryFingerprint.js';
const DURABLE_CLEAN_STATES = Object.freeze(new Set([
    'READY',
    'COMPLETED',
    'NO_ACTION',
]));
/**
 * EN: Deep freezes an object recursively.
 * VI: Đóng băng sâu một đối tượng một cách đệ quy.
 */
function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    }
    return obj;
}
/**
 * EN: Resolves the Last Known Good State from durable checkpoints and optional commit/verification records.
 * VI: Phân giải Trạng thái Tốt được Biết Cuối cùng từ các checkpoint bền vững và bản ghi commit/xác minh tùy chọn.
 */
export function resolveLastKnownGoodState(userId, sessionId, checkpoints, commitRecord, verificationRecord) {
    if (!checkpoints || checkpoints.length === 0) {
        return null;
    }
    // Filter checkpoints belonging strictly to the specified user and session
    const scopedCheckpoints = checkpoints
        .filter(cp => cp.userId === userId && cp.sessionId === sessionId)
        .sort((a, b) => a.sequence - b.sequence);
    if (scopedCheckpoints.length === 0) {
        return null;
    }
    // Iterate backwards from the most recent checkpoint to locate the last verified durable state
    let selectedCheckpoint = null;
    let isVerified = false;
    let isCommitted = false;
    for (let i = scopedCheckpoints.length - 1; i >= 0; i--) {
        const cp = scopedCheckpoints[i];
        // If checkpoint is in an inherently clean/stable durable state
        if (DURABLE_CLEAN_STATES.has(cp.state)) {
            selectedCheckpoint = cp;
            isVerified = true;
            isCommitted = true;
            break;
        }
        // If checkpoint is tied to a verified task with confirmed commit
        if (commitRecord &&
            (commitRecord.status === 'COMMITTED' || commitRecord.status === 'ALREADY_COMMITTED') &&
            !commitRecord.isPartial &&
            verificationRecord &&
            verificationRecord.status === 'VERIFIED' &&
            verificationRecord.taskSucceeded) {
            selectedCheckpoint = cp;
            isVerified = true;
            isCommitted = true;
            break;
        }
    }
    // If no durable clean state found in history, default to the earliest stable checkpoint (e.g. sequence 0 / READY)
    if (!selectedCheckpoint) {
        const initialReady = scopedCheckpoints.find(cp => cp.state === 'READY');
        if (initialReady) {
            selectedCheckpoint = initialReady;
            isVerified = true;
            isCommitted = true;
        }
        else {
            // Fall back to earliest valid checkpoint
            selectedCheckpoint = scopedCheckpoints[0];
            isVerified = false;
            isCommitted = false;
        }
    }
    const fingerprint = computeLastKnownGoodStateFingerprint(userId, sessionId, selectedCheckpoint.checkpointId, selectedCheckpoint.sequence, selectedCheckpoint.state);
    const lkgs = {
        checkpointId: selectedCheckpoint.checkpointId,
        userId,
        sessionId,
        sequence: selectedCheckpoint.sequence,
        lifecycleState: selectedCheckpoint.state,
        stage: selectedCheckpoint.stage,
        verified: isVerified,
        committed: isCommitted,
        timestamp: selectedCheckpoint.timestamp,
        fingerprint,
        metadata: selectedCheckpoint.safeMetadata,
    };
    return deepFreeze(lkgs);
}
