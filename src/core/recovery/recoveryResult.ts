// src/core/recovery/recoveryResult.ts
// BOWCON V4.0 — MILESTONE 1.3.16: IMMUTABLE RECOVERY RESULT FACTORY
//
// EN:
// Authoritative factory functions for creating deeply immutable RecoveryResult,
// ReconstructedState, and RecoveryFailure objects.
//
// VI:
// Các hàm factory có thẩm quyền để tạo ra các đối tượng RecoveryResult,
// ReconstructedState và RecoveryFailure bất biến sâu.

import type {
  RecoveryResult,
  ReconstructedState,
  RecoveryFailure,
  RecoveryState,
  RecoveryDecision,
  InterruptedOperationClassification,
  CrashConsistencyCondition,
  LastKnownGoodState,
  RecoveryJournalRecord,
  RecoveryFailureCategory,
} from './recoveryTypes.js';
import {
  computeCrashRecoveryFingerprint,
  computeRecoveryFailureFingerprint,
} from './recoveryFingerprint.js';
import { redactRecoverySecrets } from './recoveryValidator.js';

/**
 * EN: Deep freezes an object recursively.
 * VI: Đóng băng sâu một đối tượng một cách đệ quy.
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

/**
 * EN: Creates an immutable RecoveryFailure descriptor with secret redaction.
 * VI: Tạo một bộ mô tả sự cố RecoveryFailure bất biến với cơ chế che giấu bí mật.
 */
export function createRecoveryFailure(
  category: RecoveryFailureCategory,
  rawMessage: string,
  userId: string,
  sessionId: string,
  recoverable = false,
  details?: Readonly<Record<string, unknown>>,
): RecoveryFailure {
  const sanitizedMessage = redactRecoverySecrets(rawMessage);
  const fingerprint = computeRecoveryFailureFingerprint(category, sanitizedMessage, userId, sessionId);

  return deepFreeze({
    category,
    message: sanitizedMessage,
    fingerprint,
    timestamp: Date.now(),
    recoverable,
    details: details ? deepFreeze({ ...details }) : undefined,
  });
}

/**
 * EN: Creates a deeply immutable RecoveryResult object.
 * VI: Tạo một đối tượng RecoveryResult bất biến sâu.
 */
export function createRecoveryResult(
  recoveryId: string,
  userId: string,
  sessionId: string,
  state: RecoveryState,
  decision: RecoveryDecision,
  classification: InterruptedOperationClassification,
  crashCondition: CrashConsistencyCondition,
  reconstructedState: ReconstructedState,
  lastKnownGoodState: LastKnownGoodState | null,
  journal: readonly RecoveryJournalRecord[],
  failure?: RecoveryFailure,
): RecoveryResult {
  const fingerprint = computeCrashRecoveryFingerprint(
    userId,
    sessionId,
    recoveryId,
    state,
    decision,
    classification,
  );

  return deepFreeze({
    recoveryId,
    userId,
    sessionId,
    state,
    decision,
    classification,
    crashCondition,
    reconstructedState: deepFreeze({ ...reconstructedState }),
    lastKnownGoodState: lastKnownGoodState ? deepFreeze({ ...lastKnownGoodState }) : null,
    failure: failure ? deepFreeze({ ...failure }) : undefined,
    journal: Object.freeze([...journal]),
    fingerprint,
    timestamp: Date.now(),
  });
}
