// src/core/brain-service/brainServiceWorker.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Authoritative Cognitive Execution Worker.
//
// CARDINAL INVARIANTS:
// WORKER != BRAIN
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// REQUEST != BRAIN_RESTART
// DUPLICATE_REQUEST != DUPLICATE_EXECUTION
//
// Executes a validated request through the authoritative BrainRuntime.
// Enforces PDP, ToolRegistry, Verification, Commit, Idempotency, and Audit.

import type { BrainRuntime } from '../brain/brainRuntime.js';
import { type BrainTaskResult, makeBrainTaskId } from '../brain/brainTypes.js';
import type { BrainServicePersistence } from './brainServicePersistence.js';
import type { BrainServiceHealthMonitor } from './brainServiceHealth.js';
import type { BrainServiceAuditLedger } from './brainServiceAudit.js';
import type { BrainServiceRecovery } from './brainServiceRecovery.js';
import {
  type BrainServiceRequestEnvelope,
  type BrainServiceResponseEnvelope,
} from './brainServiceTypes.js';
import {
  buildSuccessResponse,
  buildErrorResponse,
} from './brainServiceResponse.js';
import type { BrainServiceLifecycleState } from './brainServiceStates.js';
import type { BrainServiceQueue } from './brainServiceQueue.js';

export interface WorkerCallbacks {
  onTransition: (state: BrainServiceLifecycleState) => void;
}

export class BrainServiceWorker {
  private readonly _brainRuntime: BrainRuntime;
  private readonly _persistence: BrainServicePersistence;
  private readonly _healthMonitor: BrainServiceHealthMonitor;
  private readonly _auditLedger: BrainServiceAuditLedger;
  private readonly _recovery: BrainServiceRecovery;
  private readonly _queue: BrainServiceQueue;
  private readonly _callbacks: WorkerCallbacks;
  private readonly _completedResults = new Map<string, BrainTaskResult>();

  constructor(
    brainRuntime: BrainRuntime,
    persistence: BrainServicePersistence,
    healthMonitor: BrainServiceHealthMonitor,
    auditLedger: BrainServiceAuditLedger,
    recovery: BrainServiceRecovery,
    queue: BrainServiceQueue,
    callbacks: WorkerCallbacks
  ) {
    this._brainRuntime = brainRuntime;
    this._persistence = persistence;
    this._healthMonitor = healthMonitor;
    this._auditLedger = auditLedger;
    this._recovery = recovery;
    this._queue = queue;
    this._callbacks = callbacks;
  }

  public async execute(
    request: BrainServiceRequestEnvelope
  ): Promise<BrainServiceResponseEnvelope> {
    const startTime = Date.now();
    this._auditLedger.record('REQUEST_EXECUTING', { sessionId: request.sessionId }, request.requestId);

    // 1. Idempotency Check: DUPLICATE_REQUEST != DUPLICATE_EXECUTION
    if (this._persistence.isRequestCompleted(request.requestId)) {
      this._healthMonitor.recordIdempotentHit();
      this._auditLedger.record(
        'REQUEST_IDEMPOTENT_HIT',
        { requestId: request.requestId },
        request.requestId
      );

      const cached = this._completedResults.get(request.requestId);
      const result: BrainTaskResult = cached ?? {
        taskId: makeBrainTaskId(),
        success: true,
        summary: `Idempotent replay: request "${request.requestId}" was previously executed and committed.`,
        verificationStatus: 'VERIFIED',
        completedAt: Date.now(),
        totalDurationMs: 0,
        iterationCount: 0,
      };

      const durationMs = Date.now() - startTime;
      this._callbacks.onTransition('READY');
      return buildSuccessResponse({
        requestId: request.requestId,
        sessionId: request.sessionId,
        result,
        health: this._healthMonitor.computeHealth('READY', this._queue.statusAfterActive),
        queueStatus: this._queue.statusAfterActive,
        durationMs,
        metadata: { idempotent: true },
      });
    }

    try {
      // 2. Lifecycle state progression: PLANNING -> EXECUTING
      this._callbacks.onTransition('PLANNING');
      this._callbacks.onTransition('EXECUTING');

      // 3. Submit task to single authoritative BrainRuntime
      // BrainRuntime submits through BrainLoop (PDP -> ToolRegistry -> Verification -> Commit)
      const taskResult = await this._brainRuntime.submitTask(request.input);

      // 4. Verification & Commit progression
      this._callbacks.onTransition('VERIFYING');
      this._callbacks.onTransition('COMMITTING');

      // 5. Durable state persistence
      this._persistence.recordRequestCompleted(request.requestId);
      this._completedResults.set(request.requestId, taskResult);

      const durationMs = Date.now() - startTime;
      this._healthMonitor.recordRequestSuccess(durationMs);

      // 6. Responding progression
      this._callbacks.onTransition('RESPONDING');

      this._auditLedger.record(
        'REQUEST_COMPLETED',
        {
          success: taskResult.success,
          iterations: taskResult.iterationCount,
          verificationStatus: taskResult.verificationStatus,
          durationMs,
        },
        request.requestId
      );

      // Reset Brain runtime to IDLE so it accepts subsequent requests without restart
      this._brainRuntime.reset();
      this._callbacks.onTransition('READY');

      return buildSuccessResponse({
        requestId: request.requestId,
        sessionId: request.sessionId,
        result: taskResult,
        health: this._healthMonitor.computeHealth('READY', this._queue.statusAfterActive),
        queueStatus: this._queue.statusAfterActive,
        durationMs,
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this._persistence.recordRequestFailed();
      this._healthMonitor.recordRequestFailure();

      this._auditLedger.record(
        'REQUEST_FAILED',
        {
          error: err.message,
          durationMs,
        },
        request.requestId
      );

      // Attempt recovery: FAILURE != BRAIN_DEATH
      this._callbacks.onTransition('RECOVERING');
      const recResult = await this._recovery.handleFailure(err, request);

      if (recResult.recovered) {
        this._callbacks.onTransition('READY');
      } else {
        this._callbacks.onTransition('FAILED');
      }

      return buildErrorResponse({
        requestId: request.requestId,
        sessionId: request.sessionId,
        error: err,
        health: this._healthMonitor.computeHealth(
          recResult.recovered ? 'READY' : 'FAILED',
          this._queue.statusAfterActive
        ),
        queueStatus: this._queue.statusAfterActive,
        durationMs,
      });
    }
  }
}
