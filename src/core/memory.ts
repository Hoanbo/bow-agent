// src/core/memory.ts
// BOW AGENT V3.3 — SHORT-TERM SESSION & LONG-TERM CONTEXT MEMORY

import type { AgentMessage, ProductItemResult, PlanItemResult, CategoryItemResult, OrderItemResult } from './types.js';

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

class MemoryStore {
  private sessions = new Map<string, SessionMemoryState>();
  private maxTurnsPerSession = 20;

  public getOrCreateSession(sessionId: string, userId?: string): SessionMemoryState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        userId,
        turns: [],
        candidateHistory: [],
        userPreferences: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  public addTurn(sessionId: string, turn: ConversationTurn): void {
    const session = this.getOrCreateSession(sessionId);
    session.turns.push(turn);
    if (session.turns.length > this.maxTurnsPerSession) {
      session.turns.shift();
    }
    session.updatedAt = Date.now();
  }

  public setDeferredContext(sessionId: string, deferred: DeferredPurchaseContext | undefined): void {
    const session = this.getOrCreateSession(sessionId);
    session.deferredContext = deferred;
    session.updatedAt = Date.now();
  }

  public setProductContext(sessionId: string, product?: ProductItemResult, plan?: PlanItemResult): void {
    const session = this.getOrCreateSession(sessionId);
    session.lastMentionedProduct = product;
    session.lastMentionedPlan = plan;
    session.updatedAt = Date.now();
  }

  public setCategoryContext(sessionId: string, category?: CategoryItemResult): void {
    const session = this.getOrCreateSession(sessionId);
    session.lastMentionedCategory = category;
    session.updatedAt = Date.now();
  }

  public setOrderContext(sessionId: string, order?: OrderItemResult): void {
    const session = this.getOrCreateSession(sessionId);
    session.lastMentionedOrder = order;
    session.updatedAt = Date.now();
  }

  public clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public getRecentTurns(sessionId: string, limit = 8): ConversationTurn[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.turns.slice(-limit);
  }
}

export const memoryStore = new MemoryStore();
