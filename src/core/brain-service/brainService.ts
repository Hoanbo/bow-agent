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

import { BrainServiceRuntime, type BrainServiceRuntimeSnapshot } from './brainServiceRuntime.js';
import type { BrainRuntime } from '../brain/brainRuntime.js';
import type {
  BrainServiceConfig,
  ResolvedBrainServiceConfig,
} from './brainServiceConfig.js';
import type {
  BrainServiceRequestEnvelope,
  BrainServiceResponseEnvelope,
  BrainServiceHealthSnapshot,
  BrainServiceId,
  BrainDurableServiceState,
} from './brainServiceTypes.js';
import type { BrainServiceLifecycleState } from './brainServiceStates.js';
import type { BrainId } from '../brain/brainTypes.js';

export class BrainService {
  private readonly _runtime: BrainServiceRuntime;

  constructor(
    config?: BrainServiceConfig,
    brainRuntimeOverride?: BrainRuntime
  ) {
    this._runtime = new BrainServiceRuntime(config, brainRuntimeOverride);
  }

  public get serviceId(): BrainServiceId {
    return this._runtime.serviceId;
  }

  public get brainId(): BrainId {
    return this._runtime.brainRuntime.brainId;
  }

  public get config(): ResolvedBrainServiceConfig {
    return this._runtime.config;
  }

  public get state(): BrainServiceLifecycleState {
    return this._runtime.state;
  }

  public get brainRuntime(): BrainRuntime {
    return this._runtime.brainRuntime;
  }

  /**
   * Start the Brain Service and load durable state.
   */
  public async start(): Promise<void> {
    await this._runtime.start();
  }

  /**
   * Handle an inbound Brain request envelope.
   */
  public async handleRequest(
    request: BrainServiceRequestEnvelope | unknown
  ): Promise<BrainServiceResponseEnvelope> {
    return this._runtime.handleRequest(request);
  }

  /**
   * Graceful shutdown of the Brain Service.
   */
  public async shutdown(reason?: string): Promise<void> {
    await this._runtime.shutdown({ reason });
  }

  /**
   * Get dynamic health snapshot.
   */
  public getHealth(): BrainServiceHealthSnapshot {
    return this._runtime.getHealth();
  }

  /**
   * Get full runtime snapshot.
   */
  public getSnapshot(): BrainServiceRuntimeSnapshot {
    return this._runtime.getSnapshot();
  }

  /**
   * Get durable persisted state.
   */
  public getDurableState(): BrainDurableServiceState {
    return this._runtime.persistence.getState();
  }

  /**
   * Get service audit events.
   */
  public getAuditEvents() {
    return this._runtime.auditLedger.getEvents();
  }
}

// Global Singleton pattern
let _globalBrainService: BrainService | undefined;

export function getBrainService(config?: BrainServiceConfig): BrainService {
  if (!_globalBrainService) {
    _globalBrainService = new BrainService(config);
  }
  return _globalBrainService;
}

export function setBrainServiceForTest(service: BrainService | undefined): void {
  _globalBrainService = service;
}
