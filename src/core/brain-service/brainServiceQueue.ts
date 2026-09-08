// src/core/brain-service/brainServiceQueue.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Serialized Request Queue & Backpressure Controller.
//
// INVARIANT: Requests must not execute concurrently against the single authoritative Brain.
// Serialized execution prevents cognitive race conditions.

import type { BrainQueueStatus, BrainServiceRequestEnvelope, BrainServiceResponseEnvelope } from './brainServiceTypes.js';
import { BrainServiceError } from './brainServiceFailure.js';

export interface QueueItem {
  readonly request: BrainServiceRequestEnvelope;
  readonly resolve: (res: BrainServiceResponseEnvelope) => void;
  readonly reject: (err: unknown) => void;
  readonly queuedAt: number;
}

export class BrainServiceQueue {
  private readonly _queue: QueueItem[] = [];
  private readonly _maxSize: number;
  private _status: BrainQueueStatus = 'IDLE';
  private _activeItem: QueueItem | null = null;

  constructor(maxSize = 50) {
    this._maxSize = maxSize;
  }

  public get status(): BrainQueueStatus {
    return this._status;
  }

  public get statusAfterActive(): BrainQueueStatus {
    if (this._queue.length === 0) return 'IDLE';
    return this._queue.length > (this._maxSize * 0.7) ? 'BUSY' : 'PROCESSING';
  }

  public get depth(): number {
    return this._queue.length;
  }

  public get isProcessing(): boolean {
    return this._activeItem !== null;
  }

  public setStatus(status: BrainQueueStatus): void {
    this._status = status;
  }

  public enqueue(
    request: BrainServiceRequestEnvelope,
    resolve: (res: BrainServiceResponseEnvelope) => void,
    reject: (err: unknown) => void
  ): void {
    if (this._queue.length >= this._maxSize) {
      this._status = 'BACKPRESSURE';
      throw new BrainServiceError(
        'BRAIN_SERVICE_BACKPRESSURE',
        `Request queue is full (capacity: ${this._maxSize}). Dropping request to prevent overload.`,
        'DEGRADED'
      );
    }

    this._queue.push({
      request,
      resolve,
      reject,
      queuedAt: Date.now(),
    });

    this._updateStatus();
  }

  public dequeue(): QueueItem | null {
    if (this._queue.length === 0) {
      this._activeItem = null;
      this._status = 'IDLE';
      return null;
    }

    this._activeItem = this._queue.shift()!;
    this._status = 'PROCESSING';
    return this._activeItem;
  }

  public completeActive(): void {
    this._activeItem = null;
    this._updateStatus();
  }

  public clear(reason: string): void {
    while (this._queue.length > 0) {
      const item = this._queue.shift()!;
      item.reject(
        new BrainServiceError(
          'BRAIN_SERVICE_SHUTTING_DOWN',
          `Queue cleared: ${reason}`,
          'RECOVERABLE'
        )
      );
    }
    this._activeItem = null;
    this._status = 'IDLE';
  }

  private _updateStatus(): void {
    if (this._activeItem !== null) {
      this._status = this._queue.length > (this._maxSize * 0.7) ? 'BUSY' : 'PROCESSING';
    } else if (this._queue.length === 0) {
      this._status = 'IDLE';
    } else {
      this._status = 'PROCESSING';
    }
  }
}
