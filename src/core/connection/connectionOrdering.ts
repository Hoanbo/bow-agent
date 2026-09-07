// src/core/connection/connectionOrdering.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Strict monotonic sequence tracking, gap detection, duplicate rejection,
// and cross-scope defense. No sequence rewind or silent resets.

import type { ConnectionMessage } from './connectionMessage.js';
import type { ScopedConnectionIdentity } from './connectionTypes.js';
import { assertConnectionScopeMatch } from './connectionScope.js';

export type SequenceEvaluationResult =
  | 'ACCEPT'
  | 'DUPLICATE'
  | 'STALE'
  | 'GAP'
  | 'REWIND'
  | 'CROSS_SCOPE_MISMATCH';

export class ConnectionSequenceTracker {
  private lastInboundSequence = 0;
  private lastOutboundSequence = 0;
  private readonly seenInboundFingerprints = new Set<string>();

  constructor(
    private readonly expectedScope: ScopedConnectionIdentity,
    initialInboundSequence = 0,
    initialOutboundSequence = 0
  ) {
    this.lastInboundSequence = initialInboundSequence;
    this.lastOutboundSequence = initialOutboundSequence;
  }

  public getExpectedScope(): ScopedConnectionIdentity {
    return this.expectedScope;
  }

  public getLastInboundSequence(): number {
    return this.lastInboundSequence;
  }

  public getLastOutboundSequence(): number {
    return this.lastOutboundSequence;
  }

  public nextOutboundSequence(): number {
    this.lastOutboundSequence += 1;
    return this.lastOutboundSequence;
  }

  /**
   * Evaluates an incoming message's sequence against current tracker state
   */
  public evaluateInbound(message: ConnectionMessage): SequenceEvaluationResult {
    // 1. Cross-scope check (user, session, brain, surface, transport, gateway, adapter, connection)
    try {
      assertConnectionScopeMatch(this.expectedScope, message.scopeIdentity);
    } catch {
      return 'CROSS_SCOPE_MISMATCH';
    }

    // 2. Duplicate fingerprint check
    if (this.seenInboundFingerprints.has(message.fingerprint)) {
      return 'DUPLICATE';
    }

    const expectedNext = this.lastInboundSequence + 1;

    // 3. Monotonic sequence check
    if (message.sequence === expectedNext) {
      return 'ACCEPT';
    }

    if (message.sequence <= this.lastInboundSequence) {
      return message.sequence === this.lastInboundSequence ? 'DUPLICATE' : 'STALE';
    }

    // message.sequence > expectedNext
    return 'GAP';
  }

  /**
   * Accepts and commits an incoming message sequence into the tracker
   */
  public commitInbound(message: ConnectionMessage): void {
    const evalResult = this.evaluateInbound(message);
    if (evalResult === 'CROSS_SCOPE_MISMATCH') {
      throw new Error(`[CONNECTION_SCOPE_MISMATCH] Inbound message scope does not match tracker scope`);
    }
    if (evalResult === 'DUPLICATE' || evalResult === 'STALE') {
      throw new Error(`[CONNECTION_DUPLICATE_MESSAGE] Duplicate or stale sequence: received ${message.sequence}, current ${this.lastInboundSequence}`);
    }
    if (evalResult === 'GAP') {
      throw new Error(`[CONNECTION_SEQUENCE_GAP] Sequence gap detected: expected ${this.lastInboundSequence + 1}, received ${message.sequence}`);
    }
    if (evalResult === 'REWIND') {
      throw new Error(`[CONNECTION_SEQUENCE_REWIND] Sequence rewind forbidden: received ${message.sequence}, current ${this.lastInboundSequence}`);
    }

    this.lastInboundSequence = message.sequence;
    this.seenInboundFingerprints.add(message.fingerprint);
  }
}
