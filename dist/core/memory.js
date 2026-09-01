// src/core/memory.ts
// BOW AGENT V3.3 — SHORT-TERM SESSION & LONG-TERM CONTEXT MEMORY
class MemoryStore {
    sessions = new Map();
    maxTurnsPerSession = 20;
    getOrCreateSession(sessionId, userId) {
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
    addTurn(sessionId, turn) {
        const session = this.getOrCreateSession(sessionId);
        session.turns.push(turn);
        if (session.turns.length > this.maxTurnsPerSession) {
            session.turns.shift();
        }
        session.updatedAt = Date.now();
    }
    setDeferredContext(sessionId, deferred) {
        const session = this.getOrCreateSession(sessionId);
        session.deferredContext = deferred;
        session.updatedAt = Date.now();
    }
    setProductContext(sessionId, product, plan) {
        const session = this.getOrCreateSession(sessionId);
        session.lastMentionedProduct = product;
        session.lastMentionedPlan = plan;
        session.updatedAt = Date.now();
    }
    setCategoryContext(sessionId, category) {
        const session = this.getOrCreateSession(sessionId);
        session.lastMentionedCategory = category;
        session.updatedAt = Date.now();
    }
    setOrderContext(sessionId, order) {
        const session = this.getOrCreateSession(sessionId);
        session.lastMentionedOrder = order;
        session.updatedAt = Date.now();
    }
    clearSession(sessionId) {
        this.sessions.delete(sessionId);
    }
    getRecentTurns(sessionId, limit = 8) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return [];
        return session.turns.slice(-limit);
    }
}
export const memoryStore = new MemoryStore();
