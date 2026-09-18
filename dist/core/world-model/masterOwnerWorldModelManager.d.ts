import type { MasterOwnerWorldModelSnapshot, ProjectModel, VerifiedOutcomeRecord, WorldModelContradiction } from './worldModelTypes.js';
export declare class MasterOwnerWorldModelManager {
    private readonly _storagePath;
    private _currentSnapshot;
    private readonly _stalenessThresholdMs;
    constructor(storageDir?: string, stalenessThresholdMs?: number);
    private _createInitialSnapshot;
    getSnapshot(): MasterOwnerWorldModelSnapshot;
    isStale(): boolean;
    registerProject(project: ProjectModel): void;
    getProjects(): Record<string, ProjectModel>;
    refreshObservations(): void;
    addVerifiedOutcome(outcome: VerifiedOutcomeRecord): void;
    setContradictions(contradictions: WorldModelContradiction[]): void;
    persist(): void;
    rehydrate(): boolean;
    private _recalculateHash;
}
export declare const globalMasterOwnerWorldModelManager: MasterOwnerWorldModelManager;
