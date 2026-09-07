import type { SyncObservation, SyncAcknowledgement, SyncCheckpoint, SynchronizationState, SyncHealth } from './syncTypes.js';
import type { SyncFailureCode } from './eventTypes.js';
import { EventRegistry } from './eventRegistry.js';
export declare class ScopedSynchronizationState {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly eventRegistry: EventRegistry;
    private readonly activeSurfaces;
    private readonly observationsBySurface;
    private readonly acknowledgementsBySurface;
    private latestCheckpoint?;
    private health;
    private lastError?;
    constructor(brainId: string, userId: string, sessionId: string);
    registerActiveSurface(surfaceId: string): void;
    removeActiveSurface(surfaceId: string): void;
    isSurfaceActive(surfaceId: string): boolean;
    getActiveSurfaces(): readonly string[];
    recordObservation(observation: SyncObservation): void;
    recordAcknowledgement(ack: SyncAcknowledgement): void;
    setLatestCheckpoint(checkpoint: SyncCheckpoint): void;
    getLatestCheckpoint(): SyncCheckpoint | undefined;
    setHealth(health: SyncHealth): void;
    getHealth(): SyncHealth;
    setLastError(error: {
        code: SyncFailureCode;
        reason: string;
        timestamp: number;
    }): void;
    getLastError(): {
        code: SyncFailureCode;
        reason: string;
        timestamp: number;
    } | undefined;
    getObservationsForSurface(surfaceId: string): readonly SyncObservation[];
    getAcknowledgementsForSurface(surfaceId: string): readonly SyncAcknowledgement[];
    /**
     * EN: Creates a deeply frozen snapshot of the current synchronization state.
     * VI: Tạo một ảnh chụp bất biến sâu về trạng thái đồng bộ hóa hiện tại.
     */
    toSnapshot(): SynchronizationState;
}
