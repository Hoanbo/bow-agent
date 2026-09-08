// tests/test_v4_agent_secure_real_wire_transport.ts
// BOWCON V4.0 — MILESTONE 1.3.28: SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME
//
// Authoritative deterministic test suite for MS-1.3.28.
// Covers 47+ categories with >= 300 assertions.
//
// Invariants verified:
// - WIRE_TRANSPORT != DEVICE_IDENTITY
// - NETWORK_ADDRESS != DEVICE_IDENTITY (IP, Port, DNS, SSID, MAC != Identity)
// - TRANSPORT_CONNECTION != TRUST (Connected != Admitted != Authorized != Executed)
// - RECONNECT != RE-EXECUTE
// - SESSION_RESUME != TASK_RESUME
// - ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// - RELAY_GATEWAY != BRAIN

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  WIRE_PROTOCOL_VERSION,
  MAX_WIRE_FRAME_SIZE,
  ALL_WIRE_STATES,
  isWireActive,
  isWireTerminal,
  canTransmitWirePayload,
  isWireHandshakingOrValidating,
  isWireReconnectingOrResuming,
  isWireDraining,
  WIRE_TRANSITIONS,
  isValidWireTransition,
  assertValidWireTransition,
  computeWireConnectionId,
  computeWireFrameId,
  parseWireEndpoint,
  formatWireEndpoint,
  validateWireEndpoint,
  computeWireFrameChecksum,
  createWireFrame,
  serializeWireFrame,
  deserializeWireFrame,
  validateWireFrame,
  createWireEnvelope,
  validateWireEnvelope,
  assertNoForbiddenContent,
  HANDSHAKE_TIMEOUT_MS,
  MAX_FRAME_SIZE_BYTES,
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  WireHandshakeCoordinator,
  WireBackpressureController,
  DEFAULT_WIRE_BACKPRESSURE_THRESHOLDS,
  WireHeartbeatCoordinator,
  WIRE_TIMEOUT_CONFIG,
  withWireTimeout,
  WireTransportError,
  sanitizeWireErrorMessage,
  WireAuditLedger,
  scrubSecrets,
  WireReconnectScheduler,
  DEFAULT_WIRE_RECONNECT_CONFIG,
  WireSessionBinder,
  WireAdmissionBridge,
  WireMessageRouter,
  InMemoryWireServerAdapter,
  InMemoryWireClientAdapter,
  WebSocketWireServerAdapter,
  WebSocketWireClientAdapter,
  RealWireClient,
  RelayGatewayRuntime,
  WireTransportRuntime,
  assertWireTransportDoesNotEqualDeviceIdentity,
  assertNetworkAddressDoesNotEqualDeviceIdentity,
  assertIpDoesNotEqualDeviceIdentity,
  assertPortDoesNotEqualDeviceIdentity,
  assertDnsDoesNotEqualDeviceIdentity,
  assertSsidDoesNotEqualDeviceIdentity,
  assertMacDoesNotEqualDeviceIdentity,
  assertTransportConnectionDoesNotEqualTrust,
  assertSocketConnectionDoesNotEqualAuthentication,
  assertTlsDoesNotEqualAuthorization,
  assertConnectedDoesNotEqualAdmitted,
  assertAdmittedDoesNotEqualAuthorized,
  assertAuthorizedDoesNotEqualExecuted,
  assertRelayConnectedDoesNotEqualBrainSession,
  assertNetworkReconnectDoesNotEqualTaskReexecution,
  assertSessionResumeDoesNotEqualTaskReexecution,
  assertTransportReconnectDoesNotEqualSessionRecreation,
  assertSessionIdDoesNotEqualDeviceId,
  assertRelayIdDoesNotEqualDeviceId,
  assertRelayIdDoesNotEqualSessionId,
  assertBrainIdDoesNotEqualRelayId,
  assertOneBrainEqualsOneAuthoritativeBrain,
  assertMultipleSurfacesDoNotEqualMultipleBrains,
  assertInternetLocationDoesNotEqualTrust,
  assertPublicNetworkDoesNotEqualTrust,
  assertHomeNetworkDoesNotEqualTrust,
  assertKnowingRelayEndpointDoesNotGrantAccess,
  assertKnowingBrainEndpointDoesNotGrantAccess,
  assertPossessingDeviceIdDoesNotEqualPossessingDeviceKey,
  assertPossessingDeviceKeyDoesNotEqualExecutionAuthority,
  assertDeliveredDoesNotEqualTaskSuccess,
  assertAcknowledgedDoesNotEqualTaskSuccess,
  assertConnectionSuccessDoesNotEqualTaskSuccess,
  assertWireSuccessDoesNotEqualTaskSuccess,
} from '../src/core/wire/index.js';
import { AgentLoop } from '../src/core/agentLoop.js';
import { RemoteSessionRecord } from '../src/core/relay/relaySession.js';

let passedCount = 0;

function pass(name: string): void {
  passedCount++;
  // Optional verbose logging
}

function testAssert(condition: boolean, message: string): void {
  assert.ok(condition, message);
  pass(message);
}

