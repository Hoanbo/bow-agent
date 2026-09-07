// src/core/transport/transportReplay.ts
// BOWCON V4.0 — MILESTONE 1.3.19: REPLAY PROTECTION & DUPLICATE DETECTION
//
// EN:
// Authoritative replay protection: classifies repeated identical messages as idempotent duplicates,
// detects mutated payloads on repeated sequence/ID as replay conflicts,
// and strictly rejects cross-scope (user/session/brain) replays. Fails closed.
//
// VI:
// Bảo vệ chống phát lại có thẩm quyền: phân loại thông điệp lặp lại giống hệt là trùng lặp bình ổn (idempotent),
// phát hiện payload bị thay đổi trên cùng sequence/ID là xung đột phát lại,
// và từ chối nghiêm ngặt việc phát lại xuyên phạm vi (người dùng/phiên/não bộ). Thất bại đóng an toàn.

import type { BrainTransportMessage } from './transportTypes.js';
import { deepFreeze } from './transportValidator.js';

export type ReplayClassification =
  | 'ACCEPTED_NEW'
  | 'IDEMPOTENT_DUPLICATE'
  | 'REPLAY_CONFLICT'
  | 'CROSS_SCOPE_REJECTED';

export interface ReplayAnalysisResult {
  readonly classification: ReplayClassification;
  readonly messageId: string;
  readonly originalMessageId?: string;
  readonly reason: string;
}

/**
 * EN: Analyzes an incoming message against message history and current connection scope.
 * VI: Phân tích thông điệp đến so với lịch sử thông điệp và phạm vi kết nối hiện tại.
 */
export function analyzeReplay(
  historyBySeq: ReadonlyMap<number, Readonly<BrainTransportMessage>>,
  historyById: ReadonlyMap<string, Readonly<BrainTransportMessage>>,
  incoming: Readonly<BrainTransportMessage>,
  expectedScopeKey: string,
): Readonly<ReplayAnalysisResult> {
  const incomingScopeKey = `${incoming.userId}::${incoming.sessionId}::${incoming.brainId}::${incoming.surfaceId}::${incoming.transportId}`;

  // 1. Cross-scope check (cross-user, cross-session, cross-brain, cross-surface, cross-transport)
  if (incomingScopeKey !== expectedScopeKey) {
    return deepFreeze({
      classification: 'CROSS_SCOPE_REJECTED',
      messageId: incoming.messageId,
      reason: `Message scope "${incomingScopeKey}" does not match connection scope "${expectedScopeKey}".`,
    });
  }

  // 2. Check by messageId
  const existingById = historyById.get(incoming.messageId);
  if (existingById) {
    // If fingerprints match, it's an identical idempotent replay
    if (existingById.fingerprint === incoming.fingerprint) {
      return deepFreeze({
        classification: 'IDEMPOTENT_DUPLICATE',
        messageId: incoming.messageId,
        originalMessageId: existingById.messageId,
        reason: 'Identical message received again; classified as idempotent duplicate.',
      });
    } else {
      // Same ID but different fingerprint -> mutated conflict
      return deepFreeze({
        classification: 'REPLAY_CONFLICT',
        messageId: incoming.messageId,
        originalMessageId: existingById.messageId,
        reason: 'Replay conflict: message received with identical ID but mutated content.',
      });
    }
  }

  // 3. Check by sequence number within this connection
  const existingBySeq = historyBySeq.get(incoming.sequence);
  if (existingBySeq) {
    if (existingBySeq.fingerprint === incoming.fingerprint) {
      return deepFreeze({
        classification: 'IDEMPOTENT_DUPLICATE',
        messageId: incoming.messageId,
        originalMessageId: existingBySeq.messageId,
        reason: `Identical message already processed at sequence ${incoming.sequence}.`,
      });
    } else {
      return deepFreeze({
        classification: 'REPLAY_CONFLICT',
        messageId: incoming.messageId,
        originalMessageId: existingBySeq.messageId,
        reason: `Replay conflict: sequence ${incoming.sequence} already used by another message with different fingerprint.`,
      });
    }
  }

  return deepFreeze({
    classification: 'ACCEPTED_NEW',
    messageId: incoming.messageId,
    reason: 'Message is new, valid in scope, and in order.',
  });
}
