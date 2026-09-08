import type { CognitiveTurn } from './cognitiveTypes.js';
export interface SessionContextState {
    readonly sessionId: string;
    lastTargetFile?: string;
    lastAction?: string;
    lastToolName?: string;
    readonly turns: CognitiveTurn[];
    readonly namedEntities: Record<string, string>;
    updatedAt: string;
}
export declare class ContextReconstructor {
    private readonly sessions;
    /**
     * Retrieves or initializes session context state.
     */
    getOrCreateSession(sessionId: string): SessionContextState;
    /**
     * Records a user or assistant turn, updating referenced entities.
     */
    recordTurn(sessionId: string, turn: CognitiveTurn, hints?: {
        targetFile?: string;
        toolName?: string;
        action?: string;
    }): void;
    /**
     * Resolves referential pronouns ('it', 'that file', 'the previous file', 'to it')
     * against the durable session context.
     */
    resolveContext(sessionId: string, input: string): {
        resolvedInput: string;
        referencedEntity?: string;
        isReferential: boolean;
    };
    /**
     * Exports context state for durability.
     */
    exportState(sessionId: string): Record<string, unknown>;
    /**
     * Restores context state from durable store.
     */
    importState(sessionId: string, data: Record<string, unknown>): void;
    /**
     * Resets session memory.
     */
    clearSession(sessionId: string): void;
}
