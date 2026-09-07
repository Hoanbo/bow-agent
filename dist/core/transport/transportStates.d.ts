/**
 * EN: Authoritative connection lifecycle states.
 * VI: Các trạng thái vòng đời kết nối có thẩm quyền.
 */
export type TransportConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DEGRADED' | 'RECONNECTING' | 'RESUMING' | 'CLOSING' | 'CLOSED' | 'FAILED' | 'BLOCKED';
export declare const ALL_CONNECTION_STATES: ReadonlySet<TransportConnectionState>;
/**
 * EN: Authoritative delivery lifecycle states for messages.
 * VI: Các trạng thái vòng đời phân phối có thẩm quyền cho thông điệp.
 */
export type TransportDeliveryState = 'CREATED' | 'VALIDATED' | 'QUEUED' | 'DISPATCHABLE' | 'SENT' | 'DELIVERED' | 'ACKNOWLEDGED' | 'REJECTED' | 'TIMED_OUT' | 'STALE' | 'DUPLICATE' | 'CONFLICTED' | 'FAILED' | 'SUPERSEDED';
export declare const ALL_DELIVERY_STATES: ReadonlySet<TransportDeliveryState>;
/**
 * EN: Authoritative backpressure / flow-control states.
 * VI: Các trạng thái kiểm soát lưu lượng / áp lực ngược có thẩm quyền.
 */
export type TransportBackpressureState = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'SATURATED' | 'BLOCKED';
export declare const ALL_BACKPRESSURE_STATES: ReadonlySet<TransportBackpressureState>;
/**
 * EN: Checks if a connection state represents an active / live connection.
 * VI: Kiểm tra xem trạng thái kết nối có biểu thị một kết nối đang hoạt động hay không.
 */
export declare function isConnectionActive(state: TransportConnectionState): boolean;
/**
 * EN: Checks if a connection state is terminal (cannot transition further).
 * VI: Kiểm tra xem trạng thái kết nối có phải là trạng thái kết thúc hay không.
 */
export declare function isConnectionTerminal(state: TransportConnectionState): boolean;
/**
 * EN: Checks if a delivery state is terminal.
 * VI: Kiểm tra xem trạng thái phân phối có phải là trạng thái kết thúc hay không.
 */
export declare function isDeliveryTerminal(state: TransportDeliveryState): boolean;
/**
 * EN: Checks if a delivery state represents successful transport acknowledgement.
 * VI: Kiểm tra xem trạng thái phân phối có biểu thị xác nhận truyền tải thành công hay không.
 *
 * IMPORTANT NOTE:
 * Transport ACK does NOT mean task execution success or verification success!
 */
export declare function isDeliverySuccessful(state: TransportDeliveryState): boolean;
