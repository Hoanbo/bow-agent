// src/core/brain-service/brainServiceQueue.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Serialized Request Queue & Backpressure Controller.
//
// INVARIANT: Requests must not execute concurrently against the single authoritative Brain.
// Serialized execution prevents cognitive race conditions.
import { BrainServiceError } from './brainServiceFailure.js';
export class BrainServiceQueue {
    _queue = [];
    _maxSize;
    _status = 'IDLE';
    _activeItem = null;
    constructor(maxSize = 50) {
        this._maxSize = maxSize;
    }
    get status() {
        return this._status;
    }
    get statusAfterActive() {
        if (this._queue.length === 0)
            return 'IDLE';
        return this._queue.length > (this._maxSize * 0.7) ? 'BUSY' : 'PROCESSING';
    }
    get depth() {
        return this._queue.length;
    }
    get isProcessing() {
        return this._activeItem !== null;
    }
    setStatus(status) {
        this._status = status;
    }
    enqueue(request, resolve, reject) {
        if (this._queue.length >= this._maxSize) {
            this._status = 'BACKPRESSURE';
            throw new BrainServiceError('BRAIN_SERVICE_BACKPRESSURE', `Request queue is full (capacity: ${this._maxSize}). Dropping request to prevent overload.`, 'DEGRADED');
        }
        this._queue.push({
            request,
            resolve,
            reject,
            queuedAt: Date.now(),
        });
        this._updateStatus();
    }
    dequeue() {
        if (this._queue.length === 0) {
            this._activeItem = null;
            this._status = 'IDLE';
            return null;
        }
        this._activeItem = this._queue.shift();
        this._status = 'PROCESSING';
        return this._activeItem;
    }
    completeActive() {
        this._activeItem = null;
        this._updateStatus();
    }
    clear(reason) {
        while (this._queue.length > 0) {
            const item = this._queue.shift();
            item.reject(new BrainServiceError('BRAIN_SERVICE_SHUTTING_DOWN', `Queue cleared: ${reason}`, 'RECOVERABLE'));
        }
        this._activeItem = null;
        this._status = 'IDLE';
    }
    _updateStatus() {
        if (this._activeItem !== null) {
            this._status = this._queue.length > (this._maxSize * 0.7) ? 'BUSY' : 'PROCESSING';
        }
        else if (this._queue.length === 0) {
            this._status = 'IDLE';
        }
        else {
            this._status = 'PROCESSING';
        }
    }
}
