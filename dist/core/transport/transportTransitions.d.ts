import type { TransportConnectionState, TransportDeliveryState } from './transportStates.js';
/**
 * EN: Valid state transition map for transport connections.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho các kết nối truyền tải.
 */
export declare const VALID_CONNECTION_TRANSITIONS: Readonly<Record<TransportConnectionState, ReadonlySet<TransportConnectionState>>>;
/**
 * EN: Checks if a connection transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi kết nối có hợp lệ hay không.
 */
export declare function isValidConnectionTransition(from: TransportConnectionState, to: TransportConnectionState): boolean;
/**
 * EN: Asserts valid connection transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi kết nối hợp lệ hoặc ném lỗi mô tả.
 */
export declare function assertValidConnectionTransition(from: TransportConnectionState, to: TransportConnectionState): void;
/**
 * EN: Valid state transition map for message delivery lifecycle.
 * VI: Bản đồ chuyển đổi trạng thái hợp lệ cho vòng đời phân phối thông điệp.
 */
export declare const VALID_DELIVERY_TRANSITIONS: Readonly<Record<TransportDeliveryState, ReadonlySet<TransportDeliveryState>>>;
/**
 * EN: Checks if a delivery transition is valid.
 * VI: Kiểm tra xem bước chuyển đổi phân phối có hợp lệ hay không.
 */
export declare function isValidDeliveryTransition(from: TransportDeliveryState, to: TransportDeliveryState): boolean;
/**
 * EN: Asserts valid delivery transition or throws descriptive error.
 * VI: Khẳng định chuyển đổi phân phối hợp lệ hoặc ném lỗi mô tả.
 */
export declare function assertValidDeliveryTransition(from: TransportDeliveryState, to: TransportDeliveryState): void;
