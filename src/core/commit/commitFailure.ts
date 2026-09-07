// src/core/commit/commitFailure.ts
// BOWCON V4.0 — MILESTONE 1.3.15: COMMIT FAILURE DESCRIPTOR
//
// EN:
// Constructs deterministic, secret-scrubbed commit failure descriptors.
//
// VI:
// Xây dựng các bộ mô tả lỗi commit tất định, đã được tẩy sạch bí mật.

import type { CommitFailureCategory, CommitFailure } from './commitTypes.js';
import { computeCommitFailureFingerprint } from './commitFingerprint.js';
import { redactCommitSecrets } from './commitValidator.js';

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
 * EN: Creates an immutable, secret-scrubbed CommitFailure descriptor.
 * VI: Tạo một bộ mô tả CommitFailure bất biến, đã được tẩy sạch bí mật.
 */
export function createCommitFailure(params: {
  userId: string;
  sessionId: string;
  category: CommitFailureCategory;
  message: string;
  recoverable?: boolean;
  details?: Readonly<Record<string, unknown>>;
}): Readonly<CommitFailure> {
  const sanitizedMessage = redactCommitSecrets(params.message);
  const fingerprint = computeCommitFailureFingerprint(
    params.userId,
    params.sessionId,
    params.category,
    sanitizedMessage,
  );

  const cleanDetails: Record<string, unknown> = {};
  if (params.details) {
    for (const [k, v] of Object.entries(params.details)) {
      cleanDetails[k] = typeof v === 'string' ? redactCommitSecrets(v) : v;
    }
  }

  const failure: CommitFailure = {
    category: params.category,
    message: sanitizedMessage,
    recoverable: params.recoverable ?? true,
    fingerprint,
    details: Object.freeze(cleanDetails),
  };

  return deepFreeze(failure);
}
