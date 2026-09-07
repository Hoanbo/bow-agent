import type { TransportFailureCode } from './transportTypes.js';
export interface TransportFailureDescriptor {
    readonly failureId: string;
    readonly failureCode: TransportFailureCode;
    readonly messageId?: string;
    readonly connectionId?: string;
    readonly reason: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an immutable, secret-scrubbed TransportFailureDescriptor.
 * VI: Khởi tạo một TransportFailureDescriptor bất biến và đã được lọc sạch bí mật.
 */
export declare function createTransportFailureDescriptor(params: {
    readonly failureCode: TransportFailureCode;
    readonly reason: string;
    readonly messageId?: string;
    readonly connectionId?: string;
    readonly timestamp?: number;
}): Readonly<TransportFailureDescriptor>;
