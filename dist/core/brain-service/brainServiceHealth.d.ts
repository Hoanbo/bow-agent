import { type BrainServiceHealthState, type BrainQueueStatus, type BrainServiceHealthSnapshot, type BrainServiceId } from './brainServiceTypes.js';
import type { BrainId } from '../brain/brainTypes.js';
import type { BrainServiceLifecycleState } from './brainServiceStates.js';
export declare class BrainServiceHealthMonitor {
    readonly serviceId: BrainServiceId;
    readonly brainId: BrainId;
    private readonly _startedAt;
    private readonly _metrics;
    private _persistenceHealthy;
    private _runtimeHealthy;
    private _totalLatencyMs;
    constructor(serviceId: BrainServiceId, brainId: BrainId);
    recordRequestReceived(): void;
    recordRequestSuccess(latencyMs: number): void;
    recordRequestFailure(): void;
    recordIdempotentHit(): void;
    recordRecovery(): void;
    setPersistenceHealth(healthy: boolean): void;
    setRuntimeHealth(healthy: boolean): void;
    computeHealth(state: BrainServiceLifecycleState, queueStatus: BrainQueueStatus): BrainServiceHealthState;
    getSnapshot(state: BrainServiceLifecycleState, queueStatus: BrainQueueStatus, queueDepth: number): BrainServiceHealthSnapshot;
}
