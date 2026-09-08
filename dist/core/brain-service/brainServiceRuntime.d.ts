import { BrainRuntime } from '../brain/brainRuntime.js';
import { type BrainServiceId, type BrainServiceResponseEnvelope, type BrainServiceHealthSnapshot } from './brainServiceTypes.js';
import { type BrainServiceConfig, type ResolvedBrainServiceConfig } from './brainServiceConfig.js';
import { type BrainServiceLifecycleState } from './brainServiceStates.js';
import { BrainServiceAuditLedger } from './brainServiceAudit.js';
import { BrainServicePersistence } from './brainServicePersistence.js';
import { type ShutdownOptions } from './brainServiceShutdown.js';
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
export declare class BrainServiceRuntime {
    readonly serviceId: BrainServiceId;
    readonly config: ResolvedBrainServiceConfig;
    private readonly _brainRuntime;
    private readonly _auditLedger;
    private readonly _healthMonitor;
    private readonly _persistence;
    private readonly _lifecycle;
    private readonly _queue;
    private readonly _recovery;
    private readonly _shutdownCoordinator;
    private readonly _worker;
    private readonly _registry;
    private readonly _startedAt;
    private _isProcessingQueue;
    constructor(configOverrides?: BrainServiceConfig, brainRuntimeOverride?: BrainRuntime);
    get state(): BrainServiceLifecycleState;
    get brainRuntime(): BrainRuntime;
    get persistence(): BrainServicePersistence;
    get auditLedger(): BrainServiceAuditLedger;
    /**
     * Start and bootstrap the Brain Service.
     * Transitions: CREATED -> INITIALIZING -> LOADING_STATE -> READY.
     */
    start(): Promise<void>;
    /**
     * Submit an inbound request envelope for serialized execution.
     */
    handleRequest(rawRequest: unknown): Promise<BrainServiceResponseEnvelope>;
    /**
     * Process queue items one at a time (strictly serialized).
     */
    private _processQueue;
    /**
     * Graceful shutdown of the service.
     */
    shutdown(options?: ShutdownOptions): Promise<void>;
    getHealth(): BrainServiceHealthSnapshot;
    getSnapshot(): BrainServiceRuntimeSnapshot;
}
