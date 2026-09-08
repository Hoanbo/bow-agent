import type { BrainRuntime } from '../brain/brainRuntime.js';
import type { BrainServicePersistence } from './brainServicePersistence.js';
import type { BrainServiceAuditLedger } from './brainServiceAudit.js';
import type { BrainServiceQueue } from './brainServiceQueue.js';
export interface ShutdownOptions {
    drainTimeoutMs?: number;
    reason?: string;
}
export declare class BrainServiceShutdownCoordinator {
    private readonly _brainRuntime;
    private readonly _persistence;
    private readonly _auditLedger;
    private readonly _queue;
    private _isShuttingDown;
    constructor(brainRuntime: BrainRuntime, persistence: BrainServicePersistence, auditLedger: BrainServiceAuditLedger, queue: BrainServiceQueue);
    get isShuttingDown(): boolean;
    executeShutdown(options?: ShutdownOptions): Promise<void>;
}
