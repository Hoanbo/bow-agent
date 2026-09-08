// src/core/brain-service/brainServiceLifecycle.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Service Lifecycle Coordinator.

import type { BrainServiceLifecycleState } from './brainServiceStates.js';
import { assertValidServiceTransition } from './brainServiceTransitions.js';
import type { BrainServiceAuditLedger } from './brainServiceAudit.js';

export class BrainServiceLifecycle {
  private _state: BrainServiceLifecycleState = 'CREATED';
  private readonly _auditLedger: BrainServiceAuditLedger;

  constructor(auditLedger: BrainServiceAuditLedger) {
    this._auditLedger = auditLedger;
  }

  public get state(): BrainServiceLifecycleState {
    return this._state;
  }

  public transition(to: BrainServiceLifecycleState): void {
    assertValidServiceTransition(this._state, to);
    this._state = to;
  }

  public async bootstrap(
    loadStateFn: () => Promise<void> | void
  ): Promise<void> {
    this.transition('INITIALIZING');
    this._auditLedger.record('SERVICE_BOOTSTRAP', { fromState: 'CREATED' });

    this.transition('LOADING_STATE');
    await loadStateFn();
    this._auditLedger.record('STATE_LOADED');

    this.transition('READY');
    this._auditLedger.record('SERVICE_READY');
  }
}
