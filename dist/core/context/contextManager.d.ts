import { ConversationTurn, ContextItem, ContextReference, ConversationContextSnapshot, ContextConfig } from './conversationContext.js';
import { ContextStore } from './contextStore.js';
import { TopicState } from './topicTracker.js';
export declare class ContextManager {
    private store;
    private topicTracker;
    private referenceResolver;
    private ranker;
    private compactor;
    private config;
    private topicStates;
    constructor(customStore?: ContextStore, customConfig?: ContextConfig);
    getStore(): ContextStore;
    getConfig(): Required<ContextConfig>;
    /**
     * Ingests a new user conversation turn, updating topic, references, items, and running compaction.
     */
    ingestUserTurn(userId: string, sessionId: string, userText: string): Promise<{
        turn: ConversationTurn;
        items: ContextItem[];
        topicState: TopicState;
        references: ContextReference[];
    }>;
    /**
     * Commits the agent's response turn at Stage 7 of the AgentLoop.
     */
    commitAgentResponse(userId: string, sessionId: string, responseText: string, metadata?: Record<string, any>): Promise<ConversationTurn>;
    /**
     * Generates a deterministic, immutable snapshot of the current conversational context.
     */
    getContextSnapshot(userId: string, sessionId: string): ConversationContextSnapshot;
    /**
     * Resets or clears context for a given session.
     */
    clearSession(userId: string, sessionId: string): void;
}
export declare const globalContextManager: ContextManager;
