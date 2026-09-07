import type { PlanRiskLevel } from '../planning/planningTypes.js';
export type { PlanRiskLevel };
/**
 * EN: Supported physical and logical network adapter types.
 * VI: Các loại bộ điều hợp mạng vật lý và logic được hỗ trợ.
 */
export type NetworkAdapterType = 'IN_MEMORY' | 'LOCAL' | 'LAN' | 'REMOTE';
export declare const ALL_NETWORK_ADAPTER_TYPES: ReadonlySet<NetworkAdapterType>;
/**
 * EN: Explicit network packet flow direction.
 * VI: Hướng luồng gói tin mạng rõ ràng.
 */
export type NetworkDirection = 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
export declare const ALL_NETWORK_DIRECTIONS: ReadonlySet<NetworkDirection>;
/**
 * EN: Network protocol operational mode.
 * VI: Chế độ vận hành giao thức mạng.
 */
export type NetworkProtocolMode = 'FRAMED_MESSAGE' | 'STREAM' | 'REQUEST_RESPONSE';
export declare const ALL_NETWORK_PROTOCOL_MODES: ReadonlySet<NetworkProtocolMode>;
/**
 * EN: Authoritative network event types.
 * VI: Các loại sự kiện mạng có thẩm quyền.
 */
export type NetworkEventType = 'CONNECTION_REQUESTED' | 'CONNECTION_ACCEPTED' | 'CONNECTION_REJECTED' | 'CONNECTION_OPENED' | 'CONNECTION_CLOSED' | 'CONNECTION_FAILED' | 'FRAME_RECEIVED' | 'FRAME_SENT' | 'MESSAGE_DECODED' | 'MESSAGE_ENCODE_FAILED' | 'HEARTBEAT_SENT' | 'HEARTBEAT_RECEIVED' | 'HEARTBEAT_TIMEOUT' | 'RECONNECT_REQUESTED' | 'RECONNECT_ACCEPTED' | 'RECONNECT_REJECTED' | 'NETWORK_BACKPRESSURE' | 'NETWORK_RECOVERED' | 'NETWORK_ERROR';
export declare const ALL_NETWORK_EVENT_TYPES: ReadonlySet<NetworkEventType>;
/**
 * EN: 7-tuple multi-tenant scoped network identity parameters.
 * Strictly prevents cross-tenant, cross-session, or cross-surface leaks.
 *
 * VI: Tham số định danh mạng theo phạm vi bộ 7 đa người dùng.
 * Ngăn chặn tuyệt đối rò rỉ xuyên người thuê, xuyên phiên hoặc xuyên bề mặt.
 */
export interface ScopedNetworkIdentity {
    readonly userId: string;
    readonly sessionId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly transportId: string;
    readonly gatewayId: string;
    readonly networkAdapterId: string;
}
/**
 * EN: Authoritative network connection identity record.
 * VI: Bản ghi định danh kết nối mạng có thẩm quyền.
 */
export interface NetworkConnectionIdentity {
    readonly networkConnectionId: string;
    readonly scope: ScopedNetworkIdentity;
    readonly scopeKey: string;
    readonly adapterType: NetworkAdapterType;
    readonly fingerprint: string;
}
/**
 * EN: Canonical immutable network frame contract.
 * VI: Hợp đồng khung mạng (frame) chuẩn mực bất biến.
 */
