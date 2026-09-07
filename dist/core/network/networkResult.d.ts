import type { NetworkOperationResult, NetworkFailureDescriptor } from './networkTypes.js';
export interface CreateNetworkOperationResultParams {
    readonly success: boolean;
    readonly status: 'ACCEPTED' | 'REJECTED' | 'FAILED' | 'RATE_LIMITED';
    readonly networkConnectionId?: string;
    readonly frameId?: string;
    readonly error?: Readonly<NetworkFailureDescriptor>;
    readonly timestamp?: number;
}
/**
 * EN: Creates an immutable NetworkOperationResult.
 * VI: Khởi tạo một NetworkOperationResult bất biến.
 */
export declare function createNetworkOperationResult(params: CreateNetworkOperationResultParams): Readonly<NetworkOperationResult>;
