import type { RemoteFailureCode } from './remoteTypes.js';
export type RemoteOutcomeStatus = 'ACCEPTED' | 'REJECTED' | 'AUTHENTICATED' | 'AUTHORIZED' | 'ESTABLISHED' | 'DISCONNECTED' | 'RECONNECTED' | 'FAILED';
export interface RemoteOperationResult {
    readonly resultId: string;
    readonly remoteSessionId?: string;
    readonly status: RemoteOutcomeStatus;
    readonly success: boolean;
    readonly failureCode?: RemoteFailureCode;
    readonly message?: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable RemoteOperationResult.
 * VI: Khởi tạo một RemoteOperationResult bất biến.
 */
export declare function createRemoteOperationResult(params: {
    readonly status: RemoteOutcomeStatus;
    readonly success: boolean;
    readonly remoteSessionId?: string;
    readonly failureCode?: RemoteFailureCode;
    readonly message?: string;
    readonly timestamp?: number;
}): Readonly<RemoteOperationResult>;
