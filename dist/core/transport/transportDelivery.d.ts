import type { TransportDeliveryState } from './transportStates.js';
import type { TransportFailureCode, BrainTransportMessage } from './transportTypes.js';
export interface TransportDeliveryRecord {
    readonly messageId: string;
    readonly connectionId: string;
    readonly sequence: number;
    readonly state: TransportDeliveryState;
    readonly failureCode?: TransportFailureCode;
    readonly failureReason?: string;
    readonly createdAt: number;
    readonly updatedAt: number;
    readonly sentAt?: number;
    readonly deliveredAt?: number;
    readonly acknowledgedAt?: number;
    readonly fingerprint: string;
}
/**
 * EN: Creates an initial TransportDeliveryRecord for an envelope.
 * VI: Khởi tạo một TransportDeliveryRecord ban đầu cho một phong bì.
 */
export declare function createDeliveryRecord(message: Readonly<BrainTransportMessage>, timestamp?: number): Readonly<TransportDeliveryRecord>;
/**
 * EN: Transitions delivery state following strict delivery transition matrix.
 * VI: Chuyển đổi trạng thái phân phối tuân theo ma trận chuyển đổi phân phối nghiêm ngặt.
 */
export declare function transitionDelivery(current: Readonly<TransportDeliveryRecord>, nextState: TransportDeliveryState, options?: {
    readonly failureCode?: TransportFailureCode;
    readonly failureReason?: string;
    readonly timestamp?: number;
}): Readonly<TransportDeliveryRecord>;
