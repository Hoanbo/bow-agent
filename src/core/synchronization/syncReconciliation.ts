// src/core/synchronization/syncReconciliation.ts
// BOWCON V4.0 — MILESTONE 1.3.18: STATE RECONCILIATION ENGINE
//
// EN:
// Authoritative deterministic state reconciliation. Compares incoming surface/external
// synchronization state against authoritative Brain state.
// Invariant: BRAIN AUTHORITY ALWAYS WINS RECONCILIATION.
//
// VI:
// Động cơ hòa giải trạng thái tất định có thẩm quyền. So sánh trạng thái đồng bộ hóa của bề mặt/bên ngoài
// gửi đến với trạng thái Não bộ có thẩm quyền.
// Bất biến: THẨM QUYỀN NÃO BỘ LUÔN CHIẾN THẮNG TRONG HÒA GIẢI.

import type { ReconciliationResult } from './syncTypes.js';
import { computeConflictFingerprint } from './eventFingerprint.js';
import { deepFreeze } from './eventEnvelope.js';

export interface AuthoritativeBrainState {
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly latestEventId?: string;
  readonly latestEventFingerprint?: string;
  readonly getEventBySequence?: (sequence: number) => { eventId: string; fingerprint: string } | undefined;
}

export interface IncomingSurfaceSyncState {
  readonly brainId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly sequence: number;
  readonly latestEventId: string;
  readonly latestEventFingerprint: string;
}

/**
 * EN: Reconciles incoming synchronization state against authoritative Brain state.
 * VI: Hòa giải trạng thái đồng bộ hóa gửi đến so với trạng thái Não bộ có thẩm quyền.
 */
export function reconcileSynchronizationState(
  brainState: AuthoritativeBrainState,
  incomingState: IncomingSurfaceSyncState,
): ReconciliationResult {
  // 1. Scope mismatch check
  if (
    incomingState.userId !== brainState.userId ||
    incomingState.sessionId !== brainState.sessionId ||
    incomingState.brainId !== brainState.brainId
  ) {
    return deepFreeze({
      classification: 'CROSS_SCOPE',
      brainSequence: brainState.sequence,
      incomingSequence: incomingState.sequence,
      consistent: false,
      reason: `Cross-scope reconciliation rejected: incoming (${incomingState.userId}::${incomingState.sessionId}::${incomingState.brainId}) does not match authoritative Brain (${brainState.userId}::${brainState.sessionId}::${brainState.brainId}).`,
    });
  }

  // 2. Exactly equal sequence
  if (incomingState.sequence === brainState.sequence) {
    if (
      incomingState.latestEventFingerprint === brainState.latestEventFingerprint &&
      incomingState.latestEventId === brainState.latestEventId
    ) {
      return deepFreeze({
        classification: 'CONSISTENT',
        brainSequence: brainState.sequence,
        incomingSequence: incomingState.sequence,
        consistent: true,
        reason: `Synchronization states are perfectly consistent at sequence ${brainState.sequence}.`,
      });
    }

    const conflictFp = computeConflictFingerprint({
      brainId: brainState.brainId,
      sequence: brainState.sequence,
      existingEventId: brainState.latestEventId ?? 'none',
      incomingEventId: incomingState.latestEventId,
      reason: 'Fingerprint mismatch at identical sequence',
    });

    return deepFreeze({
      classification: 'CONFLICT',
      brainSequence: brainState.sequence,
      incomingSequence: incomingState.sequence,
      consistent: false,
      reason: `Conflict detected at sequence ${brainState.sequence}: Brain latest event "${brainState.latestEventId}" (${brainState.latestEventFingerprint}) differs from incoming "${incomingState.latestEventId}" (${incomingState.latestEventFingerprint}).`,
      conflictFingerprint: conflictFp,
    });
  }

  // 3. Incoming sequence is older than Brain sequence (Lagging / Stale surface)
  if (incomingState.sequence < brainState.sequence) {
    if (brainState.getEventBySequence) {
      const historical = brainState.getEventBySequence(incomingState.sequence);
      if (historical) {
        if (
          historical.eventId === incomingState.latestEventId &&
          historical.fingerprint === incomingState.latestEventFingerprint
        ) {
          return deepFreeze({
            classification: 'STALE',
            brainSequence: brainState.sequence,
            incomingSequence: incomingState.sequence,
            consistent: true, // Consistent with past Brain timeline, but lagging behind current sequence
            reason: `Incoming state is cleanly stale: matches Brain history at sequence ${incomingState.sequence}, but Brain has advanced to ${brainState.sequence}.`,
          });
        }

        const conflictFp = computeConflictFingerprint({
          brainId: brainState.brainId,
          sequence: incomingState.sequence,
          existingEventId: historical.eventId,
          incomingEventId: incomingState.latestEventId,
          reason: 'Historical divergence at past sequence',
        });

        return deepFreeze({
          classification: 'DIVERGED',
          brainSequence: brainState.sequence,
          incomingSequence: incomingState.sequence,
          consistent: false,
          reason: `Incoming state has diverged from Brain history at sequence ${incomingState.sequence}: historical Brain event "${historical.eventId}" differs from incoming "${incomingState.latestEventId}".`,
          conflictFingerprint: conflictFp,
        });
      }
    }

    return deepFreeze({
      classification: 'STALE',
      brainSequence: brainState.sequence,
      incomingSequence: incomingState.sequence,
      consistent: false,
      reason: `Incoming sequence ${incomingState.sequence} is older than Brain sequence ${brainState.sequence}.`,
    });
  }

  // 4. Incoming sequence is in the future (Brain sequence < incoming sequence)
  return deepFreeze({
    classification: 'GAP',
    brainSequence: brainState.sequence,
    incomingSequence: incomingState.sequence,
    consistent: false,
    reason: `Sequence gap: incoming state claims future sequence ${incomingState.sequence}, but authoritative Brain is at ${brainState.sequence}. Brain authority rejects unverified future state.`,
  });
}
