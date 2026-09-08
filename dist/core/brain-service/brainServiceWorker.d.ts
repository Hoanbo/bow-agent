import type { BrainRuntime } from '../brain/brainRuntime.js';
import type { BrainServicePersistence } from './brainServicePersistence.js';
import type { BrainServiceHealthMonitor } from './brainServiceHealth.js';
import type { BrainServiceAuditLedger } from './brainServiceAudit.js';
import type { BrainServiceRecovery } from './brainServiceRecovery.js';
import { type BrainServiceRequestEnvelope, type BrainServiceResponseEnvelope } from './brainServiceTypes.js';
import type { BrainServiceLifecycleState } from './brainServiceStates.js';
import type { BrainServiceQueue } from './brainServiceQueue.js';
export interface WorkerCallbacks {
    onTransition: (state: BrainServiceLifecycleState) => void;
}
export declare class BrainServiceWorker {
    private readonly _brainRuntime;
    private readonly _persistence;
    private readonly _healthMonitor;
    private readonly _auditLedger;
    private readonly _recovery;
    private readonly _queue;
    private readonly _callbacks;
    private readonly _completedResults;
    constructor(brainRuntime: BrainRuntime, persistence: BrainServicePersistence, healthMonitor: BrainServiceHealthMonitor, auditLedger: BrainServiceAuditLedger, recovery: BrainServiceRecovery, queue: BrainServiceQueue, callbacks: WorkerCallbacks);
    execute(request: BrainServiceRequestEnvelope): Promise<BrainServiceResponseEnvelope>;
}
