// src/core/transport/transportIdentity.ts
// BOWCON V4.0 — MILESTONE 1.3.19: DETERMINISTIC TRANSPORT IDENTITY & SCOPE
//
// EN:
// Deterministic identity generation and scope isolation for Brain, Surface, Transport,
// Connection, and Session. Zero randomness.
//
// VI:
// Tạo định danh tất định và cô lập phạm vi cho Não bộ, Bề mặt, Truyền tải,
// Kết nối và Phiên làm việc. Không ngẫu nhiên.

import type { BrainTransportMessage } from './transportTypes.js';
import {
  computeConnectionFingerprint,
  computeSessionFingerprint,
} from './transportFingerprint.js';
import {
  validateTransportScope,
  validateTransportIdentifier,
} from './transportValidator.js';

export interface ScopedTransportIdentity {
  readonly userId: string;
  readonly sessionId: string;
  readonly brainId: string;
  readonly surfaceId: string;
  readonly transportId: string;
}

export interface ConnectionIdentityRecord {
  readonly connectionId: string;
  readonly scopeKey: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly brainId: string;
  readonly surfaceId: string;
  readonly transportId: string;
  readonly fingerprint: string;
}

/**
 * EN: Computes a deterministic ConnectionIdentityRecord from a 5-tuple scope.
 * VI: Tính toán một ConnectionIdentityRecord tất định từ phạm vi bộ 5.
 */
export function createConnectionIdentity(
  params: ScopedTransportIdentity,
): ConnectionIdentityRecord {
  const scope = validateTransportScope(params);
  const fingerprint = computeConnectionFingerprint(scope);
  const connectionId = `conn_${fingerprint}`;

  return Object.freeze({
    connectionId,
    scopeKey: scope.scopeKey,
    userId: scope.userId,
    sessionId: scope.sessionId,
    brainId: scope.brainId,
    surfaceId: scope.surfaceId,
    transportId: scope.transportId,
    fingerprint,
  });
}

/**
 * EN: Computes a deterministic transport session ID.
 * VI: Tính toán định danh phiên truyền tải tất định.
 */
export function computeTransportSessionId(
  connectionId: string,
  scopeKey: string,
  initialSequence = 1,
): string {
  const validConnId = validateTransportIdentifier('connectionId', connectionId);
  const fp = computeSessionFingerprint({
    connectionId: validConnId,
    scopeKey,
    initialSequence,
  });
  return `tsess_${fp}`;
}

/**
 * EN: Asserts that a transport message belongs strictly to the expected connection scope.
 * VI: Khẳng định rằng thông điệp truyền tải hoàn toàn thuộc về phạm vi kết nối dự kiến.
 */
export function assertScopeMatches(
  expectedScopeKey: string,
  message: BrainTransportMessage,
): void {
  const actualScopeKey = `${message.userId}::${message.sessionId}::${message.brainId}::${message.surfaceId}::${message.transportId}`;
  if (expectedScopeKey !== actualScopeKey) {
    throw new Error(
      `[TRANSPORT_SCOPE_ERROR] Scope mismatch! Expected "${expectedScopeKey}", but message has "${actualScopeKey}".`,
    );
  }
}
