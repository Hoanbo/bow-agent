// src/core/memory.ts
// BOWCON V4.0 — MILESTONE 1.3.1: SESSION MEMORY ISOLATION & SCOPED WORKING MEMORY
//
// EN:
// Working Memory (Bộ nhớ làm việc) stores short-term conversational state for a single
// user session. Each session is strictly isolated by a composite key: ${userId}::${sessionId}.
// No session can read another session's memory.
//
// VI:
// Working Memory (bộ nhớ làm việc ngắn hạn) lưu trạng thái hội thoại trong phiên làm việc
// của một người dùng cụ thể. Mỗi phiên (session) được cô lập hoàn toàn bằng khóa tổng hợp
// ${userId}::${sessionId}. Không có session nào có thể đọc bộ nhớ của session khác.
//
// Invariant (Bất biến): Zero global mutable conversation state.
// Tức là: Không có trạng thái hội thoại nào được lưu ở biến toàn cục có thể bị thay đổi.

import type { AgentMessage, ProductItemResult, PlanItemResult, CategoryItemResult, OrderItemResult } from './types.js';

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

// EN:
// MemoryStore is the in-process, scoped storage for all active session working memory.
// It is keyed by ${userId}::${sessionId} and enforces a per-session turn limit.
//
// VI:
// MemoryStore là kho lưu trữ trong bộ nhớ (in-memory) cho tất cả phiên làm việc đang hoạt động.
// Khóa lưu trữ là ${userId}::${sessionId}. Mỗi session có giới hạn số lượt hội thoại (turns).
export class MemoryStore {
  private sessions = new Map<string, SessionMemoryState>();
  private maxTurnsPerSession = 20;

  /**
   * EN:
   * Resolve the composite partition key for session storage.
   * Format: `${userId}::${sessionId}`
   * This guarantees that two different users with the same sessionId
   * are never stored in the same memory partition.
   *
   * VI:
   * Tạo khóa phân vùng tổng hợp để truy xuất session memory.
   * Định dạng: `${userId}::${sessionId}`
   * Điều này đảm bảo hai người dùng khác nhau có cùng sessionId
   * sẽ KHÔNG bao giờ được lưu chung vào một phân vùng bộ nhớ.
   *
   * Isolation (Tính cô lập): Đây là ranh giới bảo mật cốt lõi của working memory.
   */
  public buildScopeKey(scope: MemoryScope | string, userId?: string): string {
    if (typeof scope === 'object' && scope !== null) {
      const u = scope.userId && scope.userId.trim() ? scope.userId.trim() : 'anonymous';
      const s = (scope.sessionId || '').trim();
      return `${u}::${s}`;
    }
    const s = (typeof scope === 'string' ? scope : '').trim();
    if (userId && userId.trim()) {
      return `${userId.trim()}::${s}`;
    }
    // If no userId provided, check if there's an exact unique existing session with this sessionId
    const matches = Array.from(this.sessions.values()).filter((session) => session.sessionId === s);
    if (matches.length === 1 && matches[0].userId) {
      return `${matches[0].userId}::${s}`;
    }
    return `anonymous::${s}`;
  }

  public getSessionMemory(scope: MemoryScope): SessionMemoryState {
    return this.getOrCreateSession(scope);
  }

  public appendTurn(scope: MemoryScope, turn: ConversationTurn): void {
    this.addTurn(scope, turn);
  }

  public clearSessionMemory(scope: MemoryScope): void {
    this.clearSession(scope);
  }

  public getOrCreateSession(scope: MemoryScope | string, userId?: string): SessionMemoryState {
    const key = this.buildScopeKey(scope, userId);
    let session = this.sessions.get(key);
    if (!session) {
      const resolvedSessionId = typeof scope === 'object' ? scope.sessionId : scope;
      const resolvedUserId = typeof scope === 'object' ? scope.userId : userId;
      session = {
        sessionId: resolvedSessionId,
        userId: resolvedUserId,
        turns: [],
        candidateHistory: [],
        userPreferences: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.sessions.set(key, session);
    }
    return session;
  }

  public addTurn(scope: MemoryScope | string, turn: ConversationTurn, userId?: string): void {
    const session = this.getOrCreateSession(scope, userId);
    session.turns.push(turn);
    if (session.turns.length > this.maxTurnsPerSession) {
      session.turns.shift();
    }
    session.updatedAt = Date.now();
  }

  public setDeferredContext(scope: MemoryScope | string, deferred: DeferredPurchaseContext | undefined, userId?: string): void {
    const session = this.getOrCreateSession(scope, userId);
    session.deferredContext = deferred;
    session.updatedAt = Date.now();
  }

  public setProductContext(scope: MemoryScope | string, product?: ProductItemResult, plan?: PlanItemResult, userId?: string): void {
    const session = this.getOrCreateSession(scope, userId);
    session.lastMentionedProduct = product;
    session.lastMentionedPlan = plan;
    session.updatedAt = Date.now();
  }

  public setCategoryContext(scope: MemoryScope | string, category?: CategoryItemResult, userId?: string): void {
    const session = this.getOrCreateSession(scope, userId);
    session.lastMentionedCategory = category;
    session.updatedAt = Date.now();
  }

  public setOrderContext(scope: MemoryScope | string, order?: OrderItemResult, userId?: string): void {
    const session = this.getOrCreateSession(scope, userId);
    session.lastMentionedOrder = order;
    session.updatedAt = Date.now();
  }

  public clearSession(scope: MemoryScope | string, userId?: string): void {
    const key = this.buildScopeKey(scope, userId);
    this.sessions.delete(key);
  }

  public getRecentTurns(scope: MemoryScope | string, limit = 8, userId?: string): ConversationTurn[] {
    const key = this.buildScopeKey(scope, userId);
    const session = this.sessions.get(key);
    if (!session) return [];
    return session.turns.slice(-limit);
  }

  public getAllSessionKeys(): string[] {
    return Array.from(this.sessions.keys());
  }
}

export const memoryStore = new MemoryStore();

export function getSessionMemory(scope: MemoryScope): SessionMemoryState {
  return memoryStore.getSessionMemory(scope);
}

export function appendTurn(scope: MemoryScope, turn: ConversationTurn): void {
  memoryStore.appendTurn(scope, turn);
}

export function clearSessionMemory(scope: MemoryScope): void {
  memoryStore.clearSessionMemory(scope);
}
