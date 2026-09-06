// src/core/memory.ts
// BOW AGENT V3.3 — SHORT-TERM SESSION & LONG-TERM CONTEXT MEMORY
// BOWCON V4.0 — MILESTONE 1.3.1: SESSION MEMORY ISOLATION & SCOPED WORKING MEMORY
export class MemoryStore {
    sessions = new Map();
    maxTurnsPerSession = 20;
    /**
     * Resolve composite key for session storage:
     * Format: `${userId}::${sessionId}`
     */
    buildScopeKey(scope, userId) {
        if (typeof scope === 'object' && scope !== null) {
            const u = scope.userId && scope.userId.trim() ? scope.userId.trim() : 'anonymous';
            const s = (scope.sessionId || '').trim();
            return `${u}::${s}`;
        }
        const s = (scope || '').trim();
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
    getSessionMemory(scope) {
        return this.getOrCreateSession(scope);
    }
    appendTurn(scope, turn) {
        this.addTurn(scope, turn);
    }
    clearSessionMemory(scope) {
        this.clearSession(scope);
    }
    getOrCreateSession(scope, userId) {
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
    addTurn(scope, turn, userId) {
        const session = this.getOrCreateSession(scope, userId);
        session.turns.push(turn);
        if (session.turns.length > this.maxTurnsPerSession) {
            session.turns.shift();
        }
        session.updatedAt = Date.now();
    }
    setDeferredContext(scope, deferred, userId) {
        const session = this.getOrCreateSession(scope, userId);
        session.deferredContext = deferred;
        session.updatedAt = Date.now();
    }
    setProductContext(scope, product, plan, userId) {
        const session = this.getOrCreateSession(scope, userId);
        session.lastMentionedProduct = product;
        session.lastMentionedPlan = plan;
        session.updatedAt = Date.now();
    }
    setCategoryContext(scope, category, userId) {
        const session = this.getOrCreateSession(scope, userId);
        session.lastMentionedCategory = category;
        session.updatedAt = Date.now();
    }
    setOrderContext(scope, order, userId) {
        const session = this.getOrCreateSession(scope, userId);
        session.lastMentionedOrder = order;
        session.updatedAt = Date.now();
    }
    clearSession(scope, userId) {
        const key = this.buildScopeKey(scope, userId);
        this.sessions.delete(key);
    }
    getRecentTurns(scope, limit = 8, userId) {
        const key = this.buildScopeKey(scope, userId);
        const session = this.sessions.get(key);
        if (!session)
            return [];
        return session.turns.slice(-limit);
    }
    getAllSessionKeys() {
        return Array.from(this.sessions.keys());
    }
}
export const memoryStore = new MemoryStore();
export function getSessionMemory(scope) {
    return memoryStore.getSessionMemory(scope);
}
export function appendTurn(scope, turn) {
    memoryStore.appendTurn(scope, turn);
}
export function clearSessionMemory(scope) {
    memoryStore.clearSessionMemory(scope);
}
