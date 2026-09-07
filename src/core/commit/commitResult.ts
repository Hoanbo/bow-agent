// src/core/commit/commitResult.ts
// BOWCON V4.0 — MILESTONE 1.3.15: COMMIT RESULT FACTORY & IMMUTABILITY
//
// EN:
// Factory module creating deeply frozen, immutable CommitResult instances.
//
// VI:
// Module nhà máy tạo các thực thể CommitResult đóng băng sâu, bất biến.

import type { CommitResult } from './commitTypes.js';

/**
 * EN: Deeply freezes an object and its properties.
 * VI: Đóng băng sâu một đối tượng và các thuộc tính của nó.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    const value = (obj as any)[name];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}

/**
 * EN: Creates a deeply frozen, authoritative CommitResult.
 * VI: Tạo một CommitResult bất biến sâu, có thẩm quyền.
 */
export function createCommitResult(params: CommitResult): Readonly<CommitResult> {
  const result: CommitResult = {
    commitId: params.commitId,
    userId: params.userId,
    sessionId: params.sessionId,
    status: params.status,
    isReplay: params.isReplay,
    plan: deepFreeze(params.plan),
    postCommitSnapshot: params.postCommitSnapshot ? deepFreeze(params.postCommitSnapshot) : undefined,
    consistency: deepFreeze(params.consistency),
    failure: params.failure ? deepFreeze(params.failure) : undefined,
    rollback: params.rollback ? deepFreeze(params.rollback) : undefined,
    fingerprint: params.fingerprint,
    committedAt: params.committedAt,
  };

  return deepFreeze(result);
}
