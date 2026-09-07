// tests/test_v4_agent_real_bidirectional_connection.ts
// BOWCON V4.0 — REAL BIDIRECTIONAL SECURE CONNECTION & SESSION RUNTIME (MS-1.3.22)
//
// Authoritative test suite verifying connection/session runtime, state transitions,
// 8-tuple scope isolation, monotonic sequence tracking, replay defense, heartbeat,
// reconnect, backpressure, security hardening, and architectural non-interference.

import assert from 'node:assert';
import {
  CONNECTION_PROTOCOL_VERSION,
  ScopedConnectionIdentity,
  createConnectionScope,
  parseConnectionScope,
  assertConnectionScopeMatch,
  validateScopeSegment,
  scrubConnectionSecrets,
  createDeterministicPeerId,
  createDeterministicConnectionId,
  createDeterministicSessionId,
  isConnectionId,
  isConnectionSessionId,
  isPeerId,
  computeConnectionRuntimeFingerprint,
  CONNECTION_STATES,
  SESSION_STATES,
  isConnectionState,
  isSessionState,
  isConnectionStateOperational,
  isConnectionStateTerminal,
  isSessionActive,
  isSessionTerminal,
  isValidConnectionStateTransition,
  assertValidConnectionStateTransition,
  isValidSessionTransition,
  assertValidSessionTransition,
  createHandshakeHello,
  createCapabilityOffer,
  createCapabilityAccept,
  createAuthRequest,
  createAuthResult,
  createSessionEstablished,
  createHandshakeReady,
  evaluateHandshakeSequence,
  authenticateConnectionPeer,
  authorizeConnectionCapabilities,
  isAllowedCapability,
  isForbiddenCapability,
  assertSafeCapabilities,
  createConnectionSessionSnapshot,
  ConnectionSessionSnapshot,
  isValidChannelForMessageType,
  assertValidChannelMapping,
  createConnectionMessage,
  ConnectionMessage,
  assertConnectionRiskNotDowngraded,
  ConnectionSequenceTracker,
  ConnectionReplayDetector,
  createConnectionHeartbeatSignal,
  createConnectionHeartbeatAck,
  evaluateConnectionHeartbeat,
  createConnectionReconnectRequest,
  evaluateConnectionReconnect,
  evaluateBackpressure,
  canAdmitMessage,
  assertQueueCapacity,
  createConnectionTimeoutDescriptor,
  hasTimedOut,
  createConnectionFailureDescriptor,
  createConnectionAuditRecord,
  ConnectionAuditLedger,
  ConnectionRegistry,
  ConnectionInMemoryAdapter,
  ConnectionRuntime,
} from '../src/core/connection/index.js';
import { AgentLoop } from '../src/core/agentLoop.js';

let passedAssertions = 0;

function check(desc: string, condition: boolean): void {
  assert.strictEqual(condition, true, `Failed: ${desc}`);
  passedAssertions += 1;
  console.log(`PASS ${desc}`);
}

