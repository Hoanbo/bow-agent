import { type ValidationResult } from '../persistence/durableJsonStore.js';
import { type BrainDurableServiceState, type BrainServiceId } from './brainServiceTypes.js';
import type { BrainId } from '../brain/brainTypes.js';
import type { ResolvedBrainServiceConfig } from './brainServiceConfig.js';
export declare function validateBrainServiceState(data: unknown): ValidationResult<BrainDurableServiceState>;
export declare class BrainServicePersistence {
    private readonly _store;
    private _state;
    private _dirty;
    constructor(config: ResolvedBrainServiceConfig, initialBrainId: BrainId, initialServiceId?: BrainServiceId);
    getState(): BrainDurableServiceState;
    isRequestCompleted(requestId: string): boolean;
    recordRequestReceived(): void;
    recordRequestCompleted(requestId: string): void;
    recordRequestFailed(): void;
    recordShutdown(): void;
    flush(): void;
}
