// src/core/admission/admissionSession.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Bridge to Connection & Session Runtime (MS-1.3.22).
// STRICT INVARIANTS:
// - DEVICE_ID != SESSION_ID
// - RECONNECT != RE-EXECUTE (Reconnection NEVER automatically re-executes interrupted tasks)
// - Session creation remains distinct from persistent device identity.
export class AdmissionSessionCoordinator {
    sessions = new Map();
    deviceActiveSessions = new Map(); // deviceId -> Set<sessionId>
    /**
     * Binds a newly admitted session to a persistent device.
     * Generates or validates distinct sessionId.
     */
    establishSession(deviceId, scope, network, assignedSessionId, now = Date.now()) {
        const sessionId = assignedSessionId || `ses_adm_${deviceId}_${now}_${this.sessions.size + 1}`;
        // STRICT INVARIANT: DEVICE_ID != SESSION_ID
        if (sessionId === deviceId) {
            throw new Error(`[ADMISSION_SESSION_INVALID] sessionId cannot be identical to deviceId (${deviceId}). Fail-closed.`);
        }
        const binding = Object.freeze({
            sessionId,
            deviceId,
            scope,
            initialNetwork: network,
            currentNetwork: network,
            createdAt: now,
            lastActiveAt: now,
            reconnectedCount: 0,
            active: true,
        });
        this.sessions.set(sessionId, binding);
        let activeSet = this.deviceActiveSessions.get(deviceId);
        if (!activeSet) {
            activeSet = new Set();
            this.deviceActiveSessions.set(deviceId, activeSet);
        }
        activeSet.add(sessionId);
        return binding;
    }
    /**
     * Validates and performs controlled session resume across roaming network transitions.
     * Invariant: RECONNECT != RE-EXECUTE.
     */
    resumeSession(sessionId, deviceId, scope, newNetwork, now = Date.now()) {
        const existing = this.sessions.get(sessionId);
        if (!existing || !existing.active) {
            throw new Error(`[ADMISSION_SESSION_NOT_FOUND] Session ${sessionId} is inactive or not found.`);
        }
        if (existing.deviceId !== deviceId) {
            throw new Error(`[ADMISSION_SESSION_MISMATCH] Session ${sessionId} does not belong to device ${deviceId}.`);
        }
        if (existing.scope.userId !== scope.userId || existing.scope.surfaceId !== scope.surfaceId) {
            throw new Error(`[ADMISSION_SCOPE_MISMATCH] Session resume scope mismatch for session ${sessionId}.`);
        }
        const updated = Object.freeze({
            ...existing,
            currentNetwork: newNetwork,
            lastActiveAt: now,
            reconnectedCount: existing.reconnectedCount + 1,
        });
        this.sessions.set(sessionId, updated);
        return updated;
    }
    createSession(deviceId, scope, network, assignedSessionId, now = Date.now()) {
        return this.establishSession(deviceId, scope, network, assignedSessionId, now);
    }
    validateSessionResume(sessionId, nextSequence, lastAckedSequence) {
        const existing = this.sessions.get(sessionId);
        if (!existing || !existing.active) {
            return { valid: false, failureReason: `Session ${sessionId} not found or inactive` };
        }
        if (nextSequence !== lastAckedSequence + 1) {
            return { valid: false, failureReason: `Sequence gap detected: expected ${lastAckedSequence + 1}, got ${nextSequence}` };
        }
        return { valid: true };
    }
    terminateSession(sessionId) {
        const existing = this.sessions.get(sessionId);
        if (!existing) {
            return false;
        }
        this.sessions.delete(sessionId);
        const activeSet = this.deviceActiveSessions.get(existing.deviceId);
        if (activeSet) {
            activeSet.delete(sessionId);
            if (activeSet.size === 0) {
                this.deviceActiveSessions.delete(existing.deviceId);
            }
        }
        return true;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getActiveSessionsForDevice(deviceId) {
        const sessionIds = this.deviceActiveSessions.get(deviceId);
        if (!sessionIds || sessionIds.size === 0) {
            return [];
        }
        const list = [];
        for (const id of sessionIds) {
            const s = this.sessions.get(id);
            if (s) {
                list.push(s);
            }
        }
        return Object.freeze(list);
    }
    size() {
        return this.sessions.size;
    }
    clear() {
        this.sessions.clear();
        this.deviceActiveSessions.clear();
    }
}
