export type TransportAuditAction = 'CONNECT' | 'DISCONNECT' | 'DISPATCH' | 'RECEIVE' | 'ACK' | 'NACK' | 'HEARTBEAT' | 'RESUME' | 'BACKPRESSURE';
export type TransportAuditOutcome = 'SUCCESS' | 'FAILURE' | 'DEGRADED' | 'REJECTED';
export interface TransportAuditRecord {
    readonly auditId: string;
    readonly connectionId: string;
    readonly messageId?: string;
    readonly action: TransportAuditAction;
    readonly outcome: TransportAuditOutcome;
    readonly details?: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable, secret-scrubbed TransportAuditRecord.
 * VI: Khởi tạo một TransportAuditRecord bất biến và đã được lọc sạch bí mật.
 */
export declare function createTransportAuditRecord(params: {
    readonly connectionId: string;
    readonly action: TransportAuditAction;
    readonly outcome: TransportAuditOutcome;
    readonly messageId?: string;
    readonly details?: string;
    readonly timestamp?: number;
}): Readonly<TransportAuditRecord>;
