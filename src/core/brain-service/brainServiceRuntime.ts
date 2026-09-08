// src/core/brain-service/brainServiceRuntime.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Authoritative Brain Service Runtime Orchestrator.
//
// Hosts the single authoritative BrainRuntime and coordinates lifecycle, queue,
// worker execution, health monitoring, recovery, persistence, and audit.

import { BrainRuntime, getBrainRuntime } from '../brain/brainRuntime.js';
import {
  type BrainServiceId,
  type BrainServiceRequestEnvelope,
  type BrainServiceResponseEnvelope,
  type BrainServiceHealthSnapshot,
  makeBrainServiceId,
} from './brainServiceTypes.js';
import {
  type BrainServiceConfig,
  type ResolvedBrainServiceConfig,
  resolveBrainServiceConfig,
} from './brainServiceConfig.js';
import {
  type BrainServiceLifecycleState,
  canServiceAcceptRequest,
  isServiceTerminal,
} from './brainServiceStates.js';
import { BrainServiceLifecycle } from './brainServiceLifecycle.js';
import { BrainServiceAuditLedger } from './brainServiceAudit.js';
import { BrainServiceHealthMonitor } from './brainServiceHealth.js';
import { BrainServicePersistence } from './brainServicePersistence.js';
import { BrainServiceQueue, type QueueItem } from './brainServiceQueue.js';
import { BrainServiceRecovery } from './brainServiceRecovery.js';
import { BrainServiceShutdownCoordinator, type ShutdownOptions } from './brainServiceShutdown.js';
import { BrainServiceWorker } from './brainServiceWorker.js';
import { BrainServiceRegistry } from './brainServiceRegistry.js';
import { validateServiceRequest } from './brainServiceRequest.js';
import { BrainServiceError } from './brainServiceFailure.js';

export interface BrainServiceRuntimeSnapshot {
  readonly version: string;
  readonly serviceId: BrainServiceId;
  readonly brainId: string;
  readonly hostMode: string;
  readonly state: BrainServiceLifecycleState;
  readonly health: BrainServiceHealthSnapshot;
  readonly queueDepth: number;
  readonly totalAuditEvents: number;
  readonly uptimeMs: number;
  readonly capturedAt: number;
}

export class BrainServiceRuntime {
  public readonly serviceId: BrainServiceId;
  public readonly config: ResolvedBrainServiceConfig;
  private readonly _brainRuntime: BrainRuntime;
  private readonly _auditLedger: BrainServiceAuditLedger;
  private readonly _healthMonitor: BrainServiceHealthMonitor;
  private readonly _persistence: BrainServicePersistence;
  private readonly _lifecycle: BrainServiceLifecycle;
  private readonly _queue: BrainServiceQueue;
  private readonly _recovery: BrainServiceRecovery;
  private readonly _shutdownCoordinator: BrainServiceShutdownCoordinator;
  private readonly _worker: BrainServiceWorker;
  private readonly _registry: BrainServiceRegistry;
  private readonly _startedAt: number;
  private _isProcessingQueue = false;

  constructor(
    configOverrides: BrainServiceConfig = {},
    brainRuntimeOverride?: BrainRuntime
  ) {
    this.config = resolveBrainServiceConfig(configOverrides);
    this.serviceId = makeBrainServiceId(this.config.brainSeed);

    this._brainRuntime =
      brainRuntimeOverride ||
      getBrainRuntime();

    this._auditLedger = new BrainServiceAuditLedger(
      this.serviceId,
      this._brainRuntime.brainId
    );

    this._healthMonitor = new BrainServiceHealthMonitor(
      this.serviceId,
      this._brainRuntime.brainId
    );

    this._persistence = new BrainServicePersistence(
      this.config,
      this._brainRuntime.brainId,
      this.serviceId
    );

    this._lifecycle = new BrainServiceLifecycle(this._auditLedger);

    this._queue = new BrainServiceQueue(this.config.maxQueueSize);

    this._recovery = new BrainServiceRecovery(
      this._brainRuntime,
      this._healthMonitor,
      this._auditLedger
    );

    this._shutdownCoordinator = new BrainServiceShutdownCoordinator(
      this._brainRuntime,
      this._persistence,
      this._auditLedger,
      this._queue
    );

    this._worker = new BrainServiceWorker(
      this._brainRuntime,
      this._persistence,
      this._healthMonitor,
      this._auditLedger,
      this._recovery,
      this._queue,
      {
        onTransition: (state: BrainServiceLifecycleState) => {
          this._lifecycle.transition(state);
        },
      }
    );

    this._registry = BrainServiceRegistry.getInstance();
    this._registry.registerAuthority(this.serviceId, this._brainRuntime.brainId);

    this._startedAt = Date.now();
  }

