import { ContextClassification, ContextImportance, ContextItem, ConversationTurn } from './conversationContext.js';
export interface ClassificationResult {
    classification: ContextClassification;
    importance: ContextImportance;
    isExplicitInstruction: boolean;
    isUnresolvedTask: boolean;
    detectedCues: string[];
}
/**
 * Deterministically classifies conversational text into memory tiers and importance.
 */
export declare function classifyTurn(text: string, sender: 'user' | 'agent' | 'system'): ClassificationResult;
/**
 * Extracts structured context items from a conversation turn.
 */
export declare function extractContextItems(turn: ConversationTurn, topic?: string): ContextItem[];
