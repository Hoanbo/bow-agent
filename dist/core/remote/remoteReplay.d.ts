import type { RemoteRequest } from './remoteTypes.js';
export type RemoteReplayClassification = 'ACCEPTED_NEW' | 'IDEMPOTENT_DUPLICATE' | 'REPLAY_CONFLICT' | 'CROSS_SCOPE_REJECTED' | 'STALE_REPLAY';
export interface RemoteReplayResult {
    readonly classification: RemoteReplayClassification;
    readonly requestId: string;
    readonly originalRequestId?: string;
    readonly reason: string;
}
/**
 * EN: Analyzes an incoming remote request against session history.
 * VI: Phân tích một yêu cầu từ xa đến so với lịch sử phiên.
 */
export declare function analyzeRemoteReplay(historyBySeq: ReadonlyMap<number, Readonly<RemoteRequest>>, historyById: ReadonlyMap<string, Readonly<RemoteRequest>>, incoming: Readonly<RemoteRequest>, expectedSessionId: string): Readonly<RemoteReplayResult>;
