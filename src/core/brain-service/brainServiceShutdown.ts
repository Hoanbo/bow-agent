// src/core/brain-service/brainServiceShutdown.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Graceful Shutdown Coordinator.
//
// SEQUENCE:
// STOP_ACCEPTING -> DRAIN_SAFE_REQUESTS -> COMMIT_REQUIRED_STATE -> FLUSH_AUDIT -> CLOSE_RUNTIME -> STOP

import type { BrainRuntime } from '../brain/brainRuntime.js';
import type { BrainServicePersistence } from './brainServicePersistence.js';
import type { BrainServiceAuditLedger } from './brainServiceAudit.js';
import type { BrainServiceQueue } from './brainServiceQueue.js';

export interface ShutdownOptions {
  drainTimeoutMs?: number;
  reason?: string;
}

export class BrainServiceShutdownCoordinator {
  private readonly _brainRuntime: BrainRuntime;
  private readonly _persistence: BrainServicePersistence;
  private readonly _auditLedger: BrainServiceAuditLedger;
  private readonly _queue: BrainServiceQueue;
  private _isShuttingDown = false;

  constructor(
    brainRuntime: BrainRuntime,
    persistence: BrainServicePersistence,
    auditLedger: BrainServiceAuditLedger,
    queue: BrainServiceQueue
  ) {
    this._brainRuntime = brainRuntime;
    this._persistence = persistence;
    this._auditLedger = auditLedger;
    this._queue = queue;
  }

  public get isShuttingDown(): boolean {
    return this._isShuttingDown;
  }

  public async executeShutdown(options: ShutdownOptions = {}): Promise<void> {
    if (this._isShuttingDown) return;
    this._isShuttingDown = true;

    const reason = options.reason ?? 'Normal shutdown requested';
    this._auditLedger.record('SHUTDOWN_INITIATED', { reason });

    // Step 1: Stop accepting new requests & clear queued non-active requests
    this._queue.clear('Service is shutting down');

    // Step 2: Drain active request if executing
    const drainTimeout = options.drainTimeoutMs ?? 5000;
    const startDrain = Date.now();
    while (this._queue.isProcessing && Date.now() - startDrain < drainTimeout) {
      await new Promise(r => setTimeout(r, 50));
    }

    // Step 3: Record shutdown in durable state & flush to disk
    this._persistence.recordShutdown();
    this._persistence.flush();

    // Step 4: Record audit record before closing
    this._auditLedger.record('SHUTDOWN_COMPLETED', {
      drainDurationMs: Date.now() - startDrain,
      reason,
    });

    // Step 5: Close underlying BrainRuntime
    await this._brainRuntime.shutdown();
  }
}
