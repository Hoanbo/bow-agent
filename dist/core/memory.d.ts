import type { ProductItemResult, PlanItemResult, CategoryItemResult, OrderItemResult } from './types.js';
export interface MemoryScope {
    sessionId: string;
    userId?: string;
}
export interface DeferredPurchaseContext {
    intent: 'BUY' | 'RENEW';
    productName?: string;
    duration?: string;
    planId?: string;
}
export interface ConversationTurn {
    id: string;
    sender: 'user' | 'agent' | 'system';
    content: string;
    timestamp: string;
    metadata?: Record<string, any>;
}
export interface SessionMemoryState {
    sessionId: string;
    userId?: string;
    turns: ConversationTurn[];
    lastMentionedProduct?: ProductItemResult;
    lastMentionedPlan?: PlanItemResult;
    lastMentionedCategory?: CategoryItemResult;
    lastMentionedOrder?: OrderItemResult;
    deferredContext?: DeferredPurchaseContext;
    candidateHistory: ProductItemResult[];
    userPreferences: Record<string, any>;
    createdAt: number;
    updatedAt: number;
}
export declare class MemoryStore {
    private sessions;
    private maxTurnsPerSession;
    /**
     * Resolve composite key for session storage:
     * Format: `${userId}::${sessionId}`
     */
    buildScopeKey(scope: MemoryScope | string, userId?: string): string;
    getSessionMemory(scope: MemoryScope): SessionMemoryState;
    appendTurn(scope: MemoryScope, turn: ConversationTurn): void;
    clearSessionMemory(scope: MemoryScope): void;
    getOrCreateSession(scope: MemoryScope | string, userId?: string): SessionMemoryState;
    addTurn(scope: MemoryScope | string, turn: ConversationTurn, userId?: string): void;
    setDeferredContext(scope: MemoryScope | string, deferred: DeferredPurchaseContext | undefined, userId?: string): void;
    setProductContext(scope: MemoryScope | string, product?: ProductItemResult, plan?: PlanItemResult, userId?: string): void;
    setCategoryContext(scope: MemoryScope | string, category?: CategoryItemResult, userId?: string): void;
    setOrderContext(scope: MemoryScope | string, order?: OrderItemResult, userId?: string): void;
    clearSession(scope: MemoryScope | string, userId?: string): void;
    getRecentTurns(scope: MemoryScope | string, limit?: number, userId?: string): ConversationTurn[];
    getAllSessionKeys(): string[];
}
export declare const memoryStore: MemoryStore;
export declare function getSessionMemory(scope: MemoryScope): SessionMemoryState;
export declare function appendTurn(scope: MemoryScope, turn: ConversationTurn): void;
export declare function clearSessionMemory(scope: MemoryScope): void;
