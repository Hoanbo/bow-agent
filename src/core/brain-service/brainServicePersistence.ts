// src/core/brain-service/brainServicePersistence.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Crash-Safe Durable State Persistence Adapter using DurableJsonStore.
//
// INVARIANT: Durable state must survive restarts without corruption.

import fs from 'node:fs';
import path from 'node:path';
import {
  DurableJsonStore,
  type ValidationResult,
} from '../persistence/durableJsonStore.js';
import {
  type BrainDurableServiceState,
  type BrainServiceId,
  BRAIN_SERVICE_VERSION,
  makeBrainServiceId,
} from './brainServiceTypes.js';
import type { BrainId } from '../brain/brainTypes.js';
import type { ResolvedBrainServiceConfig } from './brainServiceConfig.js';
import { BrainServiceError } from './brainServiceFailure.js';

export function validateBrainServiceState(data: unknown): ValidationResult<BrainDurableServiceState> {
  if (!data || typeof data !== 'object') {
    return { success: false, errors: ['State payload must be a non-null object'] };
  }

  const s = data as Partial<BrainDurableServiceState>;
  const errors: string[] = [];

  if (typeof s.version !== 'string') errors.push('Missing or invalid "version"');
  if (typeof s.serviceId !== 'string') errors.push('Missing or invalid "serviceId"');
  if (typeof s.brainId !== 'string') errors.push('Missing or invalid "brainId"');
  if (typeof s.totalRequestsReceived !== 'number') errors.push('Missing or invalid "totalRequestsReceived"');
  if (typeof s.totalRequestsCompleted !== 'number') errors.push('Missing or invalid "totalRequestsCompleted"');
  if (typeof s.totalRequestsFailed !== 'number') errors.push('Missing or invalid "totalRequestsFailed"');
  if (!Array.isArray(s.completedRequestIds)) errors.push('Missing or invalid "completedRequestIds"');
  if (typeof s.lastCommittedAt !== 'number') errors.push('Missing or invalid "lastCommittedAt"');

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: data as BrainDurableServiceState };
}

export class BrainServicePersistence {
  private readonly _store: DurableJsonStore<BrainDurableServiceState>;
  private _state: BrainDurableServiceState;
  private _dirty = false;

  constructor(
    config: ResolvedBrainServiceConfig,
    initialBrainId: BrainId,
    initialServiceId?: BrainServiceId
  ) {
    // Ensure directory exists
    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    const defaultServiceId = initialServiceId ?? makeBrainServiceId();

    const defaultFactory = (): BrainDurableServiceState => ({
      version: BRAIN_SERVICE_VERSION,
      serviceId: defaultServiceId,
      brainId: initialBrainId,
      hostMode: config.hostMode,
      totalRequestsReceived: 0,
      totalRequestsCompleted: 0,
      totalRequestsFailed: 0,
      completedRequestIds: [],
      lastCommittedAt: Date.now(),
      createdAt: Date.now(),
    });

    this._store = new DurableJsonStore<BrainDurableServiceState>({
      filePath: config.stateFilePath,
      allowedBaseDir: config.dataDir,
      validator: validateBrainServiceState,
      defaultFactory,
    });

    try {
      this._state = this._store.read();
    } catch (err: any) {
      throw new BrainServiceError(
        'BRAIN_SERVICE_PERSISTENCE_FAILED',
        `Failed to initialize or read durable state: ${err.message}`,
        'FATAL',
        { error: err.message }
      );
    }
  }

  public getState(): BrainDurableServiceState {
    return { ...this._state, completedRequestIds: [...this._state.completedRequestIds] };
  }

  public isRequestCompleted(requestId: string): boolean {
    return this._state.completedRequestIds.includes(requestId);
  }

  public recordRequestReceived(): void {
    this._state = {
      ...this._state,
      totalRequestsReceived: this._state.totalRequestsReceived + 1,
    };
    this._dirty = true;
  }

  public recordRequestCompleted(requestId: string): void {
    const ids = this._state.completedRequestIds.includes(requestId)
      ? this._state.completedRequestIds
      : [...this._state.completedRequestIds, requestId];

    this._state = {
      ...this._state,
      totalRequestsCompleted: this._state.totalRequestsCompleted + 1,
      completedRequestIds: ids,
      lastCommittedAt: Date.now(),
    };
    this._dirty = true;
    this.flush();
  }

  public recordRequestFailed(): void {
    this._state = {
      ...this._state,
      totalRequestsFailed: this._state.totalRequestsFailed + 1,
      lastCommittedAt: Date.now(),
    };
    this._dirty = true;
    this.flush();
  }

  public recordShutdown(): void {
    this._state = {
      ...this._state,
      lastShutdownAt: Date.now(),
    };
    this._dirty = true;
    this.flush();
  }

  public flush(): void {
    if (!this._dirty) return;
    try {
      this._store.write(this._state);
      this._dirty = false;
    } catch (err: any) {
      throw new BrainServiceError(
        'BRAIN_SERVICE_PERSISTENCE_FAILED',
        `Failed to flush durable state to disk: ${err.message}`,
        'FATAL',
        { error: err.message }
      );
    }
  }
}
