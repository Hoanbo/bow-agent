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
];
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
];
