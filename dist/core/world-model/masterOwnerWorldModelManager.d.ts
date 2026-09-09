import type { MasterOwnerWorldModelSnapshot, VerifiedOutcomeRecord, WorldModelContradiction } from './worldModelTypes.js';
export declare class MasterOwnerWorldModelManager {
    private readonly _storagePath;
    private _currentSnapshot;
    private readonly _stalenessThresholdMs;
    constructor(storageDir?: string, stalenessThresholdMs?: number);
    private _createInitialSnapshot;
    getSnapshot(): MasterOwnerWorldModelSnapshot;
    isStale(): boolean;
    refreshObservations(): void;
    addVerifiedOutcome(outcome: VerifiedOutcomeRecord): void;
    setContradictions(contradictions: WorldModelContradiction[]): void;
    persist(): void;
    rehydrate(): boolean;
    private _recalculateHash;
}
export declare const globalMasterOwnerWorldModelManager: MasterOwnerWorldModelManager;
