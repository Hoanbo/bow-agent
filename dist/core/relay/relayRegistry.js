// src/core/relay/relayRegistry.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
//
// In-memory observational registry maintaining 9-tuple scope isolation.
export class RelayRegistry {
    sessions = new Map();
    registerSession(session) {
        this.sessions.set(session.sessionId, session);
    }
    unregisterSession(sessionId) {
        return this.sessions.delete(sessionId);
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getAllSessions() {
        return Array.from(this.sessions.values());
    }
    getSessionsForUser(userId) {
        return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
    }
    getSessionsForDevice(deviceId) {
        return Array.from(this.sessions.values()).filter((s) => s.deviceId === deviceId);
    }
    getSessionsForSurface(surfaceType) {
        return Array.from(this.sessions.values()).filter((s) => s.surfaceType === surfaceType);
    }
    getSessionsForRelay(relayId) {
        return Array.from(this.sessions.values()).filter((s) => s.relayId === relayId);
    }
    count() {
        return this.sessions.size;
    }
    clear() {
        this.sessions.clear();
    }
}
