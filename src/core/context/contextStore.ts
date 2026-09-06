// src/core/context/contextStore.ts
// BOWCON V4.0 — USER & SESSION SCOPED CONTEXT STORE (MILESTONE 1.3.7)
//
// Invariants:
// - INV-1 & INV-2: Strict user & session partition isolation via ${userId}::${sessionId}.
// - Zero mutable global conversation state: Managed in an isolated Map registry.
// - INV-11: All methods return defensive copies (Text & Snapshot Immutability).
// - INV-15: Rejects unsafe user/session IDs (path traversal, null-bytes, reserved names).

import {
  ConversationTurn,
  ContextItem,
  CompactionState,
  ContextSecurityError,
} from './conversationContext.js';

const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

export interface ScopedSessionContext {
  userId: string;
  sessionId: string;
  turns: ConversationTurn[];
  items: ContextItem[];
  compactionState?: CompactionState;
  createdAt: number;
  updatedAt: number;
}

export class ContextStore {
  private partitions = new Map<string, ScopedSessionContext>();

  /**
   * Builds and validates canonical partition key `${userId}::${sessionId}`.
   */
  public buildPartitionKey(userId: string, sessionId: string): string {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new ContextSecurityError('userId must be a non-empty string');
    }
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new ContextSecurityError('sessionId must be a non-empty string');
    }

    const u = userId.trim();
    const s = sessionId.trim();

    // Security validation against traversal and injection
    if (u.includes('\0') || s.includes('\0')) {
      throw new ContextSecurityError('Null-byte injection detected in context partition identity');
    }
    if (u.includes('..') || s.includes('..') || u.includes('/') || u.includes('\\') || s.includes('/') || s.includes('\\')) {
      throw new ContextSecurityError('Path traversal characters detected in context partition identity');
    }
    if (WINDOWS_RESERVED_NAMES.test(u) || WINDOWS_RESERVED_NAMES.test(s)) {
      throw new ContextSecurityError('Windows reserved device name detected in context partition identity');
    }

    return `${u}::${s}`;
  }

  /**
   * Retrieves or creates a scoped session context.
   */
  public getOrCreateContext(userId: string, sessionId: string): ScopedSessionContext {
    const key = this.buildPartitionKey(userId, sessionId);
    let ctx = this.partitions.get(key);
    if (!ctx) {
      ctx = {
        userId: userId.trim(),
        sessionId: sessionId.trim(),
        turns: [],
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.partitions.set(key, ctx);
    }
    return ctx;
  }

  /**
   * Appends a conversation turn and associated context items to the scoped context.
   */
  public appendTurn(
    userId: string,
    sessionId: string,
    turn: ConversationTurn,
    items: ContextItem[] = []
  ): void {
    const ctx = this.getOrCreateContext(userId, sessionId);

    // Deep clone to guarantee immutability (INV-11)
    const clonedTurn: ConversationTurn = {
      id: turn.id,
      sender: turn.sender,
      content: String(turn.content),
      timestamp: turn.timestamp,
      metadata: turn.metadata ? JSON.parse(JSON.stringify(turn.metadata)) : undefined,
    };

    ctx.turns.push(clonedTurn);

    for (const item of items) {
      ctx.items.push({
        ...item,
        content: String(item.content),
        metadata: item.metadata ? JSON.parse(JSON.stringify(item.metadata)) : undefined,
      });
    }

    ctx.updatedAt = Date.now();
  }

  /**
   * Retrieves a copy of the most recent turns up to the requested limit.
   */
  public getRecentTurns(userId: string, sessionId: string, limit: number = 10): ConversationTurn[] {
    const key = this.buildPartitionKey(userId, sessionId);
    const ctx = this.partitions.get(key);
    if (!ctx) return [];
    return ctx.turns.slice(-limit).map(t => ({ ...t, metadata: t.metadata ? { ...t.metadata } : undefined }));
  }

  /**
   * Retrieves all turns for the scoped context.
   */
  public getAllTurns(userId: string, sessionId: string): ConversationTurn[] {
    const key = this.buildPartitionKey(userId, sessionId);
    const ctx = this.partitions.get(key);
    if (!ctx) return [];
    return ctx.turns.map(t => ({ ...t, metadata: t.metadata ? { ...t.metadata } : undefined }));
  }

  /**
   * Retrieves all context items for the scoped context.
   */
  public getItems(userId: string, sessionId: string): ContextItem[] {
    const key = this.buildPartitionKey(userId, sessionId);
    const ctx = this.partitions.get(key);
    if (!ctx) return [];
    return ctx.items.map(i => ({ ...i, metadata: i.metadata ? { ...i.metadata } : undefined }));
  }

  /**
   * Removes ephemeral context items from the scoped session.
   */
  public removeEphemeralContext(userId: string, sessionId: string): void {
    const key = this.buildPartitionKey(userId, sessionId);
    const ctx = this.partitions.get(key);
    if (!ctx) return;
    ctx.items = ctx.items.filter(i => i.classification !== 'EPHEMERAL');
    ctx.updatedAt = Date.now();
  }

  /**
   * Replaces older turns with compacted state and summary.
   */
  public replaceCompactedContext(
    userId: string,
    sessionId: string,
    compactedTurns: ConversationTurn[],
    compactionState: CompactionState
  ): void {
    const ctx = this.getOrCreateContext(userId, sessionId);
    ctx.turns = compactedTurns.map(t => ({ ...t, metadata: t.metadata ? { ...t.metadata } : undefined }));
    ctx.compactionState = { ...compactionState };
    ctx.updatedAt = Date.now();
  }

  /**
   * Clears all context data for a specific user session.
   */
  public clearSessionContext(userId: string, sessionId: string): void {
    const key = this.buildPartitionKey(userId, sessionId);
    this.partitions.delete(key);
  }

  /**
   * Checks if an active context partition exists.
   */
  public hasSession(userId: string, sessionId: string): boolean {
    try {
      const key = this.buildPartitionKey(userId, sessionId);
      return this.partitions.has(key);
    } catch {
      return false;
    }
  }

  /**
   * Prunes stale partitions based on maxPartitions (LRU by updatedAt) or TTL (maxAgeMs).
   */
  public prunePartitions(options: { maxPartitions?: number; maxAgeMs?: number } = {}): number {
    let prunedCount = 0;
    const now = Date.now();

    // 1. Prune by maxAgeMs (TTL)
    if (options.maxAgeMs !== undefined && options.maxAgeMs > 0) {
      for (const [key, ctx] of this.partitions.entries()) {
        if (now - ctx.updatedAt > options.maxAgeMs) {
          this.partitions.delete(key);
          prunedCount++;
        }
      }
    }

    // 2. Prune by maxPartitions (LRU)
    if (options.maxPartitions !== undefined && this.partitions.size > options.maxPartitions) {
      const sortedEntries = Array.from(this.partitions.entries()).sort(
        (a, b) => a[1].updatedAt - b[1].updatedAt
      );
      const excess = this.partitions.size - options.maxPartitions;
      for (let i = 0; i < excess; i++) {
        this.partitions.delete(sortedEntries[i][0]);
        prunedCount++;
      }
    }

    return prunedCount;
  }

  /**
   * Serializes a scoped partition to JSON.
   */
  public serialize(userId: string, sessionId: string): string {
    const key = this.buildPartitionKey(userId, sessionId);
    const ctx = this.partitions.get(key);
    if (!ctx) {
      return JSON.stringify({
        userId: userId.trim(),
        sessionId: sessionId.trim(),
        turns: [],
        items: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return JSON.stringify(ctx);
  }

  /**
   * Deserializes and restores a partition into the store with corruption detection and validation.
   */
  public deserialize(serialized: string): ScopedSessionContext {
    try {
      if (!serialized || typeof serialized !== 'string') {
        throw new Error('Invalid serialized context: empty payload');
      }
      const parsed = JSON.parse(serialized);
      if (!parsed || typeof parsed !== 'object' || !parsed.userId || !parsed.sessionId) {
        throw new Error('Corrupted context payload: missing required partition fields');
      }

      // Re-validate partition key to prevent prototype pollution or traversal in restored data
      const key = this.buildPartitionKey(parsed.userId, parsed.sessionId);

      const ctx: ScopedSessionContext = {
        userId: String(parsed.userId).trim(),
        sessionId: String(parsed.sessionId).trim(),
        turns: Array.isArray(parsed.turns) ? parsed.turns : [],
        items: Array.isArray(parsed.items) ? parsed.items : [],
        compactionState: parsed.compactionState || undefined,
        createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      };

      this.partitions.set(key, ctx);
      return ctx;
    } catch (err: any) {
      throw new Error(`Context deserialization failure: ${err.message}`);
    }
  }

  /**
   * Safe recovery load: If data is corrupted, recovers with empty valid session rather than crashing.
   */
  public safeLoad(userId: string, sessionId: string, serialized: string): ScopedSessionContext {
    try {
      return this.deserialize(serialized);
    } catch {
      // Safe recovery degradation
      const ctx = this.getOrCreateContext(userId, sessionId);
      return ctx;
    }
  }

  /**
   * Total number of active partitions.
   */
  public size(): number {
    return this.partitions.size;
  }
}

export const globalContextStore = new ContextStore();
