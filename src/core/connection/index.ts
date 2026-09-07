// src/core/connection/index.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Canonical barrel export for the Connection and Session Runtime subsystem.

export * from './connectionTypes.js';

export {
  CONNECTION_STATES,
  type ConnectionState,
  SESSION_STATES,
  type SessionState,
  isConnectionState,
  isSessionState,
  isConnectionStateOperational,
  isConnectionStateTerminal,
  isSessionActive,
  isSessionTerminal,
} from './connectionStates.js';

export {
  CONNECTION_TRANSITION_MATRIX,
  SESSION_TRANSITION_MATRIX,
  isValidConnectionStateTransition,
  assertValidConnectionStateTransition,
  isValidSessionTransition,
  assertValidSessionTransition,
} from './connectionTransitions.js';

export {
  canonicalize,
  fnv1a32,
  computeConnectionRuntimeFingerprint,
} from './connectionFingerprint.js';

export * from './connectionIdentity.js';

export {
  validateScopeSegment,
  createConnectionScope,
  parseConnectionScope,
  assertConnectionScopeMatch,
  scrubConnectionSecrets,
} from './connectionScope.js';

export * from './connectionHandshake.js';
export * from './connectionAuthentication.js';
export * from './connectionAuthorization.js';
export * from './connectionSession.js';
export * from './connectionChannel.js';

export {
  type RiskLevel,
  RISK_LEVEL_PRECEDENCE,
  MAX_CONNECTION_PAYLOAD_BYTES,
  MAX_CORRELATION_DEPTH,
  type ConnectionMessageRisk,
  type ConnectionMessage,
  type CreateConnectionMessageParams,
  assertConnectionRiskNotDowngraded,
  createConnectionMessage,
} from './connectionMessage.js';

export * from './connectionOrdering.js';

export {
  type ConnectionReplayClassification,
  type ConnectionReplayEvaluation,
  ConnectionReplayDetector,
} from './connectionReplay.js';

export {
  type ConnectionHeartbeatSignal,
  type ConnectionHeartbeatAck,
  type ConnectionHeartbeatHealthStatus,
  createConnectionHeartbeatSignal,
  createConnectionHeartbeatAck,
  evaluateConnectionHeartbeat,
} from './connectionHeartbeat.js';

export * from './connectionReconnect.js';
export * from './connectionBackpressure.js';
export * from './connectionTimeout.js';
export * from './connectionFailure.js';
export * from './connectionAudit.js';
export * from './connectionRegistry.js';
export * from './connectionInMemoryAdapter.js';
export * from './connectionRuntime.js';
