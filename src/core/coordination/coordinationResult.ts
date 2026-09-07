// src/core/coordination/coordinationResult.ts
// BOWCON V4.0 — MILESTONE 1.3.17: IMMUTABLE COORDINATION RESULTS
//
// EN:
// Authoritative factory for deeply frozen CoordinationRecord and CoordinationFailure objects.
// Sanitizes secrets and guarantees 100% defensive immutability.
//
// VI:
// Factory có thẩm quyền cho các đối tượng CoordinationRecord và CoordinationFailure được đóng băng sâu.
// Khử trùng bí mật và bảo đảm tính bất biến phòng thủ 100%.

import type {
  CoordinationRecord,
  CoordinationFailure,
  CoordinationFailureCategory,
  ActiveSurface,
} from './coordinationTypes.js';
import {
  computeCoordinationRecordFingerprint,
  computeCoordinationFailureFingerprint,
} from './coordinationFingerprint.js';
import { redactCoordinationSecrets } from './coordinationValidator.js';

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
 * EN: Creates an immutable CoordinationRecord.
 * VI: Tạo một CoordinationRecord bất biến.
 */
export function createCoordinationRecord(
  brainId: string,
  userId: string,
  sessionId: string,
  sequence: number,
  action: string,
  status: string,
  activeSurfaces: readonly ActiveSurface[],
  metadata?: Readonly<Record<string, unknown>>,
): CoordinationRecord {
  const recordId = `coord_rec_${brainId}_${sequence}`;
  const fingerprint = computeCoordinationRecordFingerprint(recordId, brainId, sequence, action);

  return deepFreeze({
    recordId,
    brainId,
    userId,
    sessionId,
    sequence,
    action,
    status,
    activeSurfaces: Object.freeze([...activeSurfaces]),
    fingerprint,
    timestamp: Date.now(),
    metadata: metadata ? deepFreeze({ ...metadata }) : undefined,
  });
}

/**
 * EN: Creates an immutable CoordinationFailure descriptor with secret redaction.
 * VI: Tạo một bộ mô tả sự cố CoordinationFailure bất biến với cơ chế che giấu bí mật.
 */
export function createCoordinationFailure(
  category: CoordinationFailureCategory,
  rawMessage: string,
  brainId: string,
  userId: string,
  details?: Readonly<Record<string, unknown>>,
): CoordinationFailure {
  const sanitizedMessage = redactCoordinationSecrets(rawMessage);
  const fingerprint = computeCoordinationFailureFingerprint(category, sanitizedMessage, brainId, userId);

  return deepFreeze({
    category,
    message: sanitizedMessage,
    fingerprint,
    timestamp: Date.now(),
    details: details ? deepFreeze({ ...details }) : undefined,
  });
}
