import type { SyncCheckpoint } from './syncTypes.js';
export interface CreateSyncCheckpointParams {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence: number;
    readonly latestEventId: string;
    readonly latestEventFingerprint: string;
    readonly continuityId?: string;
    readonly activeSurfaces: readonly string[];
    readonly acknowledgedSurfaces: readonly string[];
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly timestamp?: number;
}
/**
 * EN: Creates an immutable synchronization checkpoint.
 * VI: Tạo một checkpoint đồng bộ hóa bất biến.
 */
export declare function createSyncCheckpoint(params: CreateSyncCheckpointParams): SyncCheckpoint;
