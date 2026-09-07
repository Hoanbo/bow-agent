import type { NetworkConnectionState, NetworkAdapterState, NetworkHeartbeatState } from './networkStates.js';
export declare const VALID_NETWORK_CONNECTION_TRANSITIONS: ReadonlyMap<NetworkConnectionState, ReadonlySet<NetworkConnectionState>>;
export declare const VALID_NETWORK_ADAPTER_TRANSITIONS: ReadonlyMap<NetworkAdapterState, ReadonlySet<NetworkAdapterState>>;
export declare const VALID_NETWORK_HEARTBEAT_TRANSITIONS: ReadonlyMap<NetworkHeartbeatState, ReadonlySet<NetworkHeartbeatState>>;
/**
 * EN: Checks if a network connection state transition is valid.
 * VI: Kiểm tra xem chuyển đổi trạng thái kết nối mạng có hợp lệ hay không.
 */
export declare function isValidNetworkConnectionTransition(from: NetworkConnectionState, to: NetworkConnectionState): boolean;
/**
 * EN: Asserts valid network connection transition or throws fail-closed error.
 * VI: Khẳng định chuyển đổi kết nối mạng hợp lệ hoặc ném lỗi thất bại đóng.
 */
export declare function assertValidNetworkConnectionTransition(from: NetworkConnectionState, to: NetworkConnectionState): void;
/**
 * EN: Checks if a network adapter state transition is valid.
 * VI: Kiểm tra xem chuyển đổi trạng thái bộ điều hợp mạng có hợp lệ hay không.
 */
export declare function isValidNetworkAdapterTransition(from: NetworkAdapterState, to: NetworkAdapterState): boolean;
/**
 * EN: Asserts valid network adapter transition or throws fail-closed error.
 * VI: Khẳng định chuyển đổi bộ điều hợp mạng hợp lệ hoặc ném lỗi thất bại đóng.
 */
export declare function assertValidNetworkAdapterTransition(from: NetworkAdapterState, to: NetworkAdapterState): void;
/**
 * EN: Checks if a heartbeat state transition is valid.
 * VI: Kiểm tra xem chuyển đổi trạng thái nhịp tim có hợp lệ hay không.
 */
export declare function isValidNetworkHeartbeatTransition(from: NetworkHeartbeatState, to: NetworkHeartbeatState): boolean;
/**
 * EN: Asserts valid heartbeat transition or throws fail-closed error.
 * VI: Khẳng định chuyển đổi nhịp tim hợp lệ hoặc ném lỗi thất bại đóng.
 */
export declare function assertValidNetworkHeartbeatTransition(from: NetworkHeartbeatState, to: NetworkHeartbeatState): void;
