import { type BrainServiceRuntimeSnapshot } from './brainServiceRuntime.js';
import type { BrainRuntime } from '../brain/brainRuntime.js';
import type { BrainServiceConfig, ResolvedBrainServiceConfig } from './brainServiceConfig.js';
import type { BrainServiceRequestEnvelope, BrainServiceResponseEnvelope, BrainServiceHealthSnapshot, BrainServiceId, BrainDurableServiceState } from './brainServiceTypes.js';
import type { BrainServiceLifecycleState } from './brainServiceStates.js';
import type { BrainId } from '../brain/brainTypes.js';
export declare class BrainService {
    private readonly _runtime;
    constructor(config?: BrainServiceConfig, brainRuntimeOverride?: BrainRuntime);
    get serviceId(): BrainServiceId;
    get brainId(): BrainId;
    get config(): ResolvedBrainServiceConfig;
    get state(): BrainServiceLifecycleState;
    get brainRuntime(): BrainRuntime;
    /**
     * Start the Brain Service and load durable state.
     */
    start(): Promise<void>;
    /**
     * Handle an inbound Brain request envelope.
     */
    handleRequest(request: BrainServiceRequestEnvelope | unknown): Promise<BrainServiceResponseEnvelope>;
    /**
     * Graceful shutdown of the Brain Service.
     */
    shutdown(reason?: string): Promise<void>;
    /**
     * Get dynamic health snapshot.
     */
    getHealth(): BrainServiceHealthSnapshot;
    /**
     * Get full runtime snapshot.
     */
    getSnapshot(): BrainServiceRuntimeSnapshot;
    /**
     * Get durable persisted state.
     */
    getDurableState(): BrainDurableServiceState;
    /**
     * Get service audit events.
     */
    getAuditEvents(): readonly import("./brainServiceTypes.js").BrainServiceAuditEvent[];
}
export declare function getBrainService(config?: BrainServiceConfig): BrainService;
export declare function setBrainServiceForTest(service: BrainService | undefined): void;
