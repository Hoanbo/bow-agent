// src/core/wire/wireMessageRouter.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Non-Cognitive Wire Message Router & Sequence Continuity Verifier.
//
// INVARIANTS:
// - Preserves messageId, sequence, risk level, correlationId, and 9-tuple scope.
// - Strictly non-cognitive: does not interpret natural language, call LLMs,
//   execute tools, or mutate Brain memory.
// - Rejects sequence rewind fail-closed.
// - Rejects replay attacks fail-closed.
import { WireTransportError } from './wireFailure.js';
export class WireMessageRouter {
    lastSeenSequence = new Map();
    seenMessageIds = new Set();
    maxSeenIds;
    constructor(maxSeenIds = 10000) {
        this.maxSeenIds = maxSeenIds;
    }
    /**
     * Routes an incoming or outbound envelope through the wire gateway.
     * Preserves all semantic properties while verifying sequence integrity.
     */
    route(envelope, options) {
        const sessionKey = `${envelope.sessionId}::${envelope.deviceId}`;
        // 1. Anti-Replay Check
        if (this.seenMessageIds.has(envelope.messageId)) {
            throw new WireTransportError('WIRE_REPLAY_DETECTED', `Replay attack detected: messageId "${envelope.messageId}" has already been processed.`);
        }
        // 2. Sequence Continuity Check
        const enforce = options?.enforceSequenceContinuity ?? true;
        if (enforce && envelope.sequence !== undefined) {
            const lastSeq = this.lastSeenSequence.get(sessionKey);
            if (lastSeq !== undefined) {
                if (envelope.sequence <= lastSeq) {
                    throw new WireTransportError('WIRE_SEQUENCE_REWIND', `Sequence rewind detected for session "${sessionKey}". Last=${lastSeq}, incoming=${envelope.sequence}. Blocked fail-closed.`);
                }
            }
            this.lastSeenSequence.set(sessionKey, envelope.sequence);
        }
        // Track seen ID (bounded set)
        if (this.seenMessageIds.size >= this.maxSeenIds) {
            const first = this.seenMessageIds.values().next().value;
            if (first)
                this.seenMessageIds.delete(first);
        }
        this.seenMessageIds.add(envelope.messageId);
        // Return frozen envelope with all metadata preserved exactly
        return Object.freeze({ ...envelope });
    }
    getLastSequence(sessionId, deviceId) {
        return this.lastSeenSequence.get(`${sessionId}::${deviceId}`);
    }
    reset(sessionId, deviceId) {
        if (sessionId && deviceId) {
            this.lastSeenSequence.delete(`${sessionId}::${deviceId}`);
        }
        else {
            this.lastSeenSequence.clear();
            this.seenMessageIds.clear();
        }
    }
}
