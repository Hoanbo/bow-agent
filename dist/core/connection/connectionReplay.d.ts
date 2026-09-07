import type { ConnectionMessage } from './connectionMessage.js';
import type { ScopedConnectionIdentity } from './connectionTypes.js';
export type ConnectionReplayClassification = 'VALID_NEW_MESSAGE' | 'IDEMPOTENT_DUPLICATE' | 'STALE_MESSAGE' | 'MUTATED_REPLAY' | 'CROSS_SCOPE_REPLAY' | 'CONFLICTING_MESSAGE';
export type ReplayClassification = ConnectionReplayClassification;
export interface ConnectionReplayEvaluation {
    readonly classification: ConnectionReplayClassification;
    readonly reason?: string;
}
export type ReplayEvaluation = ConnectionReplayEvaluation;
export declare class ConnectionReplayDetector {
    private readonly expectedScope;
    private readonly historyBySequence;
    private readonly historyById;
    constructor(expectedScope: ScopedConnectionIdentity);
    /**
     * Evaluates an incoming message for replay attacks
     */
    evaluate(message: ConnectionMessage): ReplayEvaluation;
    /**
     * Records a validated message in the replay history
     */
    record(message: ConnectionMessage): void;
}
