// src/core/brain-service/brainServiceHealth.ts
// BOWCON V4.0 — MS-1.3.31: REAL BOWCON BRAIN SERVICE & CONTINUOUS RUNTIME
//
// Dynamic Service Health Monitoring & Telemetry.
export class BrainServiceHealthMonitor {
    serviceId;
    brainId;
    _startedAt;
    _metrics;
    _persistenceHealthy = true;
    _runtimeHealthy = true;
    _totalLatencyMs = 0;
    constructor(serviceId, brainId) {
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
    recordRequestReceived() {
        this._metrics.totalRequestsReceived++;
    }
    recordRequestSuccess(latencyMs) {
        this._metrics.totalRequestsCompleted++;
        this._metrics.consecutiveFailures = 0;
        this._metrics.lastRequestLatencyMs = latencyMs;
        this._totalLatencyMs += latencyMs;
        this._metrics.averageLatencyMs = Math.round(this._totalLatencyMs / this._metrics.totalRequestsCompleted);
    }
    recordRequestFailure() {
        this._metrics.totalRequestsFailed++;
        this._metrics.consecutiveFailures++;
    }
    recordIdempotentHit() {
        this._metrics.totalIdempotentHits++;
    }
    recordRecovery() {
        this._metrics.totalRecoveries++;
        this._metrics.consecutiveFailures = 0;
    }
    setPersistenceHealth(healthy) {
        this._persistenceHealthy = healthy;
    }
    setRuntimeHealth(healthy) {
        this._runtimeHealthy = healthy;
    }
    computeHealth(state, queueStatus) {
        if (state === 'STOPPED')
            return 'STOPPED';
        if (state === 'FAILED' || !this._persistenceHealthy || !this._runtimeHealthy) {
            return 'FAILED';
        }
        if (state === 'RECOVERING' || queueStatus === 'RECOVERING') {
            return 'RECOVERING';
        }
        if (state === 'DEGRADED' ||
            queueStatus === 'BACKPRESSURE' ||
            this._metrics.consecutiveFailures >= 3) {
            return 'DEGRADED';
        }
        return 'READY';
    }
    getSnapshot(state, queueStatus, queueDepth) {
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