export interface NetworkFrame {
    readonly frameId: string;
    readonly protocolVersion: string;
    readonly networkConnectionId: string;
    readonly gatewayId: string;
    readonly transportId: string;
    readonly surfaceId: string;
    readonly sequence: number;
    readonly direction: NetworkDirection;
    readonly messageType: string;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly payloadLength: number;
    readonly checksum: string;
    readonly createdState: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Network heartbeat signal contract.
 * VI: Hợp đồng tín hiệu nhịp tim mạng.
 */
export interface NetworkHeartbeatSignal {
    readonly heartbeatId: string;
    readonly networkConnectionId: string;
    readonly sequence: number;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Network heartbeat acknowledgment contract.
 * VI: Hợp đồng xác nhận nhịp tim mạng.
 */
export interface NetworkHeartbeatAck {
    readonly ackId: string;
    readonly heartbeatId: string;
    readonly networkConnectionId: string;
    readonly roundTripTimeMs?: number;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Network timeout configuration contract.
 * VI: Hợp đồng cấu hình timeout mạng.
 */
export interface NetworkTimeoutConfig {
    readonly connectTimeoutMs: number;
    readonly frameTimeoutMs: number;
    readonly heartbeatTimeoutMs: number;
    readonly responseTimeoutMs: number;
    readonly reconnectTimeoutMs: number;
}
/**
 * EN: Network backpressure metrics snapshot.
 * VI: Snapshot chỉ số áp lực ngược (backpressure) mạng.
 */
export interface NetworkBackpressureMetrics {
    readonly pendingFrames: number;
    readonly maxCapacity: number;
    readonly pressureLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'SATURATED' | 'BLOCKED';
    readonly remainingCapacity: number;
    readonly fingerprint: string;
}
/**
 * EN: Typed network failure codes.
 * VI: Các mã lỗi mạng định kiểu.
 */
export type NetworkFailureCode = 'CONNECTION_TIMEOUT' | 'FRAME_TIMEOUT' | 'HEARTBEAT_TIMEOUT' | 'RESPONSE_TIMEOUT' | 'RECONNECT_TIMEOUT' | 'CONNECTION_REFUSED' | 'CONNECTION_RESET' | 'CONNECTION_CLOSED' | 'SCOPE_MISMATCH' | 'CROSS_SCOPE_REJECTED' | 'MALFORMED_FRAME' | 'OVERSIZED_PAYLOAD' | 'NESTING_TOO_DEEP' | 'CHECKSUM_MISMATCH' | 'SEQUENCE_GAP' | 'STALE_SEQUENCE' | 'SEQUENCE_ROLLBACK_REJECTED' | 'REPLAY_CONFLICT' | 'NETWORK_BACKPRESSURE_BLOCKED' | 'ADAPTER_UNAVAILABLE' | 'PROTOTYPE_POLLUTION_DETECTED' | 'NULL_BYTE_DETECTED' | 'PATH_TRAVERSAL_DETECTED' | 'WINDOWS_DEVICE_NAME_DETECTED' | 'SECRET_DETECTED' | 'PROTOCOL_MISMATCH';
/**
 * EN: Typed immutable failure descriptor for network layer.
 * VI: Bộ mô tả lỗi định kiểu bất biến cho tầng mạng.
 */
export interface NetworkFailureDescriptor {
    readonly failureId: string;
    readonly code: NetworkFailureCode;
    readonly message: string;
    readonly networkConnectionId?: string;
    readonly frameId?: string;
    readonly sequence?: number;
    readonly details?: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Immutable audit record for network activities.
 * VI: Bản ghi kiểm toán bất biến cho các hoạt động mạng.
 */
export interface NetworkAuditRecord {
    readonly auditId: string;
    readonly eventType: NetworkEventType;
    readonly networkConnectionId?: string;
    readonly adapterType?: NetworkAdapterType;
    readonly sequence?: number;
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'REJECTED' | 'THROTTLED';
    readonly failureCode?: NetworkFailureCode;
    readonly details?: string;
    readonly timestamp: number;
    readonly fingerprint: string;
}
/**
 * EN: Immutable network operation result.
 * VI: Kết quả thao tác mạng bất biến.
 */
export interface NetworkOperationResult {
    readonly operationId: string;
    readonly success: boolean;
    readonly networkConnectionId?: string;
    readonly frameId?: string;
    readonly status: 'ACCEPTED' | 'REJECTED' | 'FAILED' | 'RATE_LIMITED';
    readonly error?: Readonly<NetworkFailureDescriptor>;
    readonly timestamp: number;
    readonly fingerprint: string;
}
