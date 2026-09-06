import { ConversationTurn, ContextReference } from './conversationContext.js';
export declare class ReferenceResolver {
    private confidenceThreshold;
    constructor(confidenceThreshold?: number);
    /**
     * Identifies candidate referring phrases within text.
     */
    findReferringPhrases(text: string): string[];
    /**
     * Resolves referring expressions within user text against recent turns of the scoped session.
     */
    resolveReferences(userText: string, recentTurns: ConversationTurn[]): ContextReference[];
}
export declare const globalReferenceResolver: ReferenceResolver;
