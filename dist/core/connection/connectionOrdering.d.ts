import type { ConnectionMessage } from './connectionMessage.js';
import type { ScopedConnectionIdentity } from './connectionTypes.js';
export type SequenceEvaluationResult = 'ACCEPT' | 'DUPLICATE' | 'STALE' | 'GAP' | 'REWIND' | 'CROSS_SCOPE_MISMATCH';
export declare class ConnectionSequenceTracker {
    private readonly expectedScope;
    private lastInboundSequence;
    private lastOutboundSequence;
    private readonly seenInboundFingerprints;
    constructor(expectedScope: ScopedConnectionIdentity, initialInboundSequence?: number, initialOutboundSequence?: number);
    getExpectedScope(): ScopedConnectionIdentity;
    getLastInboundSequence(): number;
    getLastOutboundSequence(): number;
    nextOutboundSequence(): number;
    /**
     * Evaluates an incoming message's sequence against current tracker state
     */
    evaluateInbound(message: ConnectionMessage): SequenceEvaluationResult;
    /**
     * Accepts and commits an incoming message sequence into the tracker
     */
    commitInbound(message: ConnectionMessage): void;
}
