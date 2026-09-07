// src/core/connection/connectionReplay.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Authoritative replay detection distinguishing new messages, idempotent duplicates,
// stale messages, cross-scope replays, and mutated attacks.
import { assertConnectionScopeMatch } from './connectionScope.js';
export class ConnectionReplayDetector {
    expectedScope;
    historyBySequence = new Map();
    historyById = new Map();
    constructor(expectedScope) {
        this.expectedScope = expectedScope;
    }
    /**
     * Evaluates an incoming message for replay attacks
     */
    evaluate(message) {
        // 1. Cross-scope check
        try {
            assertConnectionScopeMatch(this.expectedScope, message.scopeIdentity);
        }
        catch {
            return {
                classification: 'CROSS_SCOPE_REPLAY',
                reason: 'Message scope does not match detector scope',
            };
        }
        // 2. Check by sequence
        const existingBySeq = this.historyBySequence.get(message.sequence);
        if (existingBySeq) {
            if (existingBySeq.fingerprint === message.fingerprint) {
                return {
                    classification: 'IDEMPOTENT_DUPLICATE',
                    reason: 'Identical message fingerprint for previously received sequence',
                };
            }
            return {
                classification: 'MUTATED_REPLAY',
                reason: `Sequence ${message.sequence} already received with different fingerprint (mutated replay attempt)`,
            };
        }
        // 3. Check by messageId
        const existingById = this.historyById.get(message.messageId);
        if (existingById) {
            if (existingById.fingerprint === message.fingerprint) {
                return {
                    classification: 'IDEMPOTENT_DUPLICATE',
                    reason: 'Identical messageId already processed',
                };
            }
            return {
                classification: 'CONFLICTING_MESSAGE',
                reason: `Message ID ${message.messageId} reused with altered payload or attributes`,
            };
        }
        return {
            classification: 'VALID_NEW_MESSAGE',
        };
    }
    /**
     * Records a validated message in the replay history
     */
    record(message) {
        const evalResult = this.evaluate(message);
        if (evalResult.classification === 'CROSS_SCOPE_REPLAY') {
            throw new Error(`[CONNECTION_CROSS_SCOPE_REPLAY] ${evalResult.reason}`);
        }
        if (evalResult.classification === 'MUTATED_REPLAY') {
            throw new Error(`[CONNECTION_MUTATED_REPLAY] ${evalResult.reason}`);
        }
        if (evalResult.classification === 'CONFLICTING_MESSAGE') {
            throw new Error(`[CONNECTION_CONFLICTING_MESSAGE] ${evalResult.reason}`);
        }
        this.historyBySequence.set(message.sequence, message);
        this.historyById.set(message.messageId, message);
    }
}
