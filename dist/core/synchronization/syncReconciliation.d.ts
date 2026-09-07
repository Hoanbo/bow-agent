import type { ReconciliationResult } from './syncTypes.js';
export interface AuthoritativeBrainState {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence: number;
    readonly latestEventId?: string;
    readonly latestEventFingerprint?: string;
    readonly getEventBySequence?: (sequence: number) => {
        eventId: string;
        fingerprint: string;
    } | undefined;
}
export interface IncomingSurfaceSyncState {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence: number;
    readonly latestEventId: string;
    readonly latestEventFingerprint: string;
}
/**
 * EN: Reconciles incoming synchronization state against authoritative Brain state.
 * VI: Hòa giải trạng thái đồng bộ hóa gửi đến so với trạng thái Não bộ có thẩm quyền.
 */
export declare function reconcileSynchronizationState(brainState: AuthoritativeBrainState, incomingState: IncomingSurfaceSyncState): ReconciliationResult;
