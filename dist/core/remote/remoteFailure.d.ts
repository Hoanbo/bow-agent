import type { RemoteFailureCode } from './remoteTypes.js';
export interface RemoteFailureDescriptor {
    readonly failureId: string;
    readonly failureCode: RemoteFailureCode;
    readonly peerId?: string;
    readonly remoteSessionId?: string;
    readonly reason: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable, secret-scrubbed RemoteFailureDescriptor.
 * VI: Khởi tạo một RemoteFailureDescriptor bất biến và đã được lọc sạch bí mật.
 */
export declare function createRemoteFailureDescriptor(params: {
    readonly failureCode: RemoteFailureCode;
    readonly reason: string;
    readonly peerId?: string;
    readonly remoteSessionId?: string;
    readonly timestamp?: number;
}): Readonly<RemoteFailureDescriptor>;
