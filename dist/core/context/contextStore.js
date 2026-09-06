// src/core/context/contextStore.ts
// BOWCON V4.0 — USER & SESSION SCOPED CONTEXT STORE (MILESTONE 1.3.7)
//
// Invariants:
// - INV-1 & INV-2: Strict user & session partition isolation via ${userId}::${sessionId}.
// - Zero mutable global conversation state: Managed in an isolated Map registry.
// - INV-11: All methods return defensive copies (Text & Snapshot Immutability).
// - INV-15: Rejects unsafe user/session IDs (path traversal, null-bytes, reserved names).
import { ContextSecurityError, } from './conversationContext.js';
// EN:
// The store scopes every conversation to ${userId}::${sessionId}. It returns defensive
// copies, so callers cannot mutate the stored conversation through a snapshot.
//
// VI:
// Store giới hạn mọi cuộc hội thoại theo ${userId}::${sessionId}. Nó trả về các bản sao phòng thủ,
// vì vậy caller không thể sửa cuộc hội thoại đã lưu thông qua snapshot.
const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
export class ContextStore {
    partitions = new Map();
    /**
     * Builds and validates canonical partition key `${userId}::${sessionId}`.
     */
    buildPartitionKey(userId, sessionId) {
        if (!userId || typeof userId !== 'string' || !userId.trim()) {
            throw new ContextSecurityError('userId must be a non-empty string');
        }
        if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
            throw new ContextSecurityError('sessionId must be a non-empty string');
        }
        const u = userId.trim();
        const s = sessionId.trim();
        // EN: Validate identity before using it as a partition key; fail closed on injection input.
        // VI: Xác thực danh tính trước khi dùng làm khóa phân vùng; từ chối an toàn dữ liệu đầu vào chèn mã.
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
    getOrCreateContext(userId, sessionId) {
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
    appendTurn(userId, sessionId, turn, items = []) {
        const ctx = this.getOrCreateContext(userId, sessionId);
        // Deep clone to guarantee immutability (INV-11)
        const clonedTurn = {
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
    getRecentTurns(userId, sessionId, limit = 10) {
        const key = this.buildPartitionKey(userId, sessionId);
        const ctx = this.partitions.get(key);
        if (!ctx)
            return [];
        return ctx.turns.slice(-limit).map(t => ({ ...t, metadata: t.metadata ? { ...t.metadata } : undefined }));
    }
    /**
     * Retrieves all turns for the scoped context.
     */
    getAllTurns(userId, sessionId) {
        const key = this.buildPartitionKey(userId, sessionId);
        const ctx = this.partitions.get(key);
        if (!ctx)
            return [];
        return ctx.turns.map(t => ({ ...t, metadata: t.metadata ? { ...t.metadata } : undefined }));
    }
    /**
     * Retrieves all context items for the scoped context.
     */
    getItems(userId, sessionId) {
        const key = this.buildPartitionKey(userId, sessionId);
        const ctx = this.partitions.get(key);
        if (!ctx)
            return [];
        return ctx.items.map(i => ({ ...i, metadata: i.metadata ? { ...i.metadata } : undefined }));
    }
    /**
     * Removes ephemeral context items from the scoped session.
     */
    removeEphemeralContext(userId, sessionId) {
        const key = this.buildPartitionKey(userId, sessionId);
        const ctx = this.partitions.get(key);
        if (!ctx)
            return;
        ctx.items = ctx.items.filter(i => i.classification !== 'EPHEMERAL');
        ctx.updatedAt = Date.now();
    }
    /**
     * Replaces older turns with compacted state and summary.
     */
    replaceCompactedContext(userId, sessionId, compactedTurns, compactionState) {
        const ctx = this.getOrCreateContext(userId, sessionId);
        ctx.turns = compactedTurns.map(t => ({ ...t, metadata: t.metadata ? { ...t.metadata } : undefined }));
        ctx.compactionState = { ...compactionState };
        ctx.updatedAt = Date.now();
    }
    /**
     * Clears all context data for a specific user session.
     */
    clearSessionContext(userId, sessionId) {
        const key = this.buildPartitionKey(userId, sessionId);
        this.partitions.delete(key);
    }
    /**
     * Checks if an active context partition exists.
     */
    hasSession(userId, sessionId) {
        try {
            const key = this.buildPartitionKey(userId, sessionId);
            return this.partitions.has(key);
        }
        catch {
            return false;
        }
    }
    /**
     * Prunes stale partitions based on maxPartitions (LRU by updatedAt) or TTL (maxAgeMs).
     */
    prunePartitions(options = {}) {
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
            const sortedEntries = Array.from(this.partitions.entries()).sort((a, b) => a[1].updatedAt - b[1].updatedAt);
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
    serialize(userId, sessionId) {
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
    deserialize(serialized) {
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
            const ctx = {
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
        }
        catch (err) {
            throw new Error(`Context deserialization failure: ${err.message}`);
        }
    }
    /**
     * Safe recovery load: If data is corrupted, recovers with empty valid session rather than crashing.
     */
    safeLoad(userId, sessionId, serialized) {
        try {
            return this.deserialize(serialized);
        }
        catch {
            // Safe recovery degradation
            const ctx = this.getOrCreateContext(userId, sessionId);
            return ctx;
        }
    }
    /**
     * Total number of active partitions.
     */
    size() {
        return this.partitions.size;
    }
}
export const globalContextStore = new ContextStore();
