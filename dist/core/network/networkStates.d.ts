/**
 * EN: Authoritative network connection states.
 * VI: Các trạng thái kết nối mạng có thẩm quyền.
 */
export type NetworkConnectionState = 'CREATED' | 'CONNECTING' | 'OPEN' | 'ACTIVE' | 'IDLE' | 'DRAINING' | 'CLOSING' | 'CLOSED' | 'RECONNECTING' | 'SUSPENDED' | 'FAILED';
export declare const ALL_NETWORK_CONNECTION_STATES: ReadonlySet<NetworkConnectionState>;
/**
 * EN: Authoritative network adapter lifecycle states.
 * VI: Các trạng thái vòng đời bộ điều hợp mạng có thẩm quyền.
 */
export type NetworkAdapterState = 'INITIALIZING' | 'READY' | 'PAUSED' | 'STOPPED' | 'FAILED';
export declare const ALL_NETWORK_ADAPTER_STATES: ReadonlySet<NetworkAdapterState>;
/**
 * EN: Authoritative heartbeat lifecycle states.
 * VI: Các trạng thái vòng đời nhịp tim mạng có thẩm quyền.
 */
export type NetworkHeartbeatState = 'CREATED' | 'SENT' | 'RECEIVED' | 'ACKNOWLEDGED' | 'TIMED_OUT' | 'FAILED';
export declare const ALL_NETWORK_HEARTBEAT_STATES: ReadonlySet<NetworkHeartbeatState>;
/**
 * EN: Authoritative network backpressure states.
 * VI: Các trạng thái áp lực ngược mạng có thẩm quyền.
 */
export type NetworkBackpressureState = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'SATURATED' | 'BLOCKED';
export declare const ALL_NETWORK_BACKPRESSURE_STATES: ReadonlySet<NetworkBackpressureState>;
/**
 * EN: Checks if a network connection is in an active/operational state capable of transferring frames.
 * VI: Kiểm tra xem kết nối mạng có ở trạng thái hoạt động có thể truyền frame hay không.
 */
export declare function isNetworkConnectionActive(state: NetworkConnectionState): boolean;
/**
 * EN: Checks if a network connection is in a terminal state.
 * VI: Kiểm tra xem kết nối mạng có ở trạng thái kết thúc hay không.
 */
export declare function isNetworkConnectionTerminal(state: NetworkConnectionState): boolean;
/**
 * EN: Checks if a network adapter is ready to service connections.
 * VI: Kiểm tra xem bộ điều hợp mạng đã sẵn sàng phục vụ kết nối hay chưa.
 */
export declare function isNetworkAdapterReady(state: NetworkAdapterState): boolean;
