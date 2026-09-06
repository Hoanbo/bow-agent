import type { LifecycleCheckpoint, LifecycleStage, LifecycleState } from './lifecycleTypes.js';
export interface CreateCheckpointParams {
    readonly userId: string;
    readonly sessionId: string;
    readonly state: LifecycleState;
    readonly stage: LifecycleStage;
    readonly sequence: number;
    readonly correlationId?: string;
    readonly decisionId?: string;
    readonly executionId?: string;
    readonly timestamp?: number;
    readonly safeMetadata?: Readonly<Record<string, unknown>>;
}
/**
 * EN: Creates an immutable point-in-time LifecycleCheckpoint snapshot.
 * VI: Tạo một snapshot LifecycleCheckpoint bất biến tại một thời điểm.
 */
export declare function createLifecycleCheckpoint(params: CreateCheckpointParams): LifecycleCheckpoint;
