// src/core/brain-service/brainServiceLifecycle.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Service Lifecycle Coordinator.
import { assertValidServiceTransition } from './brainServiceTransitions.js';
export class BrainServiceLifecycle {
    _state = 'CREATED';
    _auditLedger;
    constructor(auditLedger) {
        this._auditLedger = auditLedger;
    }
    get state() {
        return this._state;
    }
    transition(to) {
        assertValidServiceTransition(this._state, to);
        this._state = to;
    }
    async bootstrap(loadStateFn) {
        this.transition('INITIALIZING');
        this._auditLedger.record('SERVICE_BOOTSTRAP', { fromState: 'CREATED' });
        this.transition('LOADING_STATE');
        await loadStateFn();
        this._auditLedger.record('STATE_LOADED');
        this.transition('READY');
        this._auditLedger.record('SERVICE_READY');
    }
}
