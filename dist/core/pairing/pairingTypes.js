// src/core/pairing/pairingTypes.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Invariants:
// - ONE AUTHORITATIVE BOWCON BRAIN: Device pairing does NOT create another Brain.
// - CONNECTED != PAIRED
// - PAIRED != AUTHENTICATED
// - AUTHENTICATED != AUTHORIZED
// - AUTHORIZED != EXECUTED
// - DELIVERED != TASK_SUCCESS
// - ACKNOWLEDGED != TASK_SUCCESS
// - DEVICE TRUST != BRAIN AUTHORITY
// - REMOTE SESSION != BRAIN SESSION
// - NETWORK CONNECTION != DEVICE TRUST
// - DEVICE TRUST != EXECUTION AUTHORITY
// - 9-tuple scope isolation: userId::sessionId::brainId::surfaceId::transportId::gatewayId::adapterId::connectionId::deviceId
export const PAIRING_PROTOCOL_VERSION = '4.0.0';
export const SUPPORTED_DEVICE_TYPES = Object.freeze([
    'BOW-MOBILE',
    'BOW-ROBOT',
    'DESKTOP',
    'WEB',
    'VOICE',
]);
export const ALL_PAIRING_STATES = Object.freeze([
    'UNPAIRED',
    'PAIRING_REQUESTED',
    'PAIRING_PENDING',
    'PAIRING_CONFIRMED',
    'PAIRED',
    'TRUSTED',
    'REVOKED',
    'EXPIRED',
    'REJECTED',
    'FAILED',
]);
export const ALL_TRUST_LEVELS = Object.freeze([
    'NONE',
    'PAIRED',
    'TRUSTED',
    'REVOKED',
    'LIMITED',
    'SUSPENDED',
]);
export const SAFE_DEVICE_CAPABILITIES = Object.freeze([
    'REQUEST_SCREEN_CAPTURE',
    'REQUEST_ROBOT_STATUS',
    'RECEIVE_EVENTS',
    'RECEIVE_SCREEN_RESULT',
    'RECEIVE_ROBOT_TELEMETRY',
]);
/**
 * Forbidden cognitive / execution escalation capabilities.
 * If any of these are requested in a pairing flow, pairing must fail closed.
 */
export const PAIRING_FORBIDDEN_CAPABILITIES = Object.freeze([
    'EXECUTE_TOOL',
    'MUTATE_BRAIN',
    'BYPASS_PDP',
    'BYPASS_APPROVAL',
    'MUTATE_COMMIT',
    'FORCE_RECOVERY',
    'CHANGE_GOVERNANCE',
]);
