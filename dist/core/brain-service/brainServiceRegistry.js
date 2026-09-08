// src/core/brain-service/brainServiceRegistry.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Single Brain Authority Registry & Session Mapping.
//
// CARDINAL INVARIANTS:
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// BRAIN_SERVICE != BRAIN
// SERVICE_PROCESS != COGNITIVE_AUTHORITY
import { BrainServiceError } from './brainServiceFailure.js';
export class BrainServiceRegistry {
    static _instance;
    _registeredBrainId = null;
    _registeredServiceId = null;
    _activeSessions = new Map();
    static getInstance() {
        if (!BrainServiceRegistry._instance) {
            BrainServiceRegistry._instance = new BrainServiceRegistry();
        }
        return BrainServiceRegistry._instance;
    }
    registerAuthority(serviceId, brainId) {
        if (this._registeredBrainId && this._registeredBrainId !== brainId) {
            throw new BrainServiceError('BRAIN_SERVICE_INTERNAL_ERROR', `Violation of ONE_BRAIN invariant: Attempted to register Brain "${brainId}" when Brain "${this._registeredBrainId}" is already authoritative.`, 'FATAL');
        }
        this._registeredBrainId = brainId;
        this._registeredServiceId = serviceId;
    }
    unregisterAuthority(serviceId) {
        if (this._registeredServiceId === serviceId) {
            this._registeredBrainId = null;
            this._registeredServiceId = null;
            this._activeSessions.clear();
        }
    }
    registerSession(sessionId, deviceId) {
        this._activeSessions.set(sessionId, {
            sessionId,
            deviceId,
            lastSeenAt: Date.now(),
        });
    }
    getSession(sessionId) {
        return this._activeSessions.get(sessionId);
    }
    get registeredBrainId() {
        return this._registeredBrainId;
    }
    get registeredServiceId() {
        return this._registeredServiceId;
    }
    resetForTest() {
        this._registeredBrainId = null;
        this._registeredServiceId = null;
        this._activeSessions.clear();
    }
}
