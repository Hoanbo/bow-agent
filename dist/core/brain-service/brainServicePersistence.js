// src/core/brain-service/brainServicePersistence.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Crash-Safe Durable State Persistence Adapter using DurableJsonStore.
//
// INVARIANT: Durable state must survive restarts without corruption.
import fs from 'node:fs';
import { DurableJsonStore, } from '../persistence/durableJsonStore.js';
import { BRAIN_SERVICE_VERSION, makeBrainServiceId, } from './brainServiceTypes.js';
import { BrainServiceError } from './brainServiceFailure.js';
export function validateBrainServiceState(data) {
    if (!data || typeof data !== 'object') {
        return { success: false, errors: ['State payload must be a non-null object'] };
    }
    const s = data;
    const errors = [];
    if (typeof s.version !== 'string')
        errors.push('Missing or invalid "version"');
    if (typeof s.serviceId !== 'string')
        errors.push('Missing or invalid "serviceId"');
    if (typeof s.brainId !== 'string')
        errors.push('Missing or invalid "brainId"');
    if (typeof s.totalRequestsReceived !== 'number')
        errors.push('Missing or invalid "totalRequestsReceived"');
    if (typeof s.totalRequestsCompleted !== 'number')
        errors.push('Missing or invalid "totalRequestsCompleted"');
    if (typeof s.totalRequestsFailed !== 'number')
        errors.push('Missing or invalid "totalRequestsFailed"');
    if (!Array.isArray(s.completedRequestIds))
        errors.push('Missing or invalid "completedRequestIds"');
    if (typeof s.lastCommittedAt !== 'number')
        errors.push('Missing or invalid "lastCommittedAt"');
    if (errors.length > 0) {
        return { success: false, errors };
    }
    return { success: true, data: data };
}
export class BrainServicePersistence {
    _store;
    _state;
    _dirty = false;
    constructor(config, initialBrainId, initialServiceId) {
        // Ensure directory exists
        if (!fs.existsSync(config.dataDir)) {
            fs.mkdirSync(config.dataDir, { recursive: true });
        }
        const defaultServiceId = initialServiceId ?? makeBrainServiceId();
        const defaultFactory = () => ({
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
        this._store = new DurableJsonStore({
            filePath: config.stateFilePath,
            allowedBaseDir: config.dataDir,
            validator: validateBrainServiceState,
            defaultFactory,
        });
        try {
            this._state = this._store.read();
        }
        catch (err) {
            throw new BrainServiceError('BRAIN_SERVICE_PERSISTENCE_FAILED', `Failed to initialize or read durable state: ${err.message}`, 'FATAL', { error: err.message });
        }
    }
    getState() {
        return { ...this._state, completedRequestIds: [...this._state.completedRequestIds] };
    }
    isRequestCompleted(requestId) {
        return this._state.completedRequestIds.includes(requestId);
    }
    recordRequestReceived() {
        this._state = {
            ...this._state,
            totalRequestsReceived: this._state.totalRequestsReceived + 1,
        };
        this._dirty = true;
    }
    recordRequestCompleted(requestId) {
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
    recordRequestFailed() {
        this._state = {
            ...this._state,
            totalRequestsFailed: this._state.totalRequestsFailed + 1,
            lastCommittedAt: Date.now(),
        };
        this._dirty = true;
        this.flush();
    }
    recordShutdown() {
        this._state = {
            ...this._state,
            lastShutdownAt: Date.now(),
        };
        this._dirty = true;
        this.flush();
    }
    flush() {
        if (!this._dirty)
            return;
        try {
            this._store.write(this._state);
            this._dirty = false;
        }
        catch (err) {
            throw new BrainServiceError('BRAIN_SERVICE_PERSISTENCE_FAILED', `Failed to flush durable state to disk: ${err.message}`, 'FATAL', { error: err.message });
        }
    }
}