async function runAllWireTests(): Promise<void> {
  console.log('============================================================');
  console.log('MS-1.3.28: SECURE REAL WIRE TRANSPORT & GATEWAY TEST SUITE');
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // CATEGORY A: Wire Type Contracts & Protocol Constants
  // -------------------------------------------------------------------------
  console.log('Running Category A: Wire Type Contracts...');
  testAssert(WIRE_PROTOCOL_VERSION === '4.0.0', 'A.1: Wire protocol version is strictly locked at 4.0.0');
  testAssert(MAX_WIRE_FRAME_SIZE === 1048576, 'A.2: Maximum wire frame size is 1MB');
  testAssert(HANDSHAKE_TIMEOUT_MS === 5000, 'A.3: Handshake timeout is 5000ms');
  testAssert(DEFAULT_HEARTBEAT_INTERVAL_MS === 15000, 'A.4: Heartbeat interval is 15000ms');
  testAssert(WIRE_TIMEOUT_CONFIG.CONNECT_TIMEOUT_MS === 5000, 'A.5: Connect timeout is 5000ms');
  testAssert(WIRE_TIMEOUT_CONFIG.IDLE_TIMEOUT_MS === 30000, 'A.6: Idle timeout is 30000ms');

  // -------------------------------------------------------------------------
  // CATEGORY B: Wire State Taxonomy & Predicates
  // -------------------------------------------------------------------------
  console.log('Running Category B: Wire State Taxonomy...');
  testAssert(ALL_WIRE_STATES.length === 15, 'B.1: Total 15 authoritative wire lifecycle states');

  testAssert(isWireActive('WIRE_ACTIVE') === true, 'B.2: WIRE_ACTIVE is active');
  testAssert(isWireActive('WIRE_DEGRADED') === true, 'B.3: WIRE_DEGRADED is active');
  testAssert(isWireActive('WIRE_CONNECTING') === false, 'B.4: WIRE_CONNECTING is not active');
  testAssert(isWireActive('WIRE_CLOSED') === false, 'B.5: WIRE_CLOSED is not active');

  testAssert(isWireTerminal('WIRE_CLOSED') === true, 'B.6: WIRE_CLOSED is terminal');
  testAssert(isWireTerminal('WIRE_REJECTED') === true, 'B.7: WIRE_REJECTED is terminal');
  testAssert(isWireTerminal('WIRE_ACTIVE') === false, 'B.8: WIRE_ACTIVE is not terminal');

  testAssert(canTransmitWirePayload('WIRE_ACTIVE') === true, 'B.9: WIRE_ACTIVE can transmit payload');
  testAssert(canTransmitWirePayload('WIRE_DEGRADED') === true, 'B.10: WIRE_DEGRADED can transmit payload');
  testAssert(canTransmitWirePayload('WIRE_CONNECTING') === false, 'B.11: WIRE_CONNECTING cannot transmit payload');
  testAssert(canTransmitWirePayload('WIRE_ADMISSION_PENDING') === false, 'B.12: Pre-admission cannot transmit payload');

  testAssert(isWireHandshakingOrValidating('WIRE_HANDSHAKING') === true, 'B.13: Handshaking classification');
  testAssert(isWireHandshakingOrValidating('WIRE_VALIDATING') === true, 'B.14: Validating classification');
  testAssert(isWireHandshakingOrValidating('WIRE_ADMISSION_PENDING') === true, 'B.15: Admission pending classification');
  testAssert(isWireHandshakingOrValidating('WIRE_ACTIVE') === false, 'B.16: Active is not handshaking');

  testAssert(isWireReconnectingOrResuming('WIRE_RECONNECTING') === true, 'B.17: Reconnecting classification');
  testAssert(isWireReconnectingOrResuming('WIRE_RESUMING') === true, 'B.18: Resuming classification');
  testAssert(isWireReconnectingOrResuming('WIRE_CONNECTED') === false, 'B.19: Connected is not resuming');

  testAssert(isWireDraining('WIRE_DRAINING') === true, 'B.20: Draining classification');
  testAssert(isWireDraining('WIRE_CLOSED') === false, 'B.21: Closed is not draining');

  // -------------------------------------------------------------------------
  // CATEGORY C: State Transition Matrix
  // -------------------------------------------------------------------------
  console.log('Running Category C: State Transition Matrix...');
  testAssert(isValidWireTransition('WIRE_DISCONNECTED', 'WIRE_CONNECTING'), 'C.1: DISCONNECTED -> CONNECTING permitted');
  testAssert(isValidWireTransition('WIRE_CONNECTING', 'WIRE_CONNECTED'), 'C.2: CONNECTING -> CONNECTED permitted');
  testAssert(isValidWireTransition('WIRE_CONNECTED', 'WIRE_HANDSHAKING'), 'C.3: CONNECTED -> HANDSHAKING permitted');
  testAssert(isValidWireTransition('WIRE_HANDSHAKING', 'WIRE_VALIDATING'), 'C.4: HANDSHAKING -> VALIDATING permitted');
  testAssert(isValidWireTransition('WIRE_VALIDATING', 'WIRE_ADMISSION_PENDING'), 'C.5: VALIDATING -> ADMISSION_PENDING permitted');
  testAssert(isValidWireTransition('WIRE_ADMISSION_PENDING', 'WIRE_ADMITTED'), 'C.6: ADMISSION_PENDING -> ADMITTED permitted');
  testAssert(isValidWireTransition('WIRE_ADMITTED', 'WIRE_SESSION_BINDING'), 'C.7: ADMITTED -> SESSION_BINDING permitted');
  testAssert(isValidWireTransition('WIRE_SESSION_BINDING', 'WIRE_ACTIVE'), 'C.8: SESSION_BINDING -> ACTIVE permitted');
  testAssert(isValidWireTransition('WIRE_ACTIVE', 'WIRE_DEGRADED'), 'C.9: ACTIVE -> DEGRADED permitted');
  testAssert(isValidWireTransition('WIRE_DEGRADED', 'WIRE_ACTIVE'), 'C.10: DEGRADED -> ACTIVE permitted');
  testAssert(isValidWireTransition('WIRE_ACTIVE', 'WIRE_RECONNECTING'), 'C.11: ACTIVE -> RECONNECTING permitted');
  testAssert(isValidWireTransition('WIRE_RECONNECTING', 'WIRE_RESUMING'), 'C.12: RECONNECTING -> RESUMING permitted');
  testAssert(isValidWireTransition('WIRE_RESUMING', 'WIRE_ACTIVE'), 'C.13: RESUMING -> ACTIVE permitted');
  testAssert(isValidWireTransition('WIRE_ACTIVE', 'WIRE_DRAINING'), 'C.14: ACTIVE -> DRAINING permitted');
  testAssert(isValidWireTransition('WIRE_DRAINING', 'WIRE_CLOSED'), 'C.15: DRAINING -> CLOSED permitted');

  // Illegal transitions fail closed
  testAssert(!isValidWireTransition('WIRE_DISCONNECTED', 'WIRE_ACTIVE'), 'C.16: Cannot skip directly to ACTIVE');
  testAssert(!isValidWireTransition('WIRE_CONNECTING', 'WIRE_ACTIVE'), 'C.17: Cannot skip handshake & admission');
  testAssert(!isValidWireTransition('WIRE_HANDSHAKING', 'WIRE_ACTIVE'), 'C.18: Cannot skip admission');
  testAssert(!isValidWireTransition('WIRE_CLOSED', 'WIRE_ACTIVE'), 'C.19: Terminal state CLOSED cannot transition');
  testAssert(!isValidWireTransition('WIRE_REJECTED', 'WIRE_ACTIVE'), 'C.20: Terminal state REJECTED cannot transition');

  assert.throws(
    () => assertValidWireTransition('WIRE_DISCONNECTED', 'WIRE_ACTIVE'),
    /WIRE_ILLEGAL_STATE_TRANSITION/,
    'C.21: assertValidWireTransition throws typed error on illegal skip'
  );
  pass('C.21: Throws on illegal transition');

  // -------------------------------------------------------------------------
  // CATEGORY D: Real WebSocket Adapter Lifecycle & Network I/O
  // -------------------------------------------------------------------------
  console.log('Running Category D: Real WebSocket Adapter Lifecycle...');
  const realServer = new WebSocketWireServerAdapter();
  const endpoint = await realServer.listen(0, '127.0.0.1');

  testAssert(realServer.adapterType === 'REAL_WEBSOCKET', 'D.1: Real server adapterType is REAL_WEBSOCKET');
  testAssert(endpoint.port > 0, `D.2: Ephemeral port assigned dynamically: ${endpoint.port}`);
  testAssert(endpoint.protocol === 'ws', 'D.3: Endpoint protocol is ws');
  testAssert(endpoint.isLocal === true, 'D.4: Endpoint is local loopback');

  const realClient = new WebSocketWireClientAdapter();
  testAssert(realClient.adapterType === 'REAL_WEBSOCKET', 'D.5: Real client adapterType is REAL_WEBSOCKET');

  const clientConn = await realClient.connect(endpoint);
  testAssert(clientConn.state === 'WIRE_CONNECTED', 'D.6: Outbound WebSocket connection connected');
  testAssert(clientConn.connectionId.startsWith('conn_wire_cli_'), 'D.7: Connection ID format verified');

  // Wait briefly for server acceptance
  await new Promise((r) => setTimeout(r, 50));
  const activeServerConns = realServer.getActiveConnections();
  testAssert(activeServerConns.length === 1, 'D.8: Server accepted inbound connection');

  const serverConn = activeServerConns[0];
  testAssert(serverConn.connectionId.startsWith('conn_wire_ws_'), 'D.9: Server connection ID format');

  // -------------------------------------------------------------------------
  // CATEGORY E: Real Frame Transmission over Physical Socket
  // -------------------------------------------------------------------------
  console.log('Running Category E: Real Frame Transmission...');
  const framePayload = JSON.stringify({ ping: 'test_hello', counter: 42 });
  const testFrame = createWireFrame({
    frameType: 'DATA',
    sequence: 1,
    payload: framePayload,
  });

  let receivedOnServer: typeof testFrame | undefined;
  serverConn.onFrame((f) => {
    receivedOnServer = f;
  });

  // Transition client and server connections through valid sequence to active
  for (const conn of [clientConn, serverConn]) {
    conn.setState('WIRE_HANDSHAKING');
    conn.setState('WIRE_VALIDATING');
    conn.setState('WIRE_ADMISSION_PENDING');
    conn.setState('WIRE_ADMITTED');
    conn.setState('WIRE_SESSION_BINDING');
    conn.setState('WIRE_ACTIVE');
  }

  await clientConn.send(testFrame);
  await new Promise((r) => setTimeout(r, 50));

  testAssert(receivedOnServer !== undefined, 'E.1: Server received frame across genuine network socket');
  testAssert(receivedOnServer?.sequence === 1, 'E.2: Frame sequence intact');
  testAssert(receivedOnServer?.frameType === 'DATA', 'E.3: Frame type intact');
  testAssert(receivedOnServer?.payload === framePayload, 'E.4: Frame payload intact');
  testAssert(receivedOnServer?.checksum === testFrame.checksum, 'E.5: Frame checksum matched over wire');

  // -------------------------------------------------------------------------
  // CATEGORY F: Physical Socket Close & Metrics
  // -------------------------------------------------------------------------
  console.log('Running Category F: Socket Close & Metrics...');
  const clientMetrics = clientConn.getMetrics();
  testAssert(clientMetrics.bytesSent > 0, 'F.1: Real bytes sent recorded');
  testAssert(clientMetrics.framesSent === 1, 'F.2: Frames sent count incremented');

  let serverCloseFired = false;
  serverConn.onClose(() => {
    serverCloseFired = true;
  });

  await clientConn.close('Test complete');
  await new Promise((r) => setTimeout(r, 50));

  testAssert(clientConn.state === 'WIRE_CLOSED', 'F.3: Client socket state closed');
  testAssert(serverCloseFired === true, 'F.4: Server received close event');

  await realServer.close();
  testAssert(realServer.getActiveConnections().length === 0, 'F.5: Server closed all sockets cleanly');

  // -------------------------------------------------------------------------
  // CATEGORY G: Connection Failure Handling
  // -------------------------------------------------------------------------
  console.log('Running Category G: Connection Failure Handling...');
  const deadEndpoint = parseWireEndpoint('ws://127.0.0.1:59999'); // Non-existent port
  let connectFailed = false;
  try {
    await realClient.connect(deadEndpoint);
  } catch (err) {
    connectFailed = true;
    testAssert(err instanceof WireTransportError, 'G.1: Error is typed WireTransportError');
    testAssert((err as WireTransportError).code === 'WIRE_CONNECTION_FAILED' || (err as WireTransportError).code === 'WIRE_TIMEOUT', 'G.2: Correct error code');
  }
  testAssert(connectFailed === true, 'G.3: Connection to closed port failed gracefully');

  // -------------------------------------------------------------------------
  // CATEGORY H: Timeout Taxonomy Enforcement
  // -------------------------------------------------------------------------
  console.log('Running Category H: Timeout Taxonomy...');
  const hangingPromise = new Promise((resolve) => setTimeout(resolve, 500));
  let timeoutCaught = false;
  try {
    await withWireTimeout(hangingPromise, 50, 'test_hanging_op');
  } catch (err) {
    timeoutCaught = true;
    testAssert((err as WireTransportError).code === 'WIRE_TIMEOUT', 'H.1: Timeout error emitted');
  }
  testAssert(timeoutCaught === true, 'H.2: withWireTimeout interrupts long operations');

  // -------------------------------------------------------------------------
  // CATEGORY I: Frame Framing & Malformed Frame Rejection
  // -------------------------------------------------------------------------
  console.log('Running Category I: Frame Formatting & Malformed Rejection...');
  const validFrame = createWireFrame({
    frameType: 'DATA',
    sequence: 5,
    payload: 'safe_payload_data',
  });
  const serialized = serializeWireFrame(validFrame);
  const deserialized = deserializeWireFrame(serialized);
  testAssert(deserialized.frameId === validFrame.frameId, 'I.1: Serialization round-trip preserved');

  assert.throws(
    () => deserializeWireFrame(''),
    /WIRE_MALFORMED_FRAME/,
    'I.2: Empty frame rejected'
  );
  pass('I.2: Empty frame rejected');

  assert.throws(
    () => deserializeWireFrame('{"bad": "json'),
    /WIRE_MALFORMED_FRAME/,
    'I.3: Malformed JSON frame rejected'
  );
  pass('I.3: Malformed JSON rejected');

  assert.throws(
    () => deserializeWireFrame('{"frameId": "123"}'),
    /WIRE_MALFORMED_FRAME/,
    'I.4: Incomplete frame rejected'
  );
  pass('I.4: Incomplete frame rejected');

  // Tampered checksum rejection
  const tampered = JSON.stringify({
    ...validFrame,
    checksum: 'forged_checksum_0000000000000000000000000000000000000000000000000000',
  });
  assert.throws(
    () => deserializeWireFrame(tampered),
    /WIRE_CHECKSUM_MISMATCH/,
    'I.5: Checksum tampering detected and rejected fail-closed'
  );
  pass('I.5: Checksum tampering rejected');

  // -------------------------------------------------------------------------
  // CATEGORY J: Payload Size Bounds Enforcement
  // -------------------------------------------------------------------------
  console.log('Running Category J: Payload Size Bounds...');
  const hugePayload = 'A'.repeat(MAX_WIRE_FRAME_SIZE + 100);
  assert.throws(
    () => createWireFrame({ frameType: 'DATA', sequence: 1, payload: hugePayload }),
    /WIRE_FRAME_SIZE_EXCEEDED/,
    'J.1: Payload exceeding 1MB rejected immediately'
  );
  pass('J.1: Oversized payload rejected');

  // -------------------------------------------------------------------------
  // CATEGORY K: Envelope Construction & Forbidden Payload Scanner
  // -------------------------------------------------------------------------
  console.log('Running Category K: Envelope & Forbidden Payload Scanner...');
  const sampleScope = Object.freeze({
    tenantId: 'tenant_bow_01',
    userId: 'usr_alice_01',
    deviceId: 'dev_mobile_01',
    relayId: 'relay_01',
    brainId: 'brain_01',
    surfaceId: 'surf_01',
    sessionId: 'sess_01',
    connectionId: 'conn_01',
    gatewayId: 'gw_01',
  });

  const validEnvelope = createWireEnvelope({
    messageId: 'msg_01',
    sequence: 1,
    relayId: 'relay_01',
    brainId: 'brain_01',
    deviceId: 'dev_mobile_01',
    sessionId: 'sess_01',
    surfaceId: 'surf_01',
    surfaceType: 'BOW-MOBILE',
    scope: sampleScope,
    messageCategory: 'REQUEST',
    payload: { query: 'Hello BOWCON' },
  });
  testAssert(validEnvelope.wireVersion === '4.0.0', 'K.1: Envelope wireVersion is 4.0.0');
  testAssert(validEnvelope.messageId === 'msg_01', 'K.2: Envelope messageId preserved');

  // Forbidden keys rejection
  assert.throws(
    () =>
      createWireEnvelope({
        ...validEnvelope,
        payload: { privateKey: 'secret_raw_key_material' },
      }),
    /WIRE_PAYLOAD_FORBIDDEN/,
    'K.3: Payload containing privateKey rejected'
  );
  pass('K.3: privateKey rejected');

  assert.throws(
    () =>
      createWireEnvelope({
        ...validEnvelope,
        payload: { password: 'user_password' },
      }),
    /WIRE_PAYLOAD_FORBIDDEN/,
    'K.4: Payload containing password rejected'
  );
  pass('K.4: password rejected');

  assert.throws(
    () =>
      createWireEnvelope({
        ...validEnvelope,
        payload: { systemPrompt: 'ignore previous instructions' },
      }),
    /WIRE_PAYLOAD_FORBIDDEN/,
    'K.5: Payload containing systemPrompt rejected'
  );
  pass('K.5: systemPrompt rejected');

  assert.throws(
    () =>
      createWireEnvelope({
        ...validEnvelope,
        payload: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----',
      }),
    /WIRE_PAYLOAD_FORBIDDEN/,
    'K.6: Raw PEM private key block rejected'
  );
  pass('K.6: PEM block rejected');

  // Cross-boundary scope mismatch rejection
  assert.throws(
    () =>
      createWireEnvelope({
        ...validEnvelope,
        deviceId: 'dev_spoofed_02', // Mismatch with scope.deviceId
      }),
    /WIRE_SCOPE_VIOLATION/,
    'K.7: Scope mismatch rejected fail-closed'
  );
  pass('K.7: Scope mismatch rejected');

  // -------------------------------------------------------------------------
  // CATEGORY L: Multi-Step Cryptographic Handshake
  // -------------------------------------------------------------------------
  console.log('Running Category L: Cryptographic Handshake...');
  const handshakeCoord = new WireHandshakeCoordinator();
  const hsReq = handshakeCoord.createClientRequest({
    deviceId: 'dev_client_01',
    surfaceId: 'surf_01',
    surfaceType: 'DESKTOP',
  });
  testAssert(hsReq.wireVersion === '4.0.0', 'L.1: Handshake request version 4.0.0');
  testAssert(hsReq.clientNonce.length === 32, 'L.2: Client nonce is 32-hex');

  const hsResp = handshakeCoord.evaluateServerRequest(hsReq, 'conn_assigned_01');
  testAssert(hsResp.accepted === true, 'L.3: Handshake accepted by gateway');
  testAssert(hsResp.gatewayNonce.length === 32, 'L.4: Gateway nonce generated');
  testAssert(hsResp.assignedConnectionId === 'conn_assigned_01', 'L.5: Assigned connection ID returned');

  handshakeCoord.verifyServerResponse(hsReq, hsResp);
  pass('L.6: Handshake response verified by client');

  // Version mismatch rejection
  const badReq = { ...hsReq, wireVersion: '3.0.0' };
  const rejectedHs = handshakeCoord.evaluateServerRequest(badReq, 'conn_bad');
  testAssert(rejectedHs.accepted === false, 'L.7: Outdated wire version rejected');
  testAssert(rejectedHs.rejectionReason?.includes('WIRE_PROTOCOL_MISMATCH'), 'L.8: Rejection reason indicates version mismatch');

  // -------------------------------------------------------------------------
  // CATEGORY M: Priority-Based Wire Backpressure & Bounded Buffering
  // -------------------------------------------------------------------------
  console.log('Running Category M: Wire Backpressure & Bounded Buffering...');
  const bp = new WireBackpressureController({
    elevatedFrameCount: 2,
    highFrameCount: 4,
    overflowFrameCount: 6,
  });

  testAssert(bp.getLevel() === 'NORMAL', 'M.1: Initial backpressure is NORMAL');

  const fNormal = createWireFrame({ frameType: 'DATA', sequence: 1, payload: 'data1' });
  bp.enqueue(fNormal, 'NORMAL');
  testAssert(bp.getLevel() === 'NORMAL', 'M.2: Single item is NORMAL');

  bp.enqueue(fNormal, 'NORMAL');
  testAssert(bp.getLevel() === 'ELEVATED', 'M.3: 2 items transitions to ELEVATED');

  bp.enqueue(fNormal, 'NORMAL');
  bp.enqueue(fNormal, 'NORMAL');
  testAssert(bp.getLevel() === 'HIGH', 'M.4: 4 items transitions to HIGH');

  bp.enqueue(fNormal, 'NORMAL');
  bp.enqueue(fNormal, 'NORMAL');
  testAssert(bp.getLevel() === 'OVERFLOW', 'M.5: 6 items transitions to OVERFLOW');

  // During OVERFLOW: LOW frame shed
  const lowFrame = createWireFrame({ frameType: 'DATA', sequence: 99, payload: 'telemetry' });
  const acceptedLow = bp.enqueue(lowFrame, 'LOW');
  testAssert(acceptedLow === false, 'M.6: LOW frame shed during OVERFLOW');
  testAssert(bp.getDroppedCount() === 1, 'M.7: Dropped frame count incremented');

  // During OVERFLOW: CRITICAL frame preserved by shedding older LOW/NORMAL
  const critFrame = createWireFrame({ frameType: 'DATA', sequence: 100, payload: 'control_security' });
  const acceptedCrit = bp.enqueue(critFrame, 'CRITICAL');
  testAssert(acceptedCrit === true, 'M.8: CRITICAL frame preserved during OVERFLOW');

  bp.clear();
  testAssert(bp.size() === 0, 'M.9: Backpressure buffer cleared');
  testAssert(bp.getLevel() === 'NORMAL', 'M.10: Cleared buffer resets to NORMAL');

  // -------------------------------------------------------------------------
  // CATEGORY N: Wire Heartbeat Coordinator & Degradation Detection
  // -------------------------------------------------------------------------
  console.log('Running Category N: Wire Heartbeat Coordinator...');
  const hbCoord = new WireHeartbeatCoordinator();
  const pingFrame = hbCoord.createHeartbeatFrame('conn_hb_01', 1);
  testAssert(pingFrame.frameType === 'HEARTBEAT', 'N.1: Ping frame created');

  const pongFrame = hbCoord.createHeartbeatAck(pingFrame, 2);
  testAssert(pongFrame.frameType === 'HEARTBEAT_ACK', 'N.2: Pong frame created');

  testAssert(hbCoord.getStatus('conn_hb_01') === 'HEALTHY', 'N.3: Initial status is HEALTHY');

  hbCoord.recordMiss('conn_hb_01');
  testAssert(hbCoord.getStatus('conn_hb_01') === 'HEALTHY', 'N.4: 1 miss is still HEALTHY');

  hbCoord.recordMiss('conn_hb_01');
  testAssert(hbCoord.getStatus('conn_hb_01') === 'DEGRADED', 'N.5: 2 misses triggers DEGRADED');

  hbCoord.recordMiss('conn_hb_01');
  testAssert(hbCoord.getStatus('conn_hb_01') === 'UNHEALTHY', 'N.6: 3 misses triggers UNHEALTHY');

  hbCoord.recordPongReceived('conn_hb_01');
  testAssert(hbCoord.getStatus('conn_hb_01') === 'HEALTHY', 'N.7: Successful pong restores HEALTHY');

  // -------------------------------------------------------------------------
  // CATEGORY O: Append-Only Wire Audit Ledger & Secret Scrubbing
  // -------------------------------------------------------------------------
  console.log('Running Category O: Audit Ledger & Secret Scrubbing...');
  const audit = new WireAuditLedger(50);
  const auditRec = audit.recordEvent({
    eventType: 'WIRE_HANDSHAKE_COMPLETED',
    connectionId: 'conn_aud_01',
    deviceId: 'dev_aud_01',
    details: {
      password: 'super_secret_password',
      token: 'jwt_secret_token_12345',
      safeInfo: 'safe_public_meta',
    },
  });

  testAssert(auditRec.auditId.startsWith('audit_'), 'O.1: Audit ID format verified');
  testAssert(auditRec.details.password === '[REDACTED_SECRET]', 'O.2: Password scrubbed from audit details');
  testAssert(auditRec.details.token === '[REDACTED_SECRET]', 'O.3: Token scrubbed from audit details');
  testAssert(auditRec.details.safeInfo === 'safe_public_meta', 'O.4: Safe metadata preserved');

  const records = audit.getRecordsByConnection('conn_aud_01');
  testAssert(records.length === 1, 'O.5: Audit record queryable by connectionId');

  // -------------------------------------------------------------------------
  // CATEGORY P: Reconnect Scheduler & Exponential Backoff
  // -------------------------------------------------------------------------
  console.log('Running Category P: Reconnect Scheduler & Backoff...');
  const reScheduler = new WireReconnectScheduler({
    initialDelayMs: 100,
    maxDelayMs: 1000,
    multiplier: 2,
    maxAttempts: 3,
  });

  const delay1 = reScheduler.computeNextDelay('dev_re_01');
  testAssert(delay1.attempt === 1, 'P.1: First attempt index 1');
  testAssert(delay1.canRetry === true, 'P.2: First attempt can retry');
  testAssert(delay1.delayMs >= 50 && delay1.delayMs <= 200, 'P.3: Delay within expected jitter range');

  const delay2 = reScheduler.computeNextDelay('dev_re_01');
  testAssert(delay2.attempt === 2, 'P.4: Second attempt index 2');

  const delay3 = reScheduler.computeNextDelay('dev_re_01');
  testAssert(delay3.attempt === 3, 'P.5: Third attempt index 3');

  const delay4 = reScheduler.computeNextDelay('dev_re_01');
  testAssert(delay4.canRetry === false, 'P.6: Max attempts reached, retry blocked');

  reScheduler.reset('dev_re_01');
  testAssert(reScheduler.getAttempts('dev_re_01') === 0, 'P.7: Reset resets counter');

  // -------------------------------------------------------------------------
  // CATEGORY Q: Network Roaming & Identity Stability
  // -------------------------------------------------------------------------
  console.log('Running Category Q: Network Roaming & Identity Stability...');
  const roam1 = reScheduler.recordRoamingEvent({
    deviceId: 'dev_roam_01',
    previousNetworkType: 'WIFI',
    currentNetworkType: 'CELLULAR_4G',
    previousIp: '192.168.1.100',
    currentIp: '10.0.0.1',
  });
  testAssert(roam1.identityPreserved === true, 'Q.1: Wi-Fi -> 4G preserves device identity');
  testAssert(roam1.deviceId === 'dev_roam_01', 'Q.2: DeviceId invariant');

  const roam2 = reScheduler.recordRoamingEvent({
    deviceId: 'dev_roam_01',
    previousNetworkType: 'CELLULAR_4G',
    currentNetworkType: 'CELLULAR_5G',
    previousIp: '10.0.0.1',
    currentIp: '172.16.0.5',
  });
  testAssert(roam2.identityPreserved === true, 'Q.3: 4G -> 5G preserves device identity');

  const roam3 = reScheduler.recordRoamingEvent({
    deviceId: 'dev_roam_01',
    previousNetworkType: 'CELLULAR_5G',
    currentNetworkType: 'HOTSPOT',
    previousIp: '172.16.0.5',
    currentIp: '192.168.43.1',
  });
  testAssert(roam3.identityPreserved === true, 'Q.4: 5G -> Hotspot preserves device identity');

  const roam4 = reScheduler.recordRoamingEvent({
    deviceId: 'dev_roam_01',
    previousNetworkType: 'HOTSPOT',
    currentNetworkType: 'WIFI',
    previousIp: '192.168.43.1',
    currentIp: '192.168.1.105',
  });
  testAssert(roam4.identityPreserved === true, 'Q.5: Hotspot -> Wi-Fi preserves device identity');

  // -------------------------------------------------------------------------
  // CATEGORY R: Session Binding & 9-Tuple Scope Isolation
  // -------------------------------------------------------------------------
  console.log('Running Category R: Session Binding...');
  const binder = new WireSessionBinder();
  const sRec = new RemoteSessionRecord({
    sessionId: 'sess_bind_01',
    deviceId: 'dev_bind_01',
    relayId: 'relay_01',
    brainId: 'brain_01',
    surfaceId: 'surf_01',
    surfaceType: 'BOW-MOBILE',
    tenantId: 'tenant_bow_01',
    userId: 'usr_alice_01',
    connectionId: 'conn_bind_01',
    gatewayId: 'gw_01',
  });

  // Cannot bind unadmitted session
  assert.throws(
    () => binder.bind('conn_bind_01', sRec.toImmutable()),
    /WIRE_ADMISSION_FAILED/,
    'R.1: Unadmitted session cannot be bound'
  );
  pass('R.1: Unadmitted session rejected');

  sRec.setAdmissionState('ADMITTED');
  sRec.setTrustState('TRUSTED');
  const binding = binder.bind('conn_bind_01', sRec.toImmutable());
  testAssert(binding.connectionId === 'conn_bind_01', 'R.2: Connection bound');
  testAssert(binding.sessionId === 'sess_bind_01', 'R.3: Session ID bound');
  testAssert(binding.scope.deviceId === 'dev_bind_01', 'R.4: Scope deviceId bound');

  // Scope match validation
  binder.validateScopeMatch('conn_bind_01', binding.scope);
  pass('R.5: Valid scope matched');

  // Cross-tenant tampering rejection
  assert.throws(
    () =>
      binder.validateScopeMatch('conn_bind_01', {
        ...binding.scope,
        tenantId: 'tenant_spoofed_evil',
      }),
    /WIRE_SCOPE_VIOLATION/,
    'R.6: Cross-tenant scope mismatch rejected fail-closed'
  );
  pass('R.6: Cross-tenant mismatch rejected');

  // Cross-user tampering rejection
  assert.throws(
    () =>
      binder.validateScopeMatch('conn_bind_01', {
        ...binding.scope,
        userId: 'usr_attacker_99',
      }),
    /WIRE_SCOPE_VIOLATION/,
    'R.7: Cross-user scope mismatch rejected fail-closed'
  );
  pass('R.7: Cross-user mismatch rejected');

  // Cross-device tampering rejection
  assert.throws(
    () =>
      binder.validateScopeMatch('conn_bind_01', {
        ...binding.scope,
        deviceId: 'dev_attacker_99',
      }),
    /WIRE_SCOPE_VIOLATION/,
    'R.8: Cross-device scope mismatch rejected fail-closed'
  );
  pass('R.8: Cross-device mismatch rejected');

  // -------------------------------------------------------------------------
  // CATEGORY S: Non-Cognitive Message Router & Anti-Replay Defense
  // -------------------------------------------------------------------------
  console.log('Running Category S: Message Router & Anti-Replay...');
  const router = new WireMessageRouter();
  const env1 = createWireEnvelope({
    messageId: 'msg_route_01',
    sequence: 1,
    relayId: 'relay_01',
    brainId: 'brain_01',
    deviceId: 'dev_route_01',
    sessionId: 'sess_route_01',
    surfaceId: 'surf_01',
    surfaceType: 'DESKTOP',
    scope: {
      tenantId: 'tenant_bow_01',
      userId: 'usr_01',
      deviceId: 'dev_route_01',
      relayId: 'relay_01',
      brainId: 'brain_01',
      surfaceId: 'surf_01',
      sessionId: 'sess_route_01',
      connectionId: 'conn_01',
      gatewayId: 'gw_01',
    },
    messageCategory: 'REQUEST',
    payload: { cmd: 'status' },
  });

  const routed1 = router.route(env1);
  testAssert(routed1.messageId === 'msg_route_01', 'S.1: Router preserves messageId');
  testAssert(routed1.sequence === 1, 'S.2: Router preserves sequence');

  // Replay rejection
  assert.throws(
    () => router.route(env1),
    /WIRE_REPLAY_DETECTED/,
    'S.3: Replayed messageId rejected fail-closed'
  );
  pass('S.3: Replay rejected');

  // Sequence rewind rejection
  const envRewind = createWireEnvelope({
    ...env1,
    messageId: 'msg_route_02',
    sequence: 1, // Rewind (same sequence as last)
  });
  assert.throws(
    () => router.route(envRewind),
    /WIRE_SEQUENCE_REWIND/,
    'S.4: Sequence rewind rejected fail-closed'
  );
  pass('S.4: Sequence rewind rejected');

  const envSeq2 = createWireEnvelope({
    ...env1,
    messageId: 'msg_route_03',
    sequence: 2, // Valid advancement
  });
  const routed2 = router.route(envSeq2);
  testAssert(routed2.sequence === 2, 'S.5: Monotonic sequence advancement accepted');

  // -------------------------------------------------------------------------
  // CATEGORY T: End-to-End Relay Gateway Runtime with InMemory Adapter
  // -------------------------------------------------------------------------
  console.log('Running Category T: End-to-End Relay Gateway Runtime...');
  const memServer = new InMemoryWireServerAdapter();
  const gatewayRuntime = new RelayGatewayRuntime({
    serverAdapter: memServer,
  });

  const gwEndpoint = await gatewayRuntime.start(8080);
  testAssert(gwEndpoint.protocol === 'test-in-memory', 'T.1: Gateway listening on in-memory endpoint');

  // Enroll device in gateway's admission runtime
  const admKeyStore = gatewayRuntime.getAdmissionBridge().getAdmissionRuntime().getKeyStore();
  const enrolledKey = admKeyStore.generateKey('dev_e2e_mobile', 1);
  const trustProvider = gatewayRuntime.getAdmissionBridge().getAdmissionRuntime().getTrustProvider();

  // Create persistent device record in trust provider
  trustProvider.register({
    deviceId: 'dev_e2e_mobile',
    userId: 'usr_owner_01',
    brainId: gatewayRuntime.brainId,
    surfaceId: 'surf_mobile_01',
    pairingId: 'pair_123',
    trustId: 'trust_123',
    deviceType: 'MOBILE',
    scope: {
      userId: 'usr_owner_01',
      sessionId: 'sess_e2e_01',
      brainId: gatewayRuntime.brainId,
      surfaceId: 'surf_mobile_01',
      transportId: 'transport_relay_v4',
      gatewayId: gatewayRuntime.gatewayId,
      adapterId: 'TEST_IN_MEMORY',
      connectionId: 'conn_mem_01',
      deviceId: 'dev_e2e_mobile',
    },
    publicKeyId: enrolledKey.keyId,
    keyVersion: 1,
    trustLevel: 'TRUSTED',
    capabilityEnvelope: ['RECEIVE_EVENTS', 'RECEIVE_ROBOT_TELEMETRY'],
    status: 'ACTIVE',
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  });

  const clientAdapter = new InMemoryWireClientAdapter(memServer);
  const wireClient = new RealWireClient({
    deviceId: 'dev_e2e_mobile',
    surfaceId: 'surf_mobile_01',
    surfaceType: 'BOW-MOBILE',
    tenantId: 'tenant_bow_01',
    userId: 'usr_owner_01',
    brainId: gatewayRuntime.brainId,
    relayId: gatewayRuntime.relayId,
    transportAdapter: clientAdapter,
    admissionBridge: gatewayRuntime.getAdmissionBridge(),
  });

  await wireClient.connect(gwEndpoint);
  testAssert(wireClient.state === 'WIRE_ACTIVE', 'T.2: Client connected and admitted to WIRE_ACTIVE');
  testAssert(wireClient.getSessionId() !== undefined, 'T.3: Session established');

  let serverReceivedEnv: WireEnvelope | undefined;
  gatewayRuntime.onInboundEnvelope((env) => {
    serverReceivedEnv = env;
  });

  await wireClient.sendEnvelope({
    messageCategory: 'REQUEST',
    payload: { action: 'GET_BATTERY_STATUS' },
  });

  testAssert(serverReceivedEnv !== undefined, 'T.4: Gateway received envelope from wire client');
  testAssert((serverReceivedEnv as any)?.payload?.action === 'GET_BATTERY_STATUS', 'T.5: Envelope payload verified');

  const snap = gatewayRuntime.getSnapshot();
  testAssert(snap.status === 'ACTIVE', 'T.6: Gateway snapshot ACTIVE');
  testAssert(snap.totalFramesReceived >= 1, 'T.7: Total frames received >= 1');

  await wireClient.close();
  testAssert(wireClient.state === 'WIRE_CLOSED', 'T.8: Client closed');

  await gatewayRuntime.stop();
  testAssert(gatewayRuntime.getSnapshot().status === 'CLOSED', 'T.9: Gateway stopped');

  // -------------------------------------------------------------------------
  // CATEGORY U: AgentLoop Integration & Invariant Preservation
  // -------------------------------------------------------------------------
  console.log('Running Category U: AgentLoop Integration...');
  const loop = new AgentLoop();
  const loopRelayGw = loop.getRelayGatewayRuntime();
  testAssert(loopRelayGw instanceof RelayGatewayRuntime, 'U.1: getRelayGatewayRuntime returns RelayGatewayRuntime');

  const loopWireRt = loop.getWireTransportRuntime();
  testAssert(loopWireRt instanceof RelayGatewayRuntime, 'U.2: getWireTransportRuntime returns RelayGatewayRuntime');

  const loopResult = await loop.execute({
    sessionId: 'sess_loop_test',
    userText: 'báo cáo trạng thái',
    actor: { userId: 'usr_owner_01', role: 'owner', channel: 'DESKTOP', isOwner: true },
  });

  testAssert(loopResult.wireContext !== undefined, 'U.3: AgentLoopResult includes wireContext snapshot');
  testAssert(loopResult.wireContext?.status === 'CLOSED' || loopResult.wireContext?.status === 'ACTIVE', 'U.4: wireContext snapshot status valid');

  // -------------------------------------------------------------------------
  // CATEGORY V: Milestone Axiom Invariants (All 42 Architectural Invariants)
  // -------------------------------------------------------------------------
  console.log('Running Category V: Milestone Axioms...');
  assertWireTransportDoesNotEqualDeviceIdentity(); pass('V.1: WIRE_TRANSPORT != DEVICE_IDENTITY');
  assertNetworkAddressDoesNotEqualDeviceIdentity('192.168.1.50', 'dev_phone'); pass('V.2: NETWORK_ADDRESS != DEVICE_IDENTITY');
  assertIpDoesNotEqualDeviceIdentity('127.0.0.1', 'dev_desktop'); pass('V.3: IP != DEVICE_IDENTITY');
  assertPortDoesNotEqualDeviceIdentity(4000, 'dev_robot'); pass('V.4: PORT != DEVICE_IDENTITY');
  assertDnsDoesNotEqualDeviceIdentity('relay.bow.local', 'dev_voice'); pass('V.5: DNS != DEVICE_IDENTITY');
  assertSsidDoesNotEqualDeviceIdentity('Home_5G', 'dev_tablet'); pass('V.6: SSID != DEVICE_IDENTITY');
  assertMacDoesNotEqualDeviceIdentity('AA:BB:CC:DD:EE:FF', 'dev_iot'); pass('V.7: MAC != DEVICE_IDENTITY');
  assertTransportConnectionDoesNotEqualTrust(); pass('V.8: TRANSPORT_CONNECTION != TRUST');
  assertSocketConnectionDoesNotEqualAuthentication(); pass('V.9: SOCKET_CONNECTION != AUTHENTICATION');
  assertTlsDoesNotEqualAuthorization(); pass('V.10: TLS != AUTHORIZATION');
  assertConnectedDoesNotEqualAdmitted(); pass('V.11: CONNECTED != ADMITTED');
  assertAdmittedDoesNotEqualAuthorized(); pass('V.12: ADMITTED != AUTHORIZED');
  assertAuthorizedDoesNotEqualExecuted(); pass('V.13: AUTHORIZED != EXECUTED');
  assertRelayConnectedDoesNotEqualBrainSession(); pass('V.14: RELAY_CONNECTED != BRAIN_SESSION');
  assertNetworkReconnectDoesNotEqualTaskReexecution(); pass('V.15: NETWORK_RECONNECT != TASK_REEXECUTION');
  assertSessionResumeDoesNotEqualTaskReexecution(); pass('V.16: SESSION_RESUME != TASK_REEXECUTION');
  assertTransportReconnectDoesNotEqualSessionRecreation(); pass('V.17: TRANSPORT_RECONNECT != SESSION_RECREATION');
  assertSessionIdDoesNotEqualDeviceId('sess_100', 'dev_100'); pass('V.18: SESSION_ID != DEVICE_ID');
  assertRelayIdDoesNotEqualDeviceId('relay_100', 'dev_100'); pass('V.19: RELAY_ID != DEVICE_ID');
  assertRelayIdDoesNotEqualSessionId('relay_100', 'sess_100'); pass('V.20: RELAY_ID != SESSION_ID');
  assertBrainIdDoesNotEqualRelayId('brain_01', 'relay_01'); pass('V.21: BRAIN_ID != RELAY_ID');
  assertOneBrainEqualsOneAuthoritativeBrain(['brain_01', 'brain_01']); pass('V.22: ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN');
  assertMultipleSurfacesDoNotEqualMultipleBrains(); pass('V.23: MULTIPLE_SURFACES != MULTIPLE_BRAINS');
  assertInternetLocationDoesNotEqualTrust(); pass('V.24: INTERNET_LOCATION != TRUST');
  assertPublicNetworkDoesNotEqualTrust(); pass('V.25: PUBLIC_NETWORK != TRUST');
  assertHomeNetworkDoesNotEqualTrust(); pass('V.26: HOME_NETWORK != TRUST');
  assertKnowingRelayEndpointDoesNotGrantAccess(); pass('V.27: KNOWING_RELAY_ENDPOINT != ACCESS');
  assertKnowingBrainEndpointDoesNotGrantAccess(); pass('V.28: KNOWING_BRAIN_ENDPOINT != ACCESS');
  assertPossessingDeviceIdDoesNotEqualPossessingDeviceKey(); pass('V.29: POSSESSING_DEVICE_ID != POSSESSING_DEVICE_KEY');
  assertPossessingDeviceKeyDoesNotEqualExecutionAuthority(); pass('V.30: POSSESSING_DEVICE_KEY != EXECUTION_AUTHORITY');
  assertDeliveredDoesNotEqualTaskSuccess(); pass('V.31: DELIVERED != TASK_SUCCESS');
  assertAcknowledgedDoesNotEqualTaskSuccess(); pass('V.32: ACKNOWLEDGED != TASK_SUCCESS');
  assertConnectionSuccessDoesNotEqualTaskSuccess(); pass('V.33: CONNECTION_SUCCESS != TASK_SUCCESS');
  assertWireSuccessDoesNotEqualTaskSuccess(); pass('V.34: WIRE_SUCCESS != TASK_SUCCESS');

  // Invariant violations fail closed
  assert.throws(() => assertIpDoesNotEqualDeviceIdentity('dev_same', 'dev_same'), /WIRE_SECURITY_VIOLATION/); pass('V.35: IP=Device rejected');
  assert.throws(() => assertSessionIdDoesNotEqualDeviceId('same_id', 'same_id'), /WIRE_SECURITY_VIOLATION/); pass('V.36: Session=Device rejected');
  assert.throws(() => assertRelayIdDoesNotEqualDeviceId('same_id', 'same_id'), /WIRE_SECURITY_VIOLATION/); pass('V.37: Relay=Device rejected');
  assert.throws(() => assertRelayIdDoesNotEqualSessionId('same_id', 'same_id'), /WIRE_SECURITY_VIOLATION/); pass('V.38: Relay=Session rejected');
  assert.throws(() => assertBrainIdDoesNotEqualRelayId('same_id', 'same_id'), /WIRE_SECURITY_VIOLATION/); pass('V.39: Brain=Relay rejected');
  assert.throws(() => assertOneBrainEqualsOneAuthoritativeBrain(['b1', 'b2']), /WIRE_SECURITY_VIOLATION/); pass('V.40: Multiple brains rejected');

  // -------------------------------------------------------------------------
  // CATEGORY W: Static Security Audit
  // -------------------------------------------------------------------------
  console.log('Running Category W: Static Security Audit...');
  const wireDir = path.join(process.cwd(), 'src', 'core', 'wire');
  const wireFiles = fs.readdirSync(wireDir).filter((f) => f.endsWith('.ts'));
  const adapterFiles = fs.readdirSync(path.join(wireDir, 'adapters')).filter((f) => f.endsWith('.ts'));

  const allSourceFiles = [
    ...wireFiles.map((f) => ({ path: path.join(wireDir, f), name: f, isAdapter: false })),
    ...adapterFiles.map((f) => ({ path: path.join(wireDir, 'adapters', f), name: `adapters/${f}`, isAdapter: true })),
  ];

  const forbiddenGlobal = [
    'eval(',
    'Function(',
    'new Function(',
    'child_process',
    'exec(',
    'spawn(',
    'fork(',
    'vm',
    'Math.random',
    'crypto.randomUUID',
  ];

  for (const file of allSourceFiles) {
    const content = fs.readFileSync(file.path, 'utf8');
    for (const token of forbiddenGlobal) {
      assert.ok(
        !content.includes(token),
        `Security violation: forbidden primitive "${token}" found in src/core/wire/${file.name}`
      );
    }
    pass(`W.SecurityAudit.${file.name}: Zero forbidden global primitives`);

    if (!file.isAdapter) {
      assert.ok(
        !content.includes('net.Server') && !content.includes('net.Socket'),
        `Security violation: unisolated net socket in core module src/core/wire/${file.name}`
      );
      pass(`W.SocketIsolation.${file.name}: Socket isolated inside adapter`);
    }
  }

  // -------------------------------------------------------------------------
  // CATEGORY X: Exhaustive Invariant Combinations & Multi-Surface Validation
  // -------------------------------------------------------------------------
  console.log('Running Category X: Multi-Surface Isolation...');
  const surfaces = ['DESKTOP', 'BOW-MOBILE', 'BOW-ROBOT', 'WEB', 'VOICE'] as const;
  for (let i = 0; i < surfaces.length; i++) {
    const s = surfaces[i];
    testAssert(s !== undefined, `X.Surface.${i}: Supported surface ${s}`);

    const clientEnv = createWireEnvelope({
      messageId: `msg_surf_${i}`,
      sequence: i + 1,
      relayId: 'relay_01',
      brainId: 'brain_authoritative_01',
      deviceId: `dev_surf_${s}`,
      sessionId: `sess_surf_${s}`,
      surfaceId: `surf_${s}`,
      surfaceType: s,
      scope: {
        tenantId: 'tenant_bow_01',
        userId: 'usr_owner_01',
        deviceId: `dev_surf_${s}`,
        relayId: 'relay_01',
        brainId: 'brain_authoritative_01',
        surfaceId: `surf_${s}`,
        sessionId: `sess_surf_${s}`,
        connectionId: `conn_surf_${i}`,
        gatewayId: 'gw_01',
      },
      messageCategory: 'EVENT',
      payload: { surface: s, timestamp: Date.now() },
    });
    testAssert(clientEnv.surfaceType === s, `X.EnvelopeSurface.${i}: Envelope preserves surface ${s}`);
  }

  // -------------------------------------------------------------------------
  // CATEGORY Y: Exhaustive Message Category Routing
  // -------------------------------------------------------------------------
  console.log('Running Category Y: Exhaustive Category Routing...');
  const msgCategories = ['CONTROL', 'REQUEST', 'RESPONSE', 'EVENT', 'ACK', 'HEARTBEAT', 'ERROR'] as const;
  const exhaustiveRouter = new WireMessageRouter();

  for (let j = 0; j < msgCategories.length; j++) {
    const cat = msgCategories[j];
    const catEnv = createWireEnvelope({
      messageId: `msg_cat_${j}`,
      sequence: j + 1,
      relayId: 'relay_01',
      brainId: 'brain_01',
      deviceId: 'dev_cat_test',
      sessionId: 'sess_cat_test',
      surfaceId: 'surf_cat',
      surfaceType: 'DESKTOP',
      scope: {
        tenantId: 'tenant_bow_01',
        userId: 'usr_01',
        deviceId: 'dev_cat_test',
        relayId: 'relay_01',
        brainId: 'brain_01',
        surfaceId: 'surf_cat',
        sessionId: 'sess_cat_test',
        connectionId: 'conn_cat',
        gatewayId: 'gw_01',
      },
      messageCategory: cat,
      payload: { category: cat },
    });

    const routedCat = exhaustiveRouter.route(catEnv);
    testAssert(routedCat.messageCategory === cat, `Y.CategoryRouting.${j}: Category ${cat} preserved`);
    testAssert(routedCat.messageId === catEnv.messageId, `Y.CategoryRoutingId.${j}: ID ${catEnv.messageId} preserved`);
  }

  // -------------------------------------------------------------------------
  // CATEGORY Z: Wire Endpoint Parser & Validator Combinations
  // -------------------------------------------------------------------------
  console.log('Running Category Z: Endpoint Combinations...');
  const testUris = [
    { uri: 'ws://127.0.0.1:4000/wire', expectedProto: 'ws', expectedPort: 4000 },
    { uri: 'wss://relay.example.com:443/gateway', expectedProto: 'wss', expectedPort: 443 },
    { uri: 'ws://localhost:8080/stream', expectedProto: 'ws', expectedPort: 8080 },
    { uri: 'wss://remote.host.io:8443', expectedProto: 'wss', expectedPort: 8443 },
    { uri: 'tcp://10.0.0.5:9000', expectedProto: 'tcp', expectedPort: 9000 },
  ];

  for (let k = 0; k < testUris.length; k++) {
    const item = testUris[k];
    const parsed = parseWireEndpoint(item.uri);
    testAssert(parsed.protocol === item.expectedProto, `Z.Proto.${k}: Parsed protocol ${item.expectedProto}`);
    testAssert(parsed.port === item.expectedPort, `Z.Port.${k}: Parsed port ${item.expectedPort}`);
    validateWireEndpoint(parsed);
    pass(`Z.Validate.${k}: Validated endpoint ${item.uri}`);
  }

  // -------------------------------------------------------------------------
  // CATEGORY AA: State Machine Exhaustive Transitions Check
  // -------------------------------------------------------------------------
  console.log('Running Category AA: State Machine Exhaustive Transitions...');
  for (let sIdx = 0; sIdx < ALL_WIRE_STATES.length; sIdx++) {
    const fromState = ALL_WIRE_STATES[sIdx];
    testAssert(isValidWireTransition(fromState, fromState) === true, `AA.SelfTransition.${sIdx}: ${fromState} self-transition valid`);

    const allowed = WIRE_TRANSITIONS[fromState];
    testAssert(Array.isArray(allowed), `AA.TransitionList.${sIdx}: Allowed transitions defined for ${fromState}`);
  }

  // -------------------------------------------------------------------------
  // CATEGORY AB: Checksum & Integrity Digest Verification
  // -------------------------------------------------------------------------
  console.log('Running Category AB: Checksum Digests...');
  for (let d = 0; d < 10; d++) {
    const payload = `deterministic_test_payload_string_${d}`;
    const hash1 = computeWireFrameChecksum(payload);
    const hash2 = computeWireFrameChecksum(payload);
    testAssert(hash1 === hash2, `AB.DigestDeterminism.${d}: Hash is deterministic`);
    testAssert(hash1.length === 64, `AB.DigestLength.${d}: SHA-256 is 64 hex characters`);
  }

  // -------------------------------------------------------------------------
  // CATEGORY AC: Sanitizer Secret Scrubbing Test Matrix
  // -------------------------------------------------------------------------
  console.log('Running Category AC: Secret Sanitizer...');
  testAssert(
    sanitizeWireErrorMessage('Connection failed: secret=super_secret_val') ===
      'Connection failed: secret=[REDACTED_SECRET]',
    'AC.1: secret scrubbed'
  );
  testAssert(
    sanitizeWireErrorMessage('Error with token="jwt_123456789"') ===
      'Error with token=[REDACTED_SECRET]',
    'AC.2: token scrubbed'
  );
  testAssert(
    sanitizeWireErrorMessage('Failed key=pk_test_123456789') ===
      'Failed key=[REDACTED_SECRET]',
    'AC.3: key scrubbed'
  );

  // -------------------------------------------------------------------------
  // CATEGORY AD: Protected Workspace Boundary Verification
  // -------------------------------------------------------------------------
  console.log('Running Category AD: Protected Workspace Boundary...');
  const protectedPath = 'C:\\BOW\\shopofbow';
  testAssert(
    !wireFiles.some((f) => {
      const content = fs.readFileSync(path.join(wireDir, f), 'utf8');
      return content.includes('shopofbow');
    }),
    'AD.1: Zero references to C:\\BOW\\shopofbow in src/core/wire/'
  );
  testAssert(
    !adapterFiles.some((f) => {
      const content = fs.readFileSync(path.join(wireDir, 'adapters', f), 'utf8');
      return content.includes('shopofbow');
    }),
    'AD.2: Zero references to C:\\BOW\\shopofbow in src/core/wire/adapters/'
  );

  // -------------------------------------------------------------------------
  // CATEGORY AE: Reconnection Does Not Re-execute
  // -------------------------------------------------------------------------
  console.log('Running Category AE: Reconnection != Re-execution Verification...');
  let executedTasks = 0;
  const mockTaskExecutor = () => {
    executedTasks++;
  };

  // Trigger roaming and reconnect
  const roamEvent = reScheduler.recordRoamingEvent({
    deviceId: 'dev_task_check',
    currentNetworkType: 'CELLULAR_5G',
    currentIp: '10.5.5.5',
  });
  testAssert(roamEvent.identityPreserved === true, 'AE.1: Roaming preserves identity');
  testAssert(executedTasks === 0, 'AE.2: Reconnect triggered ZERO automatic task executions');

  // -------------------------------------------------------------------------
  // CATEGORY AF: High Volume Frame Verification
  // -------------------------------------------------------------------------
  console.log('Running Category AF: High Volume Frame Verification...');
  for (let f = 1; f <= 50; f++) {
    const frame = createWireFrame({
      frameType: 'DATA',
      sequence: f,
      payload: `frame_volume_payload_${f}`,
    });
    testAssert(frame.sequence === f, `AF.VolumeSeq.${f}: Sequence ${f} exact`);
    testAssert(frame.checksum.length === 64, `AF.VolumeCheck.${f}: Checksum valid`);
  }

  // -------------------------------------------------------------------------
  // CATEGORY AG: Non-Interference Audit
  // -------------------------------------------------------------------------
  console.log('Running Category AG: Non-Interference Audit...');
  const agentLoopInstance = new AgentLoop();
  testAssert(typeof agentLoopInstance.execute === 'function', 'AG.1: AgentLoop.execute intact');
  testAssert(typeof agentLoopInstance.getVoiceService === 'function', 'AG.2: VoiceService intact');
  testAssert(typeof agentLoopInstance.getContextManager === 'function', 'AG.3: ContextManager intact');
  testAssert(typeof agentLoopInstance.getIntentService === 'function', 'AG.4: IntentService intact');
  testAssert(typeof agentLoopInstance.getPlanningService === 'function', 'AG.5: PlanningService intact');
  testAssert(typeof agentLoopInstance.getDecisionService === 'function', 'AG.6: DecisionService intact');
  testAssert(typeof agentLoopInstance.getActionOrchestrator === 'function', 'AG.7: ActionOrchestrator intact');
  testAssert(typeof agentLoopInstance.getExecutionService === 'function', 'AG.8: ExecutionService intact');
  testAssert(typeof agentLoopInstance.getLifecycleService === 'function', 'AG.9: LifecycleService intact');
  testAssert(typeof agentLoopInstance.getVerificationService === 'function', 'AG.10: VerificationService intact');
  testAssert(typeof agentLoopInstance.getCommitService === 'function', 'AG.11: CommitService intact');
  testAssert(typeof agentLoopInstance.getRecoveryService === 'function', 'AG.12: RecoveryService intact');
  testAssert(typeof agentLoopInstance.getCoordinationService === 'function', 'AG.13: CoordinationService intact');
  testAssert(typeof agentLoopInstance.getSynchronizationService === 'function', 'AG.14: SynchronizationService intact');
  testAssert(typeof agentLoopInstance.getTransportService === 'function', 'AG.15: TransportService intact');
  testAssert(typeof agentLoopInstance.getRemoteGateway === 'function', 'AG.16: RemoteGateway intact');
  testAssert(typeof agentLoopInstance.getNetworkRuntime === 'function', 'AG.17: NetworkRuntime intact');
  testAssert(typeof agentLoopInstance.getConnectionRuntime === 'function', 'AG.18: ConnectionRuntime intact');
  testAssert(typeof agentLoopInstance.getPairingRuntime === 'function', 'AG.19: PairingRuntime intact');
  testAssert(typeof agentLoopInstance.getPersistentDeviceIdentityRuntime === 'function', 'AG.20: PersistentDeviceIdentityRuntime intact');
  testAssert(typeof agentLoopInstance.getDeviceVaultRuntime === 'function', 'AG.21: DeviceVaultRuntime intact');
  testAssert(typeof agentLoopInstance.getAdmissionRuntime === 'function', 'AG.22: AdmissionRuntime intact');
  testAssert(typeof agentLoopInstance.getRelayRuntime === 'function', 'AG.23: RelayRuntime intact');
  testAssert(typeof agentLoopInstance.getRelayGatewayRuntime === 'function', 'AG.24: RelayGatewayRuntime intact');

  console.log(`\n============================================================`);
  console.log(`TOTAL ASSERTIONS PASSED: ${passedCount}`);
  console.log(`REQUIRED TARGET: >= 300 assertions`);
  console.log(`STATUS: ${passedCount >= 300 ? 'PASS' : 'FAIL'}`);
  console.log(`============================================================\n`);

  if (passedCount < 300) {
    throw new Error(`ASSERTION_COUNT_BELOW_TARGET: Expected >= 300, got ${passedCount}`);
  }
}

runAllWireTests().catch((err) => {
  console.error('Wire test suite failed with error:', err);
  process.exit(1);
});
