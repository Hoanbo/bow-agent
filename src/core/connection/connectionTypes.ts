// src/core/connection/connectionTypes.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Invariants:
// - ONE BOWCON BRAIN: ConnectionRuntime is a communication boundary, NOT a cognitive authority.
// - CONNECTED != AUTHENTICATED
// - AUTHENTICATED != AUTHORIZED
// - AUTHORIZED != EXECUTED
// - DELIVERED != TASK_SUCCESS
// - ACKNOWLEDGED != TASK_SUCCESS
// - SCREEN_CAPTURE_REQUEST != SCREEN_CAPTURE_EXECUTION
// - REMOTE_COMMAND != TOOL_EXECUTION
// - 8-tuple scope isolation: userId::sessionId::brainId::surfaceId::transportId::gatewayId::adapterId::connectionId

export const CONNECTION_PROTOCOL_VERSION = '4.0.0';

/**
 * 8-tuple ScopedConnectionIdentity
 * Enforces strict isolation across all connection dimensions.
 */
export interface ScopedConnectionIdentity {
  readonly userId: string;
  readonly sessionId: string;
  readonly brainId: string;
  readonly surfaceId: string;
  readonly transportId: string;
  readonly gatewayId: string;
  readonly adapterId: string;
  readonly connectionId: string;
}

/**
 * Valid connection directions
 */
export type ConnectionDirection = 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';

/**
 * Canonical logical channels separating message semantics
 */
export type ConnectionChannel =
  | 'CONTROL'
  | 'EVENT'
  | 'REQUEST'
  | 'RESPONSE'
  | 'ACK'
  | 'HEARTBEAT'
  | 'ERROR';

/**
 * Handshake stages
 */
export type HandshakeStage =
  | 'HELLO'
  | 'CAPABILITY_OFFER'
  | 'CAPABILITY_ACCEPT'
  | 'AUTH_REQUEST'
  | 'AUTH_RESULT'
  | 'SESSION_ESTABLISHED'
  | 'READY';

/**
 * Safe data-plane capabilities that can be negotiated.
 * NEVER allow execution/cognitive capabilities here.
 */
export const ALLOWED_DATA_CAPABILITIES = [
  'OBSERVE_EVENTS',
  'RECEIVE_STATUS',
  'SEND_STATUS',
  'ACK_MESSAGES',
  'REQUEST_SCREEN_CAPTURE',
  'RECEIVE_SCREEN_CAPTURE',
  'REQUEST_SCREEN_DESCRIPTION',
  'RECEIVE_DESCRIPTION',
  'REQUEST_ROBOT_STATUS',
  'RECEIVE_ROBOT_STATUS',
  'REQUEST_DEVICE_STATUS',
  'RECEIVE_DEVICE_STATUS',
] as const;

export type ConnectionCapability = (typeof ALLOWED_DATA_CAPABILITIES)[number];

/**
 * Forbidden cognitive & execution capabilities.
 * If any of these are requested, authorization MUST fail closed.
 */
export const FORBIDDEN_EXECUTION_CAPABILITIES = [
  'EXECUTE_TOOL',
  'DIRECT_TOOL_EXECUTION',
  'MUTATE_BRAIN',
  'BYPASS_PDP',
  'BYPASS_APPROVAL',
  'BYPASS_VERIFICATION',
  'BYPASS_COMMIT',
  'FORCE_RECOVERY',
  'CHANGE_GOVERNANCE',
] as const;

export type ForbiddenCapability = (typeof FORBIDDEN_EXECUTION_CAPABILITIES)[number];

/**
 * Canonical Connection Message Types
 */
export type ConnectionMessageType =
  | 'HELLO'
  | 'CAPABILITY_OFFER'
  | 'CAPABILITY_ACCEPT'
  | 'AUTH_REQUEST'
  | 'AUTH_RESULT'
  | 'SESSION_ESTABLISHED'
  | 'READY'
  | 'EVENT'
  | 'STATUS'
  | 'REQUEST'
  | 'RESPONSE'
  | 'HEARTBEAT_SIGNAL'
  | 'HEARTBEAT_ACK'
  | 'RECONNECT_REQUEST'
  | 'RECONNECT_ACK'
  | 'ACK'
  | 'NACK'
  | 'ERROR'
  | 'DISCONNECT'
  | 'CLOSE'
  | 'REQUEST_SCREEN_CAPTURE'
  | 'SCREEN_CAPTURE_READY'
  | 'SCREEN_CAPTURE_FAILED'
  | 'REQUEST_SCREEN_DESCRIPTION'
  | 'SCREEN_DESCRIPTION_READY'
  | 'REQUEST_ROBOT_STATUS'
  | 'RECEIVE_ROBOT_STATUS'
  | 'REQUEST_ROBOT_ACTION'
  | 'REQUEST_DEVICE_STATUS'
  | 'RECEIVE_DEVICE_STATUS';

/**
 * Connection Error / Failure Codes
 */
export type ConnectionFailureCode =
  | 'CONNECTION_SCOPE_MISMATCH'
  | 'CONNECTION_INVALID_TRANSITION'
  | 'CONNECTION_AUTHENTICATION_FAILED'
  | 'CONNECTION_AUTHORIZATION_DENIED'
  | 'CONNECTION_FORBIDDEN_CAPABILITY'
  | 'CONNECTION_SEQUENCE_GAP'
  | 'CONNECTION_SEQUENCE_REWIND'
  | 'CONNECTION_DUPLICATE_MESSAGE'
  | 'CONNECTION_MUTATED_REPLAY'
  | 'CONNECTION_CROSS_SCOPE_REPLAY'
  | 'CONNECTION_CONFLICTING_MESSAGE'
  | 'CONNECTION_HEARTBEAT_TIMEOUT'
  | 'CONNECTION_TIMEOUT'
  | 'CONNECTION_BACKPRESSURE_OVERFLOW'
  | 'CONNECTION_RISK_DOWNGRADE_DENIED'
  | 'CONNECTION_PAYLOAD_TOO_LARGE'
  | 'CONNECTION_CORRELATION_TOO_DEEP'
  | 'CONNECTION_PROTOCOL_DOWNGRADE'
  | 'CONNECTION_DISCONNECTED'
  | 'CONNECTION_ADAPTER_ERROR'
  | 'CONNECTION_SECURITY_VIOLATION';

/**
 * Connection Audit Event Types
 */
export type ConnectionAuditEventType =
  | 'CONNECTION_INITIATED'
  | 'CONNECTION_ESTABLISHED'
  | 'HANDSHAKE_STARTED'
  | 'HANDSHAKE_COMPLETED'
  | 'AUTHENTICATION_SUCCESS'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_SUCCESS'
  | 'AUTHORIZATION_DENIED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_RECEIVED'
  | 'ACK_RECEIVED'
  | 'NACK_RECEIVED'
  | 'HEARTBEAT_SENT'
  | 'HEARTBEAT_ACKED'
  | 'HEARTBEAT_TIMED_OUT'
  | 'RECONNECT_REQUESTED'
  | 'RECONNECT_SUCCEEDED'
  | 'RECONNECT_FAILED'
  | 'BACKPRESSURE_LEVEL_CHANGED'
  | 'DISCONNECTED'
  | 'SHUTDOWN_COMPLETED'
  | 'SECURITY_VIOLATION_BLOCKED';
