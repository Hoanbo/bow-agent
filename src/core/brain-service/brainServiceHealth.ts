// src/core/brain-service/brainServiceHealth.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Dynamic Service Health Monitoring & Telemetry.

import {
  type BrainServiceHealthState,
  type BrainQueueStatus,
  type BrainServiceMetrics,
  type BrainServiceHealthSnapshot,
  type BrainServiceId,
} from './brainServiceTypes.js';
import type { BrainId } from '../brain/brainTypes.js';
import type { BrainServiceLifecycleState } from './brainServiceStates.js';

export class BrainServiceHealthMonitor {
  public readonly serviceId: BrainServiceId;
  public readonly brainId: BrainId;
  private readonly _startedAt: number;
  private readonly _metrics: BrainServiceMetrics;
  private _persistenceHealthy = true;
  private _runtimeHealthy = true;
  private _totalLatencyMs = 0;

  constructor(serviceId: BrainServiceId, brainId: BrainId) {
    this.serviceId = serviceId;
    this.brainId = brainId;
    this._startedAt = Date.now();
    this._metrics = {
      totalRequestsReceived: 0,
      totalRequestsCompleted: 0,
      totalRequestsFailed: 0,
      totalIdempotentHits: 0,
      totalRecoveries: 0,
      consecutiveFailures: 0,
      lastRequestLatencyMs: 0,
      averageLatencyMs: 0,
      uptimeMs: 0,
      startedAt: this._startedAt,
    };
  }

  public recordRequestReceived(): void {
    this._metrics.totalRequestsReceived++;
  }

  public recordRequestSuccess(latencyMs: number): void {
    this._metrics.totalRequestsCompleted++;
    this._metrics.consecutiveFailures = 0;
    this._metrics.lastRequestLatencyMs = latencyMs;
    this._totalLatencyMs += latencyMs;
    this._metrics.averageLatencyMs = Math.round(
      this._totalLatencyMs / this._metrics.totalRequestsCompleted
    );
  }

  public recordRequestFailure(): void {
    this._metrics.totalRequestsFailed++;
    this._metrics.consecutiveFailures++;
  }

  public recordIdempotentHit(): void {
    this._metrics.totalIdempotentHits++;
  }

  public recordRecovery(): void {
    this._metrics.totalRecoveries++;
    this._metrics.consecutiveFailures = 0;
  }

  public setPersistenceHealth(healthy: boolean): void {
    this._persistenceHealthy = healthy;
  }

  public setRuntimeHealth(healthy: boolean): void {
    this._runtimeHealthy = healthy;
  }

  public computeHealth(
    state: BrainServiceLifecycleState,
    queueStatus: BrainQueueStatus
  ): BrainServiceHealthState {
    if (state === 'STOPPED') return 'STOPPED';
    if (state === 'FAILED' || !this._persistenceHealthy || !this._runtimeHealthy) {
      return 'FAILED';
    }
    if (state === 'RECOVERING' || queueStatus === 'RECOVERING') {
      return 'RECOVERING';
    }
    if (
      state === 'DEGRADED' ||
      queueStatus === 'BACKPRESSURE' ||
      this._metrics.consecutiveFailures >= 3
    ) {
      return 'DEGRADED';
    }
    return 'READY';
  }

  public getSnapshot(
    state: BrainServiceLifecycleState,
    queueStatus: BrainQueueStatus,
    queueDepth: number
  ): BrainServiceHealthSnapshot {
    this._metrics.uptimeMs = Date.now() - this._startedAt;
    const health = this.computeHealth(state, queueStatus);

    return Object.freeze({
      version: '4.0.0',
      serviceId: this.serviceId,
      brainId: this.brainId,
      health,
      state,
      queueStatus,
      queueDepth,
      metrics: { ...this._metrics },
      persistenceHealthy: this._persistenceHealthy,
      runtimeHealthy: this._runtimeHealthy,
      timestamp: Date.now(),
    });
  }
}
