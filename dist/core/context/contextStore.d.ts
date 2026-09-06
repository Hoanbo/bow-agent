import { ConversationTurn, ContextItem, CompactionState } from './conversationContext.js';
export interface ScopedSessionContext {
    userId: string;
    sessionId: string;
    turns: ConversationTurn[];
    items: ContextItem[];
    compactionState?: CompactionState;
    createdAt: number;
    updatedAt: number;
}
export declare class ContextStore {
    private partitions;
    /**
     * Builds and validates canonical partition key `${userId}::${sessionId}`.
     */
    buildPartitionKey(userId: string, sessionId: string): string;
    /**
     * Retrieves or creates a scoped session context.
     */
    getOrCreateContext(userId: string, sessionId: string): ScopedSessionContext;
    /**
     * Appends a conversation turn and associated context items to the scoped context.
     */
    appendTurn(userId: string, sessionId: string, turn: ConversationTurn, items?: ContextItem[]): void;
    /**
     * Retrieves a copy of the most recent turns up to the requested limit.
     */
    getRecentTurns(userId: string, sessionId: string, limit?: number): ConversationTurn[];
    /**
     * Retrieves all turns for the scoped context.
     */
    getAllTurns(userId: string, sessionId: string): ConversationTurn[];
    /**
     * Retrieves all context items for the scoped context.
     */
    getItems(userId: string, sessionId: string): ContextItem[];
    /**
     * Removes ephemeral context items from the scoped session.
     */
    removeEphemeralContext(userId: string, sessionId: string): void;
    /**
     * Replaces older turns with compacted state and summary.
     */
    replaceCompactedContext(userId: string, sessionId: string, compactedTurns: ConversationTurn[], compactionState: CompactionState): void;
    /**
     * Clears all context data for a specific user session.
     */
    clearSessionContext(userId: string, sessionId: string): void;
    /**
     * Checks if an active context partition exists.
     */
    hasSession(userId: string, sessionId: string): boolean;
    /**
     * Prunes stale partitions based on maxPartitions (LRU by updatedAt) or TTL (maxAgeMs).
     */
    prunePartitions(options?: {
        maxPartitions?: number;
        maxAgeMs?: number;
    }): number;
    /**
     * Serializes a scoped partition to JSON.
     */
    serialize(userId: string, sessionId: string): string;
    /**
     * Deserializes and restores a partition into the store with corruption detection and validation.
     */
    deserialize(serialized: string): ScopedSessionContext;
    /**
     * Safe recovery load: If data is corrupted, recovers with empty valid session rather than crashing.
     */
    safeLoad(userId: string, sessionId: string, serialized: string): ScopedSessionContext;
    /**
     * Total number of active partitions.
     */
    size(): number;
}
export declare const globalContextStore: ContextStore;
