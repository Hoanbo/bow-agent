// src/core/brain-service/brainService.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Primary BrainService Public Facade.
//
// CARDINAL INVARIANTS:
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// BRAIN_SERVICE != BRAIN
// SERVICE_PROCESS != COGNITIVE_AUTHORITY
// REQUEST != BRAIN_RESTART
// SESSION != BRAIN_INSTANCE
// TASK != PROCESS
import { BrainServiceRuntime } from './brainServiceRuntime.js';
export class BrainService {
    _runtime;
    constructor(config, brainRuntimeOverride) {
        this._runtime = new BrainServiceRuntime(config, brainRuntimeOverride);
    }
    get serviceId() {
        return this._runtime.serviceId;
    }
    get brainId() {
        return this._runtime.brainRuntime.brainId;
    }
    get config() {
        return this._runtime.config;
    }
    get state() {
        return this._runtime.state;
    }
    get brainRuntime() {
        return this._runtime.brainRuntime;
    }
    /**
     * Start the Brain Service and load durable state.
     */
    async start() {
        await this._runtime.start();
    }
    /**
     * Handle an inbound Brain request envelope.
     */
    async handleRequest(request) {
        return this._runtime.handleRequest(request);
    }
    /**
     * Graceful shutdown of the Brain Service.
     */
    async shutdown(reason) {
        await this._runtime.shutdown({ reason });
    }
    /**
     * Get dynamic health snapshot.
     */
    getHealth() {
        return this._runtime.getHealth();
    }
    /**
     * Get full runtime snapshot.
     */
    getSnapshot() {
        return this._runtime.getSnapshot();
    }
    /**
     * Get durable persisted state.
     */
    getDurableState() {
        return this._runtime.persistence.getState();
    }
    /**
     * Get service audit events.
     */
    getAuditEvents() {
        return this._runtime.auditLedger.getEvents();
    }
}
// Global Singleton pattern
let _globalBrainService;
export function getBrainService(config) {
    if (!_globalBrainService) {
        _globalBrainService = new BrainService(config);
    }
    return _globalBrainService;
}
export function setBrainServiceForTest(service) {
    _globalBrainService = service;
}
