import { ConversationTurn, ContextItem, CompactionState, ContextConfig } from './conversationContext.js';
export interface CompactionResult {
    compactedTurns: ConversationTurn[];
    compactionState: CompactionState;
    purgedTurnCount: number;
}
export declare class ContextCompactor {
    /**
     * Evaluates whether a set of turns requires compaction against configured thresholds.
     */
    needsCompaction(turns: ConversationTurn[], config?: Required<ContextConfig>): boolean;
    /**
     * Deterministically compacts conversation turns when thresholds are exceeded.
     */
    compactTurns(turns: ConversationTurn[], items?: ContextItem[], config?: Required<ContextConfig>): CompactionResult;
}
export declare const globalContextCompactor: ContextCompactor;
