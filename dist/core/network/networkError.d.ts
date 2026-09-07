import type { NetworkFailureDescriptor, NetworkFailureCode } from './networkTypes.js';
export interface CreateNetworkFailureParams {
    readonly code: NetworkFailureCode;
    readonly message: string;
    readonly networkConnectionId?: string;
    readonly frameId?: string;
    readonly sequence?: number;
    readonly details?: string;
    readonly timestamp?: number;
}
/**
 * EN: Creates an immutable, secret-scrubbed NetworkFailureDescriptor.
 * VI: Khởi tạo một NetworkFailureDescriptor bất biến, đã được thanh lọc bí mật.
 */
export declare function createNetworkFailureDescriptor(params: CreateNetworkFailureParams): Readonly<NetworkFailureDescriptor>;
