export interface RemoteAuditRecord {
    readonly auditId: string;
    readonly eventType: string;
    readonly gatewayId: string;
    readonly peerId?: string;
    readonly remoteSessionId?: string;
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'REJECTED';
    readonly details?: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable, secret-scrubbed RemoteAuditRecord.
 * VI: Khởi tạo một RemoteAuditRecord bất biến và đã được lọc sạch bí mật.
 */
export declare function createRemoteAuditRecord(params: {
    readonly eventType: string;
    readonly gatewayId: string;
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'REJECTED';
    readonly peerId?: string;
    readonly remoteSessionId?: string;
    readonly details?: string;
    readonly timestamp?: number;
}): Readonly<RemoteAuditRecord>;
