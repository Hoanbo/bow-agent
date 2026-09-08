// src/core/relay/relayResume.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// Controlled session resume and sequence continuity validation.
//
// INVARIANTS:
// - SESSION_RESUME != TASK_RESUME
// - Sequence rewind = REJECT
// - Sequence gap = REJECT
// - Stale resume token = REJECT

import * as crypto from 'node:crypto';
import type { RemoteSessionRecord } from './relaySession.js';

export class RelayResumeError extends Error {
  constructor(message: string) {
    super(`RELAY_RESUME_ERROR: ${message}`);
    this.name = 'RelayResumeError';
  }
}

export class RelayResumeCoordinator {
  private readonly validTokens = new Map<
    string,
    { token: string; issuedAt: number; expectedSeq: number; ttlMs: number }
  >();

  /**
   * Generates a deterministic resume token for an active session.
   */
  public generateResumeToken(
    session: RemoteSessionRecord,
    ttlMs: number = 60000,
    now: number = Date.now()
  ): string {
    const raw = `resume_${session.sessionId}_${session.getSequenceNumber()}_${session.createdAt}_${session.deviceId}`;
    const token = crypto.createHash('sha256').update(raw).digest('hex');

    this.validTokens.set(session.sessionId, {
      token,
      issuedAt: now,
      expectedSeq: session.getSequenceNumber(),
      ttlMs,
    });
    session.setResumeToken(token);
    return token;
  }

  /**
   * Validates a resume request with sequence continuity checks.
   */
  public validateResumeRequest(params: {
    sessionId: string;
    providedToken: string;
    clientLastAckSeq: number;
    clientNextSeq: number;
    now?: number;
  }): { valid: boolean; error?: string } {
    const now = params.now ?? Date.now();
    const entry = this.validTokens.get(params.sessionId);

    if (!entry) {
      throw new RelayResumeError(`NO_RESUME_TOKEN_FOUND: Session ${params.sessionId} has no active token.`);
    }

    if (now - entry.issuedAt > entry.ttlMs) {
      this.validTokens.delete(params.sessionId);
      throw new RelayResumeError('STALE_RESUME_TOKEN: Resume token has expired. Re-admission required.');
    }

    if (entry.token !== params.providedToken) {
      throw new RelayResumeError('RESUME_TOKEN_MISMATCH: Provided resume token is invalid.');
    }

    // Sequence rewind check
    if (params.clientNextSeq <= params.clientLastAckSeq) {
      throw new RelayResumeError(
        `SEQUENCE_REWIND_DETECTED: Next seq ${params.clientNextSeq} <= ack seq ${params.clientLastAckSeq}. Possible replay.`
      );
    }

    // Sequence gap check: client sequence cannot skip ahead of recorded session sequence + 1
    if (params.clientNextSeq > entry.expectedSeq + 1) {
      throw new RelayResumeError(
        `SEQUENCE_GAP_DETECTED: Next seq ${params.clientNextSeq} > expected ${entry.expectedSeq + 1}. Unacknowledged gap.`
      );
    }

    return { valid: true };
  }

  public invalidateToken(sessionId: string): void {
    this.validTokens.delete(sessionId);
  }

  public clear(): void {
    this.validTokens.clear();
  }
}