  public get state(): BrainServiceLifecycleState {
    return this._lifecycle.state;
  }

  public get brainRuntime(): BrainRuntime {
    return this._brainRuntime;
  }

  public get persistence(): BrainServicePersistence {
    return this._persistence;
  }

  public get auditLedger(): BrainServiceAuditLedger {
    return this._auditLedger;
  }

  /**
   * Start and bootstrap the Brain Service.
   * Transitions: CREATED -> INITIALIZING -> LOADING_STATE -> READY.
   */
  public async start(): Promise<void> {
    if (this._lifecycle.state !== 'CREATED') {
      return;
    }

    await this._lifecycle.bootstrap(async () => {
      // Durable state loaded in constructor
      const state = this._persistence.getState();
      this._healthMonitor.setPersistenceHealth(true);
      this._auditLedger.record('STATE_LOADED', {
        totalRequestsReceived: state.totalRequestsReceived,
        totalRequestsCompleted: state.totalRequestsCompleted,
      });
    });
  }

  /**
   * Submit an inbound request envelope for serialized execution.
   */
  public async handleRequest(
    rawRequest: unknown
  ): Promise<BrainServiceResponseEnvelope> {
    if (isServiceTerminal(this._lifecycle.state)) {
      throw new BrainServiceError(
        'BRAIN_SERVICE_SHUTTING_DOWN',
        `Service is in terminal state "${this._lifecycle.state}" and cannot accept requests.`,
        'DEGRADED'
      );
    }

    if (!canServiceAcceptRequest(this._lifecycle.state)) {
      throw new BrainServiceError(
        'BRAIN_SERVICE_NOT_READY',
        `Service is in state "${this._lifecycle.state}". It is not currently ready to accept new requests.`,
        'DEGRADED'
      );
    }

    // 1. Validate envelope structure
    const request = validateServiceRequest(rawRequest);

    // 2. Track request in persistence and health monitor
    this._persistence.recordRequestReceived();
    this._healthMonitor.recordRequestReceived();
    this._registry.registerSession(request.sessionId, request.deviceContext.deviceId);

    this._auditLedger.record(
      'REQUEST_ACCEPTED',
      {
        sessionId: request.sessionId,
        deviceId: request.deviceContext.deviceId,
      },
      request.requestId
    );

    // 3. Enqueue for serialized execution
    return new Promise<BrainServiceResponseEnvelope>((resolve, reject) => {
      try {
        this._queue.enqueue(request, resolve, reject);
        this._processQueue();
      } catch (err) {
        this._persistence.recordRequestFailed();
        this._healthMonitor.recordRequestFailure();
        reject(err);
      }
    });
  }

  /**
   * Process queue items one at a time (strictly serialized).
   */
  private async _processQueue(): Promise<void> {
    if (this._isProcessingQueue) return;
    this._isProcessingQueue = true;

    try {
      while (true) {
        const item: QueueItem | null = this._queue.dequeue();
        if (!item) break;

        try {
          if (canServiceAcceptRequest(this._lifecycle.state) || this._lifecycle.state === 'READY') {
            this._lifecycle.transition('RECEIVING');
            this._lifecycle.transition('PROCESSING');
          }

          const response = await this._worker.execute(item.request);
          item.resolve(response);
        } catch (err: any) {
          item.reject(err);
        } finally {
          this._queue.completeActive();
        }
      }
    } finally {
      this._isProcessingQueue = false;
    }
  }

  /**
   * Graceful shutdown of the service.
   */
  public async shutdown(options?: ShutdownOptions): Promise<void> {
    if (isServiceTerminal(this._lifecycle.state)) return;

    this._lifecycle.transition('SHUTTING_DOWN');
    await this._shutdownCoordinator.executeShutdown(options);
    this._lifecycle.transition('STOPPED');
    this._registry.unregisterAuthority(this.serviceId);
  }

  public getHealth(): BrainServiceHealthSnapshot {
    return this._healthMonitor.getSnapshot(
      this._lifecycle.state,
      this._queue.status,
      this._queue.depth
    );
  }

  public getSnapshot(): BrainServiceRuntimeSnapshot {
    const health = this.getHealth();
    return Object.freeze({
      version: '4.0.0',
      serviceId: this.serviceId,
      brainId: this._brainRuntime.brainId,
      hostMode: this.config.hostMode,
      state: this._lifecycle.state,
      health,
      queueDepth: this._queue.depth,
      totalAuditEvents: this._auditLedger.count,
      uptimeMs: Date.now() - this._startedAt,
      capturedAt: Date.now(),
    });
  }
}
