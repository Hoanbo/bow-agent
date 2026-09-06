export type ContextClassification = 'EPHEMERAL' | 'SESSION' | 'USER' | 'DURABLE';
export type ContextImportance = 'TRIVIAL' | 'LOW' | 'NORMAL' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
import type { ConversationTurn } from '../memory.js';
export type { ConversationTurn };
export interface ContextItem {
    id: string;
    content: string;
    turnId?: string;
    classification: ContextClassification;
    importance: ContextImportance;
    topic?: string;
    isExplicitInstruction?: boolean;
    isUnresolvedTask?: boolean;
    timestamp: string;
    metadata?: Record<string, any>;
}
export interface ContextReference {
    phrase: string;
    targetText?: string;
    targetTurnId?: string;
    resolved: boolean;
    confidence: number;
}
export interface CompactionState {
    compacted: boolean;
    originalTurnCount: number;
    compactedTurnCount: number;
    summary?: string;
    timestamp: string;
}
export interface ConversationContextSnapshot {
    userId: string;
    sessionId: string;
    activeTopic: string;
    previousTopic?: string;
    topicConfidence: number;
    recentTurns: ConversationTurn[];
    relevantMemories: ContextItem[];
    unresolvedTasks: ContextItem[];
    explicitInstructions: ContextItem[];
    resolvedReferences: ContextReference[];
    compactionState?: CompactionState;
    totalEstimatedCharacters: number;
}
export interface ContextConfig {
    maxTurns?: number;
    maxCharacters?: number;
    maxContextItems?: number;
    maxRecentTurns?: number;
    compactionThreshold?: number;
    maxDurableMemoryItems?: number;
    maxSessionMemoryItems?: number;
    referenceResolutionThreshold?: number;
    topicConfidenceThreshold?: number;
}
export declare const DEFAULT_CONTEXT_CONFIG: Required<ContextConfig>;
export declare class ContextSecurityError extends Error {
    constructor(message: string);
}
/**
 * Validates candidate configuration object against ContextConfig schema.
 * Rejects prototype pollution payloads fail-closed.
 */
export declare function validateContextConfig(config: unknown): {
    valid: boolean;
    config?: Required<ContextConfig>;
    errors?: string[];
};
/**
 * Serializes a conversation context snapshot into JSON.
 */
export declare function serializeSnapshot(snapshot: ConversationContextSnapshot): string;
/**
 * Deserializes a snapshot with safe fallback on malformed/corrupted data.
 */
export declare function deserializeSnapshot(raw: string): ConversationContextSnapshot;
