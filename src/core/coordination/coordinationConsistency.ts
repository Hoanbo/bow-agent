// src/core/coordination/coordinationConsistency.ts
// BOWCON V4.0 — MILESTONE 1.3.17: SPLIT-BRAIN & STALE UPDATE PROTECTION
//
// EN:
// Authoritative consistency auditor for Brain Coordination.
// Detects split-brain divergence, stale sequence updates, and contradictory multi-surface states.
//
// VI:
// Bộ kiểm toán tính nhất quán có thẩm quyền cho Điều phối Não bộ.
// Phát hiện sự phân nhánh chia cắt não bộ (split-brain), cập nhật sequence cũ và các trạng thái đa bề mặt mâu thuẫn.

import type { ContinuityContext } from './coordinationTypes.js';

/**
 * EN: Detects if two continuity contexts represent a dangerous split-brain condition.
 * VI: Phát hiện xem hai ngữ cảnh liên tục có đại diện cho tình trạng chia cắt não bộ (split-brain) nguy hiểm hay không.
 */
export function detectSplitBrainConflict(
  current: ContinuityContext,
  incoming: ContinuityContext,
): { conflict: boolean; reason?: string } {
  // If identities match but continuity details diverge at same sequence
  if (
    current.brainId === incoming.brainId &&
    current.userId === incoming.userId &&
    current.sessionId === incoming.sessionId
  ) {
    if (current.sequence === incoming.sequence && current.fingerprint !== incoming.fingerprint) {
      return {
        conflict: true,
        reason: `SPLIT_BRAIN_DETECTED: Conflicting continuity states detected at sequence ${current.sequence}`,
      };
    }

    if (current.memoryNamespace !== incoming.memoryNamespace) {
      return {
        conflict: true,
        reason: `MEMORY_NAMESPACE_MISMATCH: Incompatible memory namespaces for same Brain and session: "${current.memoryNamespace}" vs "${incoming.memoryNamespace}"`,
      };
    }
  }

  // Cross-brain collision on same session
  if (
    current.userId === incoming.userId &&
    current.sessionId === incoming.sessionId &&
    current.brainId !== incoming.brainId
  ) {
    return {
      conflict: true,
      reason: `CROSS_BRAIN_COLLISION: Two different Brain identities claimed the same user session: "${current.brainId}" vs "${incoming.brainId}"`,
    };
  }

  return { conflict: false };
}

/**
 * EN: Detects if an incoming update is stale relative to current sequence.
 * VI: Phát hiện xem một cập nhật gửi đến có bị cũ so với sequence hiện tại hay không.
 */
export function detectStaleUpdate(currentSequence: number, incomingSequence: number): boolean {
  return incomingSequence <= currentSequence;
}
