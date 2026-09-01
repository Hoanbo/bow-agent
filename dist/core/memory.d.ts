import type { ProductItemResult, PlanItemResult, CategoryItemResult, OrderItemResult } from './types.js';
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
declare class MemoryStore {
    private sessions;
    private maxTurnsPerSession;
    getOrCreateSession(sessionId: string, userId?: string): SessionMemoryState;
    addTurn(sessionId: string, turn: ConversationTurn): void;
    setDeferredContext(sessionId: string, deferred: DeferredPurchaseContext | undefined): void;
    setProductContext(sessionId: string, product?: ProductItemResult, plan?: PlanItemResult): void;
    setCategoryContext(sessionId: string, category?: CategoryItemResult): void;
    setOrderContext(sessionId: string, order?: OrderItemResult): void;
    clearSession(sessionId: string): void;
    getRecentTurns(sessionId: string, limit?: number): ConversationTurn[];
}
export declare const memoryStore: MemoryStore;
export {};
