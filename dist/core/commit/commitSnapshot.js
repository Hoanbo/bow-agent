// src/core/commit/commitSnapshot.ts
// BOWCON V4.0 — MILESTONE 1.3.15: IMMUTABLE COMMIT SNAPSHOT ENGINE
//
// EN:
// Creates deeply immutable pre-commit and post-commit state snapshots.
// Guarantees zero direct durable memory mutation during snapshot creation.
//
// VI:
// Tạo các ảnh chụp trạng thái trước và sau commit bất biến sâu.
// Bảo đảm tuyệt đối không đột biến bộ nhớ bền vững trong quá trình tạo snapshot.
import { computePreCommitSnapshotFingerprint, computePostCommitSnapshotFingerprint, } from './commitFingerprint.js';
import { validateCommitScope, redactCommitSecrets } from './commitValidator.js';
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
 * EN: Creates an immutable PreCommitSnapshot representing state immediately before commit execution.
 * VI: Tạo một PreCommitSnapshot bất biến đại diện cho trạng thái ngay trước khi thực thi commit.
 */
export function createPreCommitSnapshot(params) {
    validateCommitScope(params.userId, params.sessionId);
    const stateFingerprint = computePreCommitSnapshotFingerprint(params.userId, params.sessionId, params.currentState, params.sequence, params.verificationFingerprint);
    const cleanMetadata = {};
    if (params.metadata) {
        for (const [k, v] of Object.entries(params.metadata)) {
            cleanMetadata[k] = typeof v === 'string' ? redactCommitSecrets(v) : v;
        }
    }
    const snapshot = {
        snapshotId: stateFingerprint,
        userId: params.userId,
        sessionId: params.sessionId,
        currentState: params.currentState,
        sequence: params.sequence,
        correlationId: params.correlationId,
        decisionId: params.decisionId,
        executionId: params.executionId,
        verificationId: params.verificationId,
        verificationFingerprint: params.verificationFingerprint,
        stateFingerprint,
        metadata: Object.freeze(cleanMetadata),
        createdAt: params.timestamp || '2026-09-07T00:00:00.000Z',
    };
    return deepFreeze(snapshot);
}
/**
 * EN: Creates an immutable PostCommitSnapshot representing state after commit persistence.
 * VI: Tạo một PostCommitSnapshot bất biến đại diện cho trạng thái sau khi lưu trữ commit.
 */
export function createPostCommitSnapshot(params) {
    validateCommitScope(params.userId, params.sessionId);
    const commitFingerprint = computePostCommitSnapshotFingerprint(params.userId, params.sessionId, params.committedState, params.sequence, params.commitId);
    const cleanMetadata = {};
    if (params.metadata) {
        for (const [k, v] of Object.entries(params.metadata)) {
            cleanMetadata[k] = typeof v === 'string' ? redactCommitSecrets(v) : v;
        }
    }
    const snapshot = {
        snapshotId: commitFingerprint,
        userId: params.userId,
        sessionId: params.sessionId,
        committedState: params.committedState,
        sequence: params.sequence,
        commitId: params.commitId,
        commitFingerprint,
        appliedOperations: Object.freeze([...params.appliedOperations]),
        metadata: Object.freeze(cleanMetadata),
        committedAt: params.timestamp || '2026-09-07T00:00:00.000Z',
    };
    return deepFreeze(snapshot);
}
