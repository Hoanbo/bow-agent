import type { NetworkAuditRecord, NetworkEventType, NetworkAdapterType, NetworkFailureCode } from './networkTypes.js';
export interface CreateNetworkAuditParams {
    readonly eventType: NetworkEventType;
    readonly networkConnectionId?: string;
    readonly adapterType?: NetworkAdapterType;
    readonly sequence?: number;
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'REJECTED' | 'THROTTLED';
    readonly failureCode?: NetworkFailureCode;
    readonly details?: string;
    readonly timestamp?: number;
}
/**
 * EN: Creates an immutable, secret-scrubbed NetworkAuditRecord.
 * VI: Khởi tạo một NetworkAuditRecord bất biến, đã được thanh lọc bí mật.
 */
export declare function createNetworkAuditRecord(params: CreateNetworkAuditParams): Readonly<NetworkAuditRecord>;
