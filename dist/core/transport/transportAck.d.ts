import type { TransportFailureCode, BrainTransportMessage } from './transportTypes.js';
export type AckClassification = 'RECEIVED' | 'VALIDATED' | 'PROCESSED' | 'REJECTED';
export declare const ALL_ACK_CLASSIFICATIONS: ReadonlySet<AckClassification>;
export interface TransportAckRecord {
    readonly ackId: string;
    readonly messageId: string;
    readonly connectionId: string;
    readonly surfaceId: string;
    readonly sequence: number;
    readonly correlationId: string;
    readonly classification: AckClassification;
    readonly details?: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
export interface TransportNackRecord {
    readonly nackId: string;
    readonly messageId: string;
    readonly connectionId: string;
    readonly surfaceId: string;
    readonly sequence: number;
    readonly correlationId: string;
    readonly failureCode: TransportFailureCode;
    readonly reason: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable TransportAckRecord.
 * VI: Khởi tạo một TransportAckRecord bất biến.
 */
export declare function createTransportAck(params: {
    readonly message: Readonly<BrainTransportMessage>;
    readonly classification: AckClassification;
    readonly details?: string;
    readonly timestamp?: number;
}): Readonly<TransportAckRecord>;
/**
 * EN: Creates an immutable TransportNackRecord for rejected / failed deliveries.
 * VI: Khởi tạo một TransportNackRecord bất biến cho các phân phối bị từ chối / thất bại.
 */
export declare function createTransportNack(params: {
    readonly message: Readonly<BrainTransportMessage>;
    readonly failureCode: TransportFailureCode;
    readonly reason: string;
    readonly timestamp?: number;
}): Readonly<TransportNackRecord>;