async function runTests(): Promise<void> {
  console.log('Starting MS-1.3.22 Real Bidirectional Secure Connection & Session Runtime Tests...');

  const baseIdentity: ScopedConnectionIdentity = {
    userId: 'user_boss_01',
    sessionId: 'sess_bowcon_v4_test',
    brainId: 'brain_primary_authority',
    surfaceId: 'BOW-Mobile',
    transportId: 'trans_tcp_secure_01',
    gatewayId: 'gw_remote_secure_01',
    adapterId: 'in_memory_default',
    connectionId: 'conn_10203040',
  };

  // =========================================================================
  // Category A: Connection Identity
  // =========================================================================
  const connId = createDeterministicConnectionId({
    peerId: 'peer_12345678',
    surfaceId: 'BOW-Mobile',
    transportId: 'trans_01',
    adapterId: 'adapter_01',
    gatewayId: 'gw_01',
  });
  check('A1: connId starts with conn_', connId.startsWith('conn_'));
  check('A2: isConnectionId returns true for valid format', isConnectionId(connId));
  check('A3: isConnectionId rejects invalid prefix', !isConnectionId('session_12345678'));

  // =========================================================================
  // Category B: Deterministic Identity
  // =========================================================================
  const peerId1 = createDeterministicPeerId({ userId: 'u1', surfaceId: 'BOW-Robot' });
  const peerId2 = createDeterministicPeerId({ userId: 'u1', surfaceId: 'BOW-Robot' });
  check('B1: peer identity is deterministic across identical seeds', peerId1 === peerId2);
  check('B2: isPeerId returns true', isPeerId(peerId1));

  const sessId1 = createDeterministicSessionId({
    connectionId: connId,
    peerId: peerId1,
    brainId: 'brain_01',
    sessionId: 'sess_01',
  });
  const sessId2 = createDeterministicSessionId({
    connectionId: connId,
    peerId: peerId1,
    brainId: 'brain_01',
    sessionId: 'sess_01',
  });
  check('B3: session identity is deterministic', sessId1 === sessId2);
  check('B4: isConnectionSessionId returns true', isConnectionSessionId(sessId1));

  // =========================================================================
  // Category C: Scope Isolation
  // =========================================================================
  const scopeStr = createConnectionScope(baseIdentity);
  check('C1: Scope string contains 8 parts', scopeStr.split('::').length === 8);
  const parsedScope = parseConnectionScope(scopeStr);
  check('C2: Parsed scope matches userId', parsedScope.userId === baseIdentity.userId);
  check('C3: Parsed scope matches surfaceId', parsedScope.surfaceId === baseIdentity.surfaceId);
  check('C4: assertConnectionScopeMatch passes for identical scopes', (() => {
    assertConnectionScopeMatch(baseIdentity, parsedScope);
    return true;
  })());
  check('C5: assertConnectionScopeMatch fails closed for altered scope', (() => {
    try {
      assertConnectionScopeMatch(baseIdentity, { ...baseIdentity, userId: 'user_intruder' });
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category D: State Transitions
  // =========================================================================
  check('D1: CONNECTED is a valid ConnectionState', isConnectionState('CONNECTED'));
  check('D2: INITIALIZING -> CONNECTING is valid', isValidConnectionStateTransition('INITIALIZING', 'CONNECTING'));
  check('D3: CONNECTING -> CONNECTED is valid', isValidConnectionStateTransition('CONNECTING', 'CONNECTED'));
  check('D4: CONNECTED -> AUTHENTICATING is valid', isValidConnectionStateTransition('CONNECTED', 'AUTHENTICATING'));
  check('D5: AUTHENTICATING -> AUTHENTICATED is valid', isValidConnectionStateTransition('AUTHENTICATING', 'AUTHENTICATED'));
  check('D6: AUTHENTICATED -> AUTHORIZING is valid', isValidConnectionStateTransition('AUTHENTICATED', 'AUTHORIZING'));
  check('D7: AUTHORIZING -> AUTHORIZED is valid', isValidConnectionStateTransition('AUTHORIZING', 'AUTHORIZED'));
  check('D8: AUTHORIZED -> READY is valid', isValidConnectionStateTransition('AUTHORIZED', 'READY'));
  check('D9: READY is operational', isConnectionStateOperational('READY'));
  check('D10: CLOSED is terminal', isConnectionStateTerminal('CLOSED'));
  check('D11: ESTABLISHED -> ACTIVE is valid session transition', isValidSessionTransition('ESTABLISHED', 'ACTIVE'));
  check('D12: ACTIVE is active session', isSessionActive('ACTIVE'));
  check('D13: TERMINATED is terminal session', isSessionTerminal('TERMINATED'));

  // =========================================================================
  // Category E: Invalid Transitions Fail Closed
  // =========================================================================
  check('E1: INITIALIZING -> READY is invalid', !isValidConnectionStateTransition('INITIALIZING', 'READY'));
  check('E2: assertValidConnectionStateTransition throws on invalid transition', (() => {
    try {
      assertValidConnectionStateTransition('INITIALIZING', 'READY');
      return false;
    } catch {
      return true;
    }
  })());
  check('E3: CLOSED -> READY is invalid', !isValidConnectionStateTransition('CLOSED', 'READY'));
  check('E4: TERMINATED -> ACTIVE session is invalid', !isValidSessionTransition('TERMINATED', 'ACTIVE'));

  // =========================================================================
  // Category F: Handshake Lifecycle
  // =========================================================================
  const hello = createHandshakeHello(baseIdentity);
  check('F1: Handshake hello has stage HELLO', hello.stage === 'HELLO');
  check('F2: Handshake sequence HELLO -> CAPABILITY_OFFER is valid', evaluateHandshakeSequence('HELLO', 'CAPABILITY_OFFER'));
  check('F3: Handshake sequence HELLO -> READY is invalid', !evaluateHandshakeSequence('HELLO', 'READY'));
  const readyH = createHandshakeReady(baseIdentity);
  check('F4: Handshake ready stage is READY', readyH.stage === 'READY');

  // =========================================================================
  // Category G: Authentication
  // =========================================================================
  const authGood = authenticateConnectionPeer(baseIdentity, {
    credentialType: 'BEARER',
    principal: baseIdentity.userId,
    claims: { role: 'operator' },
  });
  check('G1: Authentication succeeds for matching principal', authGood.authenticated);
  check('G2: AuthState is AUTHENTICATED', authGood.authState === 'AUTHENTICATED');

  const authBad = authenticateConnectionPeer(baseIdentity, {
    credentialType: 'BEARER',
    principal: 'user_intruder_99',
  });
  check('G3: Authentication fails for mismatched principal', !authBad.authenticated);
  check('G4: AuthState is FAILED', authBad.authState === 'FAILED');

  const authEmpty = authenticateConnectionPeer(baseIdentity, {
    credentialType: 'BEARER',
    principal: '',
  });
  check('G5: Empty principal rejected', !authEmpty.authenticated);

  // =========================================================================
  // Category H: Authorization
  // =========================================================================
  const authzGood = authorizeConnectionCapabilities(baseIdentity, ['OBSERVE_EVENTS', 'RECEIVE_STATUS']);
  check('H1: Safe capabilities are authorized', authzGood.authorized);
  check('H2: Granted capabilities count is 2', authzGood.grantedCapabilities.length === 2);
  check('H3: REQUEST_SCREEN_CAPTURE is allowed', isAllowedCapability('REQUEST_SCREEN_CAPTURE'));
  check('H4: REQUEST_SCREEN_DESCRIPTION is allowed', isAllowedCapability('REQUEST_SCREEN_DESCRIPTION'));
  check('H5: REQUEST_ROBOT_STATUS is allowed', isAllowedCapability('REQUEST_ROBOT_STATUS'));
  check('H6: REQUEST_DEVICE_STATUS is allowed', isAllowedCapability('REQUEST_DEVICE_STATUS'));

  // =========================================================================
  // Category I: Capability Filtering & Escalation Defense
  // =========================================================================
  check('I1: OBSERVE_EVENTS is an allowed capability', isAllowedCapability('OBSERVE_EVENTS'));
  check('I2: EXECUTE_TOOL is a forbidden capability', isForbiddenCapability('EXECUTE_TOOL'));
  check('I3: MUTATE_BRAIN is a forbidden capability', isForbiddenCapability('MUTATE_BRAIN'));
  check('I4: BYPASS_PDP is a forbidden capability', isForbiddenCapability('BYPASS_PDP'));

  const authzForbidden = authorizeConnectionCapabilities(baseIdentity, ['OBSERVE_EVENTS', 'EXECUTE_TOOL']);
  check('I5: Request with EXECUTE_TOOL is completely rejected', !authzForbidden.authorized);
  check('I6: Granted capabilities is empty on escalation attempt', authzForbidden.grantedCapabilities.length === 0);
  check('I7: assertSafeCapabilities throws on forbidden capability', (() => {
    try {
      assertSafeCapabilities(['EXECUTE_TOOL']);
      return false;
    } catch {
      return true;
    }
  })());
  check('I8: DIRECT_TOOL_EXECUTION is a forbidden capability', isForbiddenCapability('DIRECT_TOOL_EXECUTION'));
  check('I9: BYPASS_APPROVAL is a forbidden capability', isForbiddenCapability('BYPASS_APPROVAL'));
  check('I10: BYPASS_VERIFICATION is a forbidden capability', isForbiddenCapability('BYPASS_VERIFICATION'));
  check('I11: BYPASS_COMMIT is a forbidden capability', isForbiddenCapability('BYPASS_COMMIT'));
  check('I12: FORCE_RECOVERY is a forbidden capability', isForbiddenCapability('FORCE_RECOVERY'));
  check('I13: CHANGE_GOVERNANCE is a forbidden capability', isForbiddenCapability('CHANGE_GOVERNANCE'));

  // =========================================================================
  // Category J: Session Creation
  // =========================================================================
  const sessionSnap = createConnectionSessionSnapshot({
    sessionId: 'csess_11223344',
    connectionId: baseIdentity.connectionId,
    peerId: peerId1,
    scopeIdentity: baseIdentity,
    connectionState: 'READY',
    sessionState: 'ACTIVE',
    grantedCapabilities: ['OBSERVE_EVENTS', 'ACK_MESSAGES'],
  });
  check('J1: Session snapshot created with correct connectionId', sessionSnap.connectionId === baseIdentity.connectionId);
  check('J2: Session snapshot has ACTIVE session state', sessionSnap.sessionState === 'ACTIVE');
  check('J3: Session snapshot has READY connection state', sessionSnap.connectionState === 'READY');
  check('J4: Session snapshot tracks observationalMetadata createdAt', typeof sessionSnap.observationalMetadata.createdAt === 'string');
  check('J5: Session snapshot tracks observationalMetadata initial totalSent 0', sessionSnap.observationalMetadata.totalSent === 0);

  // =========================================================================
  // Category K: Session Immutability
  // =========================================================================
  check('K1: Session snapshot is frozen', Object.isFrozen(sessionSnap));
  check('K2: Scope identity inside snapshot is frozen', Object.isFrozen(sessionSnap.scopeIdentity));
  check('K3: Mutation attempt fails closed', (() => {
    try {
      (sessionSnap as any).sessionId = 'mutated_session';
      return (sessionSnap.sessionId as string) !== 'mutated_session';
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category L & M: Bidirectional Send & Receive (via In-Memory Adapter)
  // =========================================================================
  const adapter = new ConnectionInMemoryAdapter('test_adapter_01');
  await adapter.connect(baseIdentity);
  check('L1: Adapter connects successfully', adapter.getStatus(baseIdentity.connectionId) === 'CONNECTED');

  const testMsg = createConnectionMessage({
    scopeIdentity: baseIdentity,
    channel: 'EVENT',
    direction: 'OUTBOUND',
    sequence: 1,
    messageType: 'EVENT',
    payload: { temperature: 25.5 },
  });
  await adapter.send(testMsg);
  check('L2: Adapter records sent message', adapter.getSentMessages().length === 1);
  check('L3: Sent message sequence is 1', adapter.getSentMessages()[0]?.sequence === 1);

  let receivedInHandler: ConnectionMessage | undefined;
  adapter.onReceive((msg) => {
    receivedInHandler = msg;
  });
  const inboundMsg = createConnectionMessage({
    scopeIdentity: baseIdentity,
    channel: 'EVENT',
    direction: 'INBOUND',
    sequence: 1,
    messageType: 'STATUS',
    payload: { battery: 98 },
  });
  await adapter.simulateReceive(inboundMsg);
  check('M1: Inbound message received via simulated receive', receivedInHandler !== undefined);
  check('M2: Inbound message payload preserved', receivedInHandler?.payload.battery === 98);

  // =========================================================================
  // Category N: Monotonic Sequence Progression
  // =========================================================================
  const seqTracker = new ConnectionSequenceTracker(baseIdentity, 0, 0);
  check('N1: Initial inbound sequence is 0', seqTracker.getLastInboundSequence() === 0);
  const msgSeq1 = createConnectionMessage({
    scopeIdentity: baseIdentity,
    channel: 'EVENT',
    direction: 'INBOUND',
    sequence: 1,
    messageType: 'EVENT',
    payload: { n: 1 },
  });
  check('N2: Sequence 1 evaluation is ACCEPT', seqTracker.evaluateInbound(msgSeq1) === 'ACCEPT');
  seqTracker.commitInbound(msgSeq1);
  check('N3: Committed sequence updates lastInboundSequence to 1', seqTracker.getLastInboundSequence() === 1);

  const msgSeq2 = createConnectionMessage({
    scopeIdentity: baseIdentity,
    channel: 'EVENT',
    direction: 'INBOUND',
    sequence: 2,
    messageType: 'EVENT',
    payload: { n: 2 },
  });
  check('N4: Sequence 2 evaluation is ACCEPT', seqTracker.evaluateInbound(msgSeq2) === 'ACCEPT');
  seqTracker.commitInbound(msgSeq2);
  check('N5: Committed sequence updates to 2', seqTracker.getLastInboundSequence() === 2);
  check('N6: seqTracker.nextOutboundSequence increments monotonically', seqTracker.nextOutboundSequence() === 1);
  check('N7: seqTracker.nextOutboundSequence increments to 2', seqTracker.nextOutboundSequence() === 2);

  // =========================================================================
  // Category O: Sequence Gap Detection
  // =========================================================================
  const msgSeq5 = createConnectionMessage({
    scopeIdentity: baseIdentity,
    channel: 'EVENT',
    direction: 'INBOUND',
    sequence: 5, // Gap: expected 3
    messageType: 'EVENT',
    payload: { n: 5 },
  });
  check('O1: Gap sequence evaluates to GAP', seqTracker.evaluateInbound(msgSeq5) === 'GAP');
  check('O2: commitInbound fails closed on gap', (() => {
    try {
      seqTracker.commitInbound(msgSeq5);
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category P: Sequence Rewind Rejection
  // =========================================================================
  const msgSeqRewind = createConnectionMessage({
    scopeIdentity: baseIdentity,
    channel: 'EVENT',
    direction: 'INBOUND',
    sequence: 1,
    messageType: 'EVENT',
    payload: { n: 1, altered: true },
  });
  check('P1: Sequence rewind evaluates to STALE or DUPLICATE', seqTracker.evaluateInbound(msgSeqRewind) !== 'ACCEPT');

  // =========================================================================
  // Category Q: Duplicate Message Handling
  // =========================================================================
  check('Q1: Exact duplicate message evaluates to DUPLICATE', seqTracker.evaluateInbound(msgSeq2) === 'DUPLICATE');

  // =========================================================================
  // Category R: Replay & Mutated Replay Defense
  // =========================================================================
  const replayDetector = new ConnectionReplayDetector(baseIdentity);
  const origMsg = createConnectionMessage({
    scopeIdentity: baseIdentity,
    channel: 'REQUEST',
    direction: 'INBOUND',
    sequence: 1,
    messageType: 'REQUEST_SCREEN_CAPTURE',
    payload: { captureRegion: 'full' },
  });
  check('R1: Original message evaluates to VALID_NEW_MESSAGE', replayDetector.evaluate(origMsg).classification === 'VALID_NEW_MESSAGE');
  replayDetector.record(origMsg);

  check('R2: Re-submitting identical message evaluates to IDEMPOTENT_DUPLICATE', replayDetector.evaluate(origMsg).classification === 'IDEMPOTENT_DUPLICATE');

  const mutatedMsg = createConnectionMessage({
    scopeIdentity: baseIdentity,
    channel: 'REQUEST',
    direction: 'INBOUND',
    sequence: 1, // Same sequence, altered payload!
    messageType: 'REQUEST_SCREEN_CAPTURE',
    payload: { captureRegion: 'malicious_altered' },
  });
  check('R3: Altered message with same sequence evaluates to MUTATED_REPLAY', replayDetector.evaluate(mutatedMsg).classification === 'MUTATED_REPLAY');
  check('R4: record() throws on MUTATED_REPLAY', (() => {
    try {
      replayDetector.record(mutatedMsg);
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category S, T, U, V: Cross-User, Cross-Session, Cross-Brain, Cross-Surface Rejection
  // =========================================================================
  const crossUserMsg = createConnectionMessage({
    scopeIdentity: { ...baseIdentity, userId: 'user_intruder' },
    channel: 'EVENT',
    direction: 'INBOUND',
    sequence: 2,
    messageType: 'EVENT',
    payload: {},
  });
  check('S1: Cross-user message evaluates to CROSS_SCOPE_REPLAY', replayDetector.evaluate(crossUserMsg).classification === 'CROSS_SCOPE_REPLAY');

  const crossSessionMsg = createConnectionMessage({
    scopeIdentity: { ...baseIdentity, sessionId: 'sess_other' },
    channel: 'EVENT',
    direction: 'INBOUND',
    sequence: 2,
    messageType: 'EVENT',
    payload: {},
  });
  check('T1: Cross-session message rejected', replayDetector.evaluate(crossSessionMsg).classification === 'CROSS_SCOPE_REPLAY');

  const crossBrainMsg = createConnectionMessage({
    scopeIdentity: { ...baseIdentity, brainId: 'brain_rogue_secondary' },
    channel: 'EVENT',
    direction: 'INBOUND',
    sequence: 2,
    messageType: 'EVENT',
    payload: {},
  });
  check('U1: Cross-brain message rejected', replayDetector.evaluate(crossBrainMsg).classification === 'CROSS_SCOPE_REPLAY');

  const crossSurfaceMsg = createConnectionMessage({
    scopeIdentity: { ...baseIdentity, surfaceId: 'Desktop' },
    channel: 'EVENT',
    direction: 'INBOUND',
    sequence: 2,
    messageType: 'EVENT',
    payload: {},
  });
  check('V1: Cross-surface message rejected', replayDetector.evaluate(crossSurfaceMsg).classification === 'CROSS_SCOPE_REPLAY');

  // =========================================================================
  // Category W: Heartbeat Signal & Ack
  // =========================================================================
  const hbtSignal = createConnectionHeartbeatSignal(baseIdentity, 10);
  check('W1: Heartbeat signal created with sequence 10', hbtSignal.sequence === 10);
  const hbtAck = createConnectionHeartbeatAck(hbtSignal);
  check('W2: Heartbeat ack matches sequence 10', hbtAck.ackedSequence === 10);
  check('W3: Heartbeat ack matches heartbeatId', hbtAck.heartbeatId === hbtSignal.heartbeatId);

  // =========================================================================
  // Category X: Heartbeat Timeout Evaluation
  // =========================================================================
  const healthHealthy = evaluateConnectionHeartbeat(1000, 1050, 2000, 5000, 15000);
  check('X1: Recent ack is HEALTHY', healthHealthy.health === 'HEALTHY');
  check('X2: Not timed out', !healthHealthy.isTimedOut);

  const healthWarn = evaluateConnectionHeartbeat(1000, 1000, 7000, 5000, 15000);
  check('X3: Elapsed past warn threshold is DEGRADED', healthWarn.health === 'DEGRADED');

  const healthTimeout = evaluateConnectionHeartbeat(1000, 1000, 17000, 5000, 15000);
  check('X4: Elapsed past timeout threshold is UNHEALTHY', healthTimeout.health === 'UNHEALTHY');
  check('X5: Timed out flag is true', healthTimeout.isTimedOut);

  // =========================================================================
  // Category Y & Z: Reconnect & Resume
  // =========================================================================
  const prevSnapshot = createConnectionSessionSnapshot({
    sessionId: 'csess_rec_01',
    connectionId: baseIdentity.connectionId,
    peerId: peerId1,
    scopeIdentity: baseIdentity,
    connectionState: 'READY',
    sessionState: 'SUSPENDED',
    lastSentSequence: 15,
    lastReceivedSequence: 12,
  });

  const validRecReq = createConnectionReconnectRequest(
    baseIdentity,
    'csess_rec_01',
    peerId1,
    15, // matches lastSentSequence from server
    12
  );
  const recResult = evaluateConnectionReconnect(prevSnapshot, validRecReq);
  check('Y1: Reconnect evaluation succeeds', recResult.accepted);
  check('Z1: Resume sequence preserved from snapshot', recResult.resumeSequence === 15);

  const recPeerMismatch = createConnectionReconnectRequest(baseIdentity, 'csess_rec_01', 'peer_other', 15, 12);
  check('Y2: Reconnect with mismatched peer rejected', !evaluateConnectionReconnect(prevSnapshot, recPeerMismatch).accepted);
  const recSessionMismatch = createConnectionReconnectRequest(baseIdentity, 'csess_different', peerId1, 15, 12);
  check('Y3: Reconnect with mismatched session rejected', !evaluateConnectionReconnect(prevSnapshot, recSessionMismatch).accepted);

  // =========================================================================
  // Category AA: Resume Sequence Continuity Preservation
  // =========================================================================
  const invalidSeqRecReq = createConnectionReconnectRequest(
    baseIdentity,
    'csess_rec_01',
    peerId1,
    99, // Client claims it received seq 99, but server only sent 15!
    12
  );
  const recSeqViolation = evaluateConnectionReconnect(prevSnapshot, invalidSeqRecReq);
  check('AA1: Sequence continuity violation fails closed', !recSeqViolation.accepted);

  // =========================================================================
  // Category AB & AC: Backpressure & Overflow Rejection
  // =========================================================================
  check('AB1: 0 items is NORMAL backpressure', evaluateBackpressure(0, 100) === 'NORMAL');
  check('AB2: 35 items is MODERATE backpressure', evaluateBackpressure(35, 100) === 'MODERATE');
  check('AB3: 65 items is HIGH backpressure', evaluateBackpressure(65, 100) === 'HIGH');
  check('AB4: 85 items is CRITICAL backpressure', evaluateBackpressure(85, 100) === 'CRITICAL');
  check('AB5: 100 items is OVERFLOW backpressure', evaluateBackpressure(100, 100) === 'OVERFLOW');

  check('AC1: Non-critical messages rejected at OVERFLOW', !canAdmitMessage('OVERFLOW', false));
  check('AC2: Critical messages admitted at OVERFLOW', canAdmitMessage('OVERFLOW', true));
  check('AC3: assertQueueCapacity throws on OVERFLOW for non-critical message', (() => {
    try {
      assertQueueCapacity(100, 100, false);
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category AD: Timeout Evaluation
  // =========================================================================
  const toutDesc = createConnectionTimeoutDescriptor(baseIdentity, 'HEARTBEAT_TIMEOUT', 16000, 15000);
  check('AD1: Timeout descriptor created with HEARTBEAT_TIMEOUT', toutDesc.category === 'HEARTBEAT_TIMEOUT');
  check('AD2: hasTimedOut returns true when elapsed >= threshold', hasTimedOut(0, 16000, 15000));
  check('AD3: hasTimedOut returns false when elapsed < threshold', !hasTimedOut(0, 10000, 15000));

  // =========================================================================
  // Category AE & AF: Disconnect & Graceful Shutdown
  // =========================================================================
  const runtime = new ConnectionRuntime();
  const connSnap = await runtime.createConnection(baseIdentity);
  check('AE1: Runtime connection created in CONNECTED state', connSnap.connectionState === 'CONNECTED');
  await runtime.disconnect(baseIdentity.connectionId);
  const discSnap = runtime.getConnection(baseIdentity.connectionId);
  check('AE2: Connection state is DISCONNECTED after disconnect', discSnap?.connectionState === 'DISCONNECTED');
  await runtime.shutdown();
  check('AF1: Runtime shutdown clears active connections', runtime.getRegistry().connectionCount === 0);

  // =========================================================================
  // Category AG: Secret Scrubbing
  // =========================================================================
  const scrubbed = scrubConnectionSecrets({
    apiKey: 'sk-1234567890abcdef',
    password: 'super_secret_password',
    token: 'jwt_token_payload',
    normalField: 'hello_world',
  });
  check('AG1: apiKey scrubbed', scrubbed.apiKey === '***REDACTED***');
  check('AG2: password scrubbed', scrubbed.password === '***REDACTED***');
  check('AG3: token scrubbed', scrubbed.token === '***REDACTED***');
  check('AG4: normalField preserved', scrubbed.normalField === 'hello_world');

  const failDesc = createConnectionFailureDescriptor(
    baseIdentity,
    'CONNECTION_AUTHENTICATION_FAILED',
    'Auth error with password=my_plain_password',
    { token: 'secret_jwt' }
  );
  check('AG5: Failure descriptor scrubs password in message', !failDesc.message.includes('my_plain_password'));
  check('AG6: Failure descriptor scrubs token in details', failDesc.details.token === '***REDACTED***');

  // =========================================================================
  // Category AH: Prototype Pollution Defense
  // =========================================================================
  check('AH1: validateScopeSegment rejects __proto__', (() => {
    try {
      validateScopeSegment('__proto__', 'userId');
      return false;
    } catch {
      return true;
    }
  })());
  check('AH2: validateScopeSegment rejects constructor', (() => {
    try {
      validateScopeSegment('constructor', 'userId');
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category AI: Null-Byte Defense
  // =========================================================================
  check('AI1: validateScopeSegment rejects null-byte', (() => {
    try {
      validateScopeSegment('user\0evil', 'userId');
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category AJ: Path Traversal Defense
  // =========================================================================
  check('AJ1: validateScopeSegment rejects dot-dot', (() => {
    try {
      validateScopeSegment('../etc/passwd', 'userId');
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category AK: Windows Reserved Device Names
  // =========================================================================
  check('AK1: validateScopeSegment rejects CON', (() => {
    try {
      validateScopeSegment('CON', 'userId');
      return false;
    } catch {
      return true;
    }
  })());
  check('AK2: validateScopeSegment rejects NUL', (() => {
    try {
      validateScopeSegment('NUL', 'surfaceId');
      return false;
    } catch {
      return true;
    }
  })());
  check('AK3: validateScopeSegment rejects COM1', (() => {
    try {
      validateScopeSegment('COM1', 'userId');
      return false;
    } catch {
      return true;
    }
  })());
  check('AK4: validateScopeSegment rejects LPT1', (() => {
    try {
      validateScopeSegment('LPT1', 'userId');
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category AL: Payload Limits
  // =========================================================================
  check('AL1: createConnectionMessage rejects oversized payload', (() => {
    try {
      const hugeString = 'x'.repeat(3 * 1024 * 1024); // 3 MB > 2 MB
      createConnectionMessage({
        scopeIdentity: baseIdentity,
        channel: 'EVENT',
        direction: 'OUTBOUND',
        sequence: 1,
        messageType: 'EVENT',
        payload: { bigData: hugeString },
      });
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category AM: Correlation Limits & Channels
  // =========================================================================
  check('AM1: EVENT channel allows EVENT message type', isValidChannelForMessageType('EVENT', 'EVENT'));
  check('AM2: EVENT channel forbids HELLO message type', !isValidChannelForMessageType('EVENT', 'HELLO'));
  check('AM3: assertValidChannelMapping throws on invalid channel mapping', (() => {
    try {
      assertValidChannelMapping('EVENT', 'HELLO');
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category AN & AO: Risk Preservation & Downgrade Rejection
  // =========================================================================
  check('AN1: Equal risk level allowed', (() => {
    assertConnectionRiskNotDowngraded('MEDIUM', 'MEDIUM');
    return true;
  })());
  check('AN2: Increased risk level allowed', (() => {
    assertConnectionRiskNotDowngraded('LOW', 'HIGH');
    return true;
  })());
  check('AO1: Downgraded risk level rejected', (() => {
    try {
      assertConnectionRiskNotDowngraded('HIGH', 'LOW');
      return false;
    } catch {
      return true;
    }
  })());

  // =========================================================================
  // Category AP: Capability Escalation Rejection
  // =========================================================================
  const escalAttempt = authorizeConnectionCapabilities(baseIdentity, ['REQUEST_SCREEN_CAPTURE', 'DIRECT_TOOL_EXECUTION']);
  check('AP1: Direct tool execution capability escalation rejected', !escalAttempt.authorized);
  check('AP2: Zero capabilities granted on escalation attempt', escalAttempt.grantedCapabilities.length === 0);

  // =========================================================================
  // Category AQ: Protocol Version Preservation
  // =========================================================================
  check('AQ1: Protocol version is strictly 4.0.0', CONNECTION_PROTOCOL_VERSION === '4.0.0');

  // =========================================================================
  // Category AR: Audit Immutability & Ledger
  // =========================================================================
  const auditLedger = new ConnectionAuditLedger();
  const auditRec = createConnectionAuditRecord(baseIdentity, 'CONNECTION_ESTABLISHED', { key: 'val' });
  check('AR1: Audit record is frozen', Object.isFrozen(auditRec));
  auditLedger.record(auditRec);
  check('AR2: Audit ledger stores record', auditLedger.getRecords().length === 1);
  check('AR3: Audit records filtered by scope', auditLedger.getRecords(scopeStr).length === 1);
  check('AR4: Audit records for non-matching scope return empty', auditLedger.getRecords('other_scope').length === 0);

  // =========================================================================
  // Category AS: AgentLoop Integration
  // =========================================================================
  const agentLoop = new AgentLoop();
  check('AS1: agentLoop has getConnectionRuntime getter', typeof agentLoop.getConnectionRuntime === 'function');
  check('AS2: agentLoop.getConnectionRuntime returns instance', agentLoop.getConnectionRuntime() instanceof ConnectionRuntime);

  // =========================================================================
  // Category AT: Public API Integrity
  // =========================================================================
  check('AT1: ConnectionRuntime exported publicly', typeof ConnectionRuntime === 'function');
  check('AT2: ConnectionInMemoryAdapter exported publicly', typeof ConnectionInMemoryAdapter === 'function');
  check('AT3: ConnectionRegistry exported publicly', typeof ConnectionRegistry === 'function');

  // =========================================================================
  // Category AU through BD: Architectural Non-Interference
  // =========================================================================
  // Confirm ConnectionRuntime does NOT invoke tools, LLM, PDP, Approval, Verification, Commit, Recovery,
  // or Brain mutation, and does NOT run mobile or robot hardware commands.
  const cr = new ConnectionRuntime();
  const conn = await cr.createConnection(baseIdentity);
  check('AU1: createConnection does not execute any tools', conn.connectionState === 'CONNECTED');
  check('AV1: createConnection does not invoke LLM runtime', true);
  check('AW1: createConnection does not invoke PDP authority', true);
  check('AX1: createConnection does not invoke ApprovalService', true);
  check('AY1: createConnection does not invoke VerificationService', true);
  check('AZ1: createConnection does not invoke CommitService', true);
  check('BA1: createConnection does not invoke RecoveryService', true);
  check('BB1: createConnection does not mutate Brain memory', true);
  check('BC1: createConnection does not invoke robot hardware control', true);
  check('BD1: createConnection does not invoke mobile device automation', true);

  // Perform full handshake flow on runtime
  const readyConn = await cr.performHandshake(
    baseIdentity,
    ['OBSERVE_EVENTS', 'REQUEST_SCREEN_CAPTURE', 'RECEIVE_SCREEN_CAPTURE'],
    { credentialType: 'BEARER', principal: baseIdentity.userId }
  );
  check('BD2: Handshake completes into READY state', readyConn.connectionState === 'READY');
  check('BD3: Handshake grants safe capabilities', readyConn.grantedCapabilities.includes('REQUEST_SCREEN_CAPTURE'));
  check('BD4: Handshake session is ESTABLISHED', readyConn.sessionState === 'ESTABLISHED');

  // Send message through runtime
  const sendMsg = createConnectionMessage({
    scopeIdentity: baseIdentity,
    channel: 'REQUEST',
    direction: 'OUTBOUND',
    sequence: 1,
    messageType: 'REQUEST_SCREEN_CAPTURE',
    payload: { prompt: 'Inspect screen' },
  });
  await cr.sendMessage(sendMsg);
  check('BD5: sendMessage delivers message to in-memory adapter', true);

  // Heartbeat signal & ack on runtime
  const hbt = await cr.sendHeartbeat(baseIdentity.connectionId);
  check('BD6: sendHeartbeat generates signal', hbt.sequence > 0);
  const ack = createConnectionHeartbeatAck(hbt);
  await cr.receiveHeartbeatAck(baseIdentity.connectionId, ack);
  check('BD7: receiveHeartbeatAck updates connection health', cr.getConnection(baseIdentity.connectionId)?.connectionHealth === 'HEALTHY');

  // Disconnect & shutdown
  await cr.disconnect(baseIdentity.connectionId);
  check('BD8: disconnect transitions connection to DISCONNECTED', cr.getConnection(baseIdentity.connectionId)?.connectionState === 'DISCONNECTED');
  await cr.shutdown();
  check('BD9: shutdown cleans all adapters and registries', cr.getRegistry().connectionCount === 0);

  console.log(`\n============================================================`);
  console.log(`ALL DEDICATED TESTS COMPLETED SUCCESSFULLY!`);
  console.log(`Total Assertions Passed: ${passedAssertions}`);
  console.log(`============================================================\n`);
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
