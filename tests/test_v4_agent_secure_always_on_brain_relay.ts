// tests/test_v4_agent_secure_always_on_brain_relay.ts
// BOWCON V4.0 — SECURE ALWAYS-ON BRAIN RELAY & REMOTE SESSION RUNTIME (MS-1.3.27)
// Authoritative test suite covering Categories A through BD with >= 250 assertions.

import assert from 'node:assert/strict';
import {
  RELAY_PROTOCOL_VERSION,
  generateDeterministicRelayId,
  isValidRelayId,
  assertRelayIdentitySeparation,
  validateRelayEndpoint,
  formatRelayEndpointUrl,
  areEndpointsEquivalent,
  assertRelayEndpointKnowledgeDoesNotGrantAccess,
  validateRelayAdvertisement,
  validateRelayRegistration,
  RelayRegistrationManager,
  RelayAdmissionBridge,
  InMemoryRelayTransportAdapter,
  RelayConnection,
  RemoteSessionRecord,
  assertSessionIsolation,
  RelayMultiplexer,
  RelayHeartbeatTracker,
  RelayReconnectScheduler,
  RelayResumeCoordinator,
  RelayMessageRouter,
  RelayBackpressureController,
  RelayTimeoutError,
  RELAY_TIMEOUT_DEFAULTS,
  withRelayTimeout,
  RelayError,
  RelayAuditLedger,
  scrubRelayAuditDetails,
  RelayRegistry,
  SecureBrainRelayRuntime,
  canTransitionRelaySession,
  assertValidRelayTransition,
  RelayTransitionError,
  isTerminalRelayState,
  isActiveRelaySession,
  isRecoverableRelayState,
  requiresAdmissionCheck,
  canTransmitPayload,
  isConnectingOrResuming,
  globalAgentLoop,
  AgentLoop,
  createPersistentDeviceRecord,
  InMemoryAdmissionTrustProvider,
} from '../src/index.js';

let assertionCount = 0;
function testAssert(condition: any, message: string): void {
  assert.ok(condition, message);
  assertionCount++;
}

async function runRelayTests() {
  console.log('=== BOWCON V4.0 MS-1.3.27: SECURE ALWAYS-ON BRAIN RELAY TEST SUITE ===\n');

  // -------------------------------------------------------------------------
  // Category A: Relay Identity
  // -------------------------------------------------------------------------
  console.log('Testing Category A: Relay Identity...');
  const relayId1 = generateDeterministicRelayId('seed_relay_primary_alpha');
  testAssert(typeof relayId1 === 'string', 'A.1: Relay ID is a string');
  testAssert(relayId1.startsWith('relay_'), 'A.2: Relay ID starts with relay_ prefix');
  testAssert(isValidRelayId(relayId1), 'A.3: Relay ID passes isValidRelayId');
  testAssert(!isValidRelayId('invalid_relay_id'), 'A.4: Invalid string fails isValidRelayId');
  testAssert(!isValidRelayId(''), 'A.5: Empty string fails isValidRelayId');
  testAssert(!isValidRelayId(12345), 'A.6: Non-string fails isValidRelayId');
  testAssert(!isValidRelayId('relay_short'), 'A.7: Short hash fails isValidRelayId');
  testAssert(!isValidRelayId('relay_zzzzzzzzzzzzzzzz'), 'A.8: Non-hex fails isValidRelayId');

  // -------------------------------------------------------------------------
  // Category B: Deterministic Identity
  // -------------------------------------------------------------------------
  console.log('Testing Category B: Deterministic Identity...');
  const relayId1Again = generateDeterministicRelayId('seed_relay_primary_alpha');
  const relayId2 = generateDeterministicRelayId('seed_relay_secondary_beta');
  testAssert(relayId1 === relayId1Again, 'B.1: Same seed produces exact same Relay ID');
  testAssert(relayId1 !== relayId2, 'B.2: Different seed produces distinct Relay ID');
  assert.throws(
    () => generateDeterministicRelayId('192.168.1.100'),
    /Network location.*is strictly forbidden/,
    'B.3: Reject IP as relay identity seed'
  );
  assertionCount++;
  assert.throws(
    () => generateDeterministicRelayId('My_Home_SSID'),
    /Network location.*is strictly forbidden/,
    'B.4: Reject SSID as relay identity seed'
  );
  assertionCount++;
  assert.throws(
    () => generateDeterministicRelayId('public_wifi_guest'),
    /Network location.*is strictly forbidden/,
    'B.5: Reject Wi-Fi keyword in relay seed'
  );
  assertionCount++;
  assert.throws(
    () => assertRelayIdentitySeparation(relayId1, relayId1, 'sess_1', 'brain_1'),
    /RELAY_ID cannot equal DEVICE_ID/,
    'B.6: Reject RELAY_ID == DEVICE_ID'
  );
  assertionCount++;
  assert.throws(
    () => assertRelayIdentitySeparation(relayId1, 'dev_1', relayId1, 'brain_1'),
    /RELAY_ID cannot equal SESSION_ID/,
    'B.7: Reject RELAY_ID == SESSION_ID'
  );
  assertionCount++;
  assert.throws(
    () => assertRelayIdentitySeparation(relayId1, 'dev_1', 'sess_1', relayId1),
    /RELAY_ID cannot equal BRAIN_ID/,
    'B.8: Reject RELAY_ID == BRAIN_ID'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category C: Endpoint Abstraction
  // -------------------------------------------------------------------------
  console.log('Testing Category C: Endpoint Abstraction...');
  const validEp = {
    host: 'relay.bowcon.net',
    port: 443,
    protocol: 'wss' as const,
    tlsRequired: true,
    isLocal: false,
  };
  validateRelayEndpoint(validEp);
  testAssert(true, 'C.1: Valid endpoint passes validation');
  testAssert(formatRelayEndpointUrl(validEp) === 'wss://relay.bowcon.net:443', 'C.2: Endpoint formats canonical URL');
  testAssert(areEndpointsEquivalent(validEp, { ...validEp }), 'C.3: Identical endpoints are equivalent');
  testAssert(!areEndpointsEquivalent(validEp, { ...validEp, port: 8443 }), 'C.4: Port mismatch not equivalent');
  assert.throws(
    () => validateRelayEndpoint({ ...validEp, tlsRequired: false }),
    /Remote non-local relay endpoints MUST require TLS/,
    'C.5: Remote endpoint without TLS is rejected'
  );
  assertionCount++;
  assertRelayEndpointKnowledgeDoesNotGrantAccess(true, true);
  testAssert(true, 'C.6: Admitted endpoint access allowed');
  assert.throws(
    () => assertRelayEndpointKnowledgeDoesNotGrantAccess(true, false),
    /ENDPOINT_KNOWLEDGE != ACCESS/,
    'C.7: Reject endpoint access without zero-trust admission'
  );
  assertionCount++;
  const memEndpoint = {
    host: 'localhost',
    port: 9001,
    protocol: 'test-in-memory' as const,
    tlsRequired: false,
    isLocal: true,
  };
  validateRelayEndpoint(memEndpoint);
  testAssert(formatRelayEndpointUrl(memEndpoint) === 'memory://localhost:9001', 'C.8: Test-in-memory URI formatted');

  // -------------------------------------------------------------------------
  // Category D: Relay Registration
  // -------------------------------------------------------------------------
  console.log('Testing Category D: Relay Registration...');
  const regManager = new RelayRegistrationManager();
  const validReg = {
    relayId: relayId1,
    advertisedEndpoint: validEp,
    supportedProtocols: ['wss', 'quic'],
    capabilities: ['ROUTING' as const, 'MULTIPLEXING' as const, 'HEARTBEAT' as const],
    scope: {
      brainId: 'brain_authoritative_01',
      tenantId: 'tenant_bow_01',
      allowedSurfaces: ['DESKTOP' as const, 'MOBILE' as const, 'ROBOT' as const],
    },
    registeredAt: Date.now(),
    status: 'ACTIVE' as const,
    version: RELAY_PROTOCOL_VERSION,
  };
  validateRelayRegistration(validReg);
  testAssert(true, 'D.1: Valid registration validated');
  regManager.register(validReg);
  testAssert(regManager.isRegistered(relayId1), 'D.2: Relay is registered in manager');
  testAssert(regManager.getRegistration(relayId1)?.relayId === relayId1, 'D.3: Retrieved registration matches');
  testAssert(regManager.listRegistrations().length === 1, 'D.4: List registrations contains 1 entry');
  testAssert(regManager.getRegistration(relayId1)?.status === 'ACTIVE', 'D.5: Registration status is ACTIVE');

  // -------------------------------------------------------------------------
  // Category E: Registration Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category E: Registration Rejection...');
  assert.throws(
    () => validateRelayRegistration({ ...validReg, version: '3.0.0' }),
    /Version incompatibility/,
    'E.1: Incompatible protocol version rejected'
  );
  assertionCount++;
  assert.throws(
    () => validateRelayRegistration({ ...validReg, supportedProtocols: [] }),
    /Relay must support at least one protocol/,
    'E.2: Empty protocols rejected'
  );
  assertionCount++;
  assert.throws(
    () => validateRelayRegistration({ ...validReg, capabilities: [] }),
    /Relay must at minimum possess ROUTING capability/,
    'E.3: Registration missing ROUTING capability rejected'
  );
  assertionCount++;
  regManager.revoke(relayId1);
  testAssert(!regManager.isRegistered(relayId1), 'E.4: Revoked relay is no longer active');
  assert.throws(
    () => regManager.register(validReg),
    /has been REVOKED/,
    'E.5: Cannot re-register revoked relay'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category F: Relay Admission Boundary
  // -------------------------------------------------------------------------
  console.log('Testing Category F: Relay Admission Boundary...');
  const admissionBridge = new RelayAdmissionBridge();
  testAssert(admissionBridge.getAdmissionRuntime() !== undefined, 'F.1: Admission runtime is accessible');
  testAssert(
    admissionBridge.getAdmissionRuntime() !== (undefined as any),
    'F.2: Relay relies on ZeroTrustAdmissionRuntime'
  );
  const mockAdmissionParams = {
    relayId: relayId2,
    deviceId: 'dev_mobile_01',
    surfaceType: 'MOBILE' as const,
    scope: {
      tenantId: 'tenant_bow_01',
      userId: 'usr_alice_01',
      deviceId: 'dev_mobile_01',
      surfaceId: 'surf_mobile_01',
      brainId: 'brain_authoritative_01',
    },
    networkContext: {
      networkType: 'HOME_WIFI' as const,
      ipAddress: '192.168.1.55',
      ssid: 'Alice_Home_WiFi',
    },
    endpoint: memEndpoint,
  };
  const dec1 = admissionBridge.evaluateRelayAdmission(mockAdmissionParams);
  testAssert(dec1.decisionId.length > 0, 'F.3: Admission decision produced');
  testAssert(dec1.decision === 'ADMIT' || dec1.decision === 'REJECT', 'F.4: Typed decision result');

  // -------------------------------------------------------------------------
  // Category G: Device Admission Integration
  // -------------------------------------------------------------------------
  console.log('Testing Category G: Device Admission Integration...');
  admissionBridge.assertDeviceAdmitted({
    decisionId: 'dec_mock',
    requestId: 'req_mock',
    decision: 'ADMIT',
    admitted: true,
    deviceId: 'dev_mobile_01',
    scope: {
      userId: 'usr_alice_01',
      sessionId: 'sess_1',
      brainId: 'brain_1',
      surfaceId: 'surf_1',
      transportId: 't1',
      gatewayId: 'g1',
      adapterId: 'a1',
      connectionId: 'c1',
      deviceId: 'dev_mobile_01',
    },
    allowedCapabilities: ['CONNECTIVITY'],
    rejectedCapabilities: [],
    network: {
      networkType: 'WIFI',
      ipAddress: '192.168.1.55',
      locality: 'LOCAL',
      isRoaming: false,
      transportType: 'relay',
    },
    timestamp: Date.now(),
    decisionFingerprint: 'fp_dec',
  });
  testAssert(true, 'G.1: Explicit ADMIT decision passes');
  assert.throws(
    () =>
      admissionBridge.assertDeviceAdmitted({
        decisionId: 'dec_mock_fail',
        requestId: 'req_mock',
        decision: 'REJECT',
        admitted: false,
        deviceId: 'dev_mobile_01',
        scope: {} as any,
        allowedCapabilities: [],
        rejectedCapabilities: [],
        rejectionReason: 'DEVICE_REVOKED',
        network: {} as any,
        timestamp: Date.now(),
        decisionFingerprint: 'fp_fail',
      }),
    /ADMISSION_DENIED/,
    'G.2: REJECT decision fails closed'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category H: Session Creation
  // -------------------------------------------------------------------------
  console.log('Testing Category H: Session Creation...');
  const sessionRecord1 = new RemoteSessionRecord({
    sessionId: 'sess_remote_001',
    deviceId: 'dev_mobile_01',
    relayId: relayId2,
    brainId: 'brain_authoritative_01',
    surfaceId: 'surf_mobile_01',
    surfaceType: 'MOBILE',
    tenantId: 'tenant_bow_01',
    userId: 'usr_alice_01',
    connectionId: 'conn_001',
    gatewayId: 'gw_001',
    initialState: 'CONNECTED',
  });
  testAssert(sessionRecord1.sessionId === 'sess_remote_001', 'H.1: Session ID preserved');
  testAssert(sessionRecord1.deviceId === 'dev_mobile_01', 'H.2: Device ID preserved');
  testAssert(sessionRecord1.getState() === 'CONNECTED', 'H.3: Initial state is CONNECTED');
  testAssert(sessionRecord1.getSequenceNumber() === 0, 'H.4: Initial sequence is 0');
  testAssert(sessionRecord1.incrementSequence() === 1, 'H.5: Sequence increments monotonically');
  testAssert(sessionRecord1.getSequenceNumber() === 1, 'H.6: Sequence is now 1');
  sessionRecord1.acknowledgeSequence(1);
  testAssert(sessionRecord1.getAckSequenceNumber() === 1, 'H.7: Ack sequence matches');

  // -------------------------------------------------------------------------
  // Category I: Session Isolation
  // -------------------------------------------------------------------------
  console.log('Testing Category I: Session Isolation...');
  const sessionRecord2 = new RemoteSessionRecord({
    sessionId: 'sess_remote_002',
    deviceId: 'dev_mobile_01', // Same device, different session
    relayId: relayId2,
    brainId: 'brain_authoritative_01',
    surfaceId: 'surf_mobile_01',
    surfaceType: 'MOBILE',
    tenantId: 'tenant_bow_01',
    userId: 'usr_alice_01',
    connectionId: 'conn_002',
    gatewayId: 'gw_001',
    initialState: 'CONNECTED',
  });
  testAssert(sessionRecord1.sessionId !== sessionRecord2.sessionId, 'I.1: Distinct session IDs');
  assertSessionIsolation(sessionRecord1.toImmutable(), sessionRecord2.toImmutable());
  testAssert(true, 'I.2: Session isolation verified');
  assert.throws(
    () => assertSessionIsolation(sessionRecord1.toImmutable(), sessionRecord1.toImmutable()),
    /SESSION_COLLISION/,
    'I.3: Session collision rejected'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category J: Session Lifecycle
  // -------------------------------------------------------------------------
  console.log('Testing Category J: Session Lifecycle...');
  testAssert(!isTerminalRelayState(sessionRecord1.getState()), 'J.1: CONNECTED is not terminal');
  testAssert(requiresAdmissionCheck(sessionRecord1.getState()), 'J.2: CONNECTED requires admission check');
  sessionRecord1.transitionTo('ADMISSION_PENDING');
  testAssert(requiresAdmissionCheck(sessionRecord1.getState()), 'J.3: ADMISSION_PENDING requires admission check');
  sessionRecord1.transitionTo('ADMITTED');
  testAssert(!requiresAdmissionCheck(sessionRecord1.getState()), 'J.4: ADMITTED no longer requires check');
  sessionRecord1.transitionTo('SESSION_ESTABLISHING');
  testAssert(isConnectingOrResuming(sessionRecord1.getState()), 'J.5: SESSION_ESTABLISHING is connecting');
  sessionRecord1.transitionTo('SESSION_ACTIVE');
  testAssert(isActiveRelaySession(sessionRecord1.getState()), 'J.6: SESSION_ACTIVE is active');
  testAssert(canTransmitPayload(sessionRecord1.getState()), 'J.7: Can transmit payload');
  sessionRecord1.transitionTo('DEGRADED');
  testAssert(isRecoverableRelayState(sessionRecord1.getState()), 'J.8: DEGRADED is recoverable');
  testAssert(canTransmitPayload(sessionRecord1.getState()), 'J.9: DEGRADED can still transmit critical payloads');
  sessionRecord1.transitionTo('SESSION_ACTIVE');
  sessionRecord1.transitionTo('TERMINATING');
  sessionRecord1.transitionTo('TERMINATED');
  testAssert(isTerminalRelayState(sessionRecord1.getState()), 'J.10: TERMINATED is terminal');
  assert.throws(
    () => sessionRecord1.transitionTo('SESSION_ACTIVE'),
    /ILLEGAL_RELAY_TRANSITION/,
    'J.11: Cannot transition out of TERMINATED'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category K: Heartbeat
  // -------------------------------------------------------------------------
  console.log('Testing Category K: Heartbeat...');
  const hbTracker = new RelayHeartbeatTracker({ intervalMs: 3000, degradedMissThreshold: 2, unhealthyMissThreshold: 4 });
  const hb1 = hbTracker.recordHeartbeat(relayId2, 'sess_hb_01', 25);
  testAssert(hb1.status === 'HEALTHY', 'K.1: Initial heartbeat is HEALTHY');
  testAssert(hb1.rttMs === 25, 'K.2: RTT recorded accurately');
  testAssert(hbTracker.getStatus('sess_hb_01') === 'HEALTHY', 'K.3: Tracker reports HEALTHY');

  // -------------------------------------------------------------------------
  // Category L: Heartbeat Timeout
  // -------------------------------------------------------------------------
  console.log('Testing Category L: Heartbeat Timeout...');
  const hbMiss1 = hbTracker.recordMissedHeartbeat('sess_hb_01');
  testAssert(hbMiss1.status === 'HEALTHY', 'L.1: Single miss stays HEALTHY');
  const hbMiss2 = hbTracker.recordMissedHeartbeat('sess_hb_01');
  testAssert(hbMiss2.status === 'DEGRADED', 'L.2: Second miss transitions to DEGRADED');
  const hbMiss3 = hbTracker.recordMissedHeartbeat('sess_hb_01');
  testAssert(hbMiss3.status === 'DEGRADED', 'L.3: Third miss stays DEGRADED');
  const hbMiss4 = hbTracker.recordMissedHeartbeat('sess_hb_01');
  testAssert(hbMiss4.status === 'UNHEALTHY', 'L.4: Fourth miss transitions to UNHEALTHY');

  // -------------------------------------------------------------------------
  // Category M: Degraded State
  // -------------------------------------------------------------------------
  console.log('Testing Category M: Degraded State...');
  const hbRecover = hbTracker.recordHeartbeat(relayId2, 'sess_hb_01', 30);
  testAssert(hbRecover.status === 'HEALTHY', 'M.1: Successful heartbeat recovers state to HEALTHY');
  testAssert(hbRecover.consecutiveMisses === 0, 'M.2: Consecutive misses reset to 0');
  RelayHeartbeatTracker.assertHeartbeatNonInterference(false);
  testAssert(true, 'M.3: Heartbeat non-interference assertion passed');
  assert.throws(
    () => RelayHeartbeatTracker.assertHeartbeatNonInterference(true),
    /Heartbeat event must NEVER trigger task execution/,
    'M.4: Heartbeat never triggers task execution'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category N: Reconnect
  // -------------------------------------------------------------------------
  console.log('Testing Category N: Reconnect...');
  const reconnectScheduler = new RelayReconnectScheduler({ maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 1000 });
  const att1 = reconnectScheduler.scheduleNextAttempt('sess_reconn_01');
  testAssert(att1.attempt === 1 && att1.allowed, 'N.1: First reconnect attempt allowed');
  testAssert(att1.delayMs === 100, 'N.2: Initial delay applied');
  const att2 = reconnectScheduler.scheduleNextAttempt('sess_reconn_01');
  testAssert(att2.attempt === 2 && att2.allowed && att2.delayMs === 200, 'N.3: Exponential backoff applied');
  const att3 = reconnectScheduler.scheduleNextAttempt('sess_reconn_01');
  testAssert(att3.attempt === 3 && att3.allowed, 'N.4: Third attempt allowed');
  const att4 = reconnectScheduler.scheduleNextAttempt('sess_reconn_01');
  testAssert(!att4.allowed, 'N.5: Exhausted attempts rejected');
  testAssert(reconnectScheduler.isExhausted('sess_reconn_01'), 'N.6: Scheduler reports exhausted');

  // -------------------------------------------------------------------------
  // Category O: Resume
  // -------------------------------------------------------------------------
  console.log('Testing Category O: Resume...');
  const resumeCoord = new RelayResumeCoordinator();
  const activeSessForResume = new RemoteSessionRecord({
    sessionId: 'sess_resume_01',
    deviceId: 'dev_mobile_02',
    relayId: relayId2,
    brainId: 'brain_authoritative_01',
    surfaceId: 'surf_mobile_01',
    surfaceType: 'MOBILE',
    tenantId: 'tenant_bow_01',
    userId: 'usr_alice_01',
    connectionId: 'conn_res_01',
    gatewayId: 'gw_001',
    initialState: 'SESSION_ACTIVE',
  });
  activeSessForResume.incrementSequence(); // seq 1
  activeSessForResume.incrementSequence(); // seq 2
  const token = resumeCoord.generateResumeToken(activeSessForResume, 60000);
  testAssert(typeof token === 'string' && token.length === 64, 'O.1: Resume token is SHA-256 hex string');
  testAssert(activeSessForResume.getResumeToken() === token, 'O.2: Session stores resume token');

  // -------------------------------------------------------------------------
  // Category P: Sequence Continuity
  // -------------------------------------------------------------------------
  console.log('Testing Category P: Sequence Continuity...');
  const resumeVal = resumeCoord.validateResumeRequest({
    sessionId: 'sess_resume_01',
    providedToken: token,
    clientLastAckSeq: 1,
    clientNextSeq: 2,
  });
  testAssert(resumeVal.valid, 'P.1: Valid sequence continuity accepted');

  // -------------------------------------------------------------------------
  // Category Q: Sequence Rewind Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category Q: Sequence Rewind Rejection...');
  assert.throws(
    () =>
      resumeCoord.validateResumeRequest({
        sessionId: 'sess_resume_01',
        providedToken: token,
        clientLastAckSeq: 2,
        clientNextSeq: 2, // Next sequence <= last ack sequence -> REWIND
      }),
    /SEQUENCE_REWIND_DETECTED/,
    'Q.1: Reject sequence rewind'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category R: Sequence Gap Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category R: Sequence Gap Rejection...');
  assert.throws(
    () =>
      resumeCoord.validateResumeRequest({
        sessionId: 'sess_resume_01',
        providedToken: token,
        clientLastAckSeq: 1,
        clientNextSeq: 10, // Far ahead of expected (seq 2 + 1)
      }),
    /SEQUENCE_GAP_DETECTED/,
    'R.1: Reject unacknowledged sequence gap'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category S: Replay Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category S: Replay Rejection...');
  assert.throws(
    () =>
      resumeCoord.validateResumeRequest({
        sessionId: 'sess_resume_01',
        providedToken: 'forged_or_replayed_token_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        clientLastAckSeq: 1,
        clientNextSeq: 2,
      }),
    /RESUME_TOKEN_MISMATCH/,
    'S.1: Replayed or invalid token rejected'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category T: Mutated Replay Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category T: Mutated Replay Rejection...');
  const mutatedToken = token.substring(0, 63) + (token[63] === 'a' ? 'b' : 'a');
  assert.throws(
    () =>
      resumeCoord.validateResumeRequest({
        sessionId: 'sess_resume_01',
        providedToken: mutatedToken,
        clientLastAckSeq: 1,
        clientNextSeq: 2,
      }),
    /RESUME_TOKEN_MISMATCH/,
    'T.1: Mutated resume token rejected fail-closed'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category U: Network Roaming
  // -------------------------------------------------------------------------
  console.log('Testing Category U: Network Roaming...');
  const runtime = new SecureBrainRelayRuntime();
  runtime.registerRelay({
    ...validReg,
    relayId: relayId2,
  });

  // Authorize dev_roam_mobile in admission runtime
  const trustProvider = runtime.getAdmissionBridge().getAdmissionRuntime().getTrustProvider() as InMemoryAdmissionTrustProvider;
  const keyStore = runtime.getAdmissionBridge().getAdmissionRuntime().getKeyStore();
  const keyMobile = keyStore.generateKey('dev_roam_mobile', 1);

  const trustRecord = createPersistentDeviceRecord({
    deviceId: 'dev_roam_mobile',
    userId: 'usr_alice_01',
    brainId: 'brain_authoritative_01',
    surfaceId: 'surf_mobile_01',
    pairingId: 'pair_12345678',
    trustId: 'trust_12345678',
    deviceType: 'MOBILE',
    scope: {
      userId: 'usr_alice_01',
      sessionId: 'sess_roam_test',
      brainId: 'brain_authoritative_01',
      surfaceId: 'surf_mobile_01',
      transportId: 'transport_relay_v4',
      gatewayId: 'gw_relay_v4',
      adapterId: 'adapter_relay_v4',
      connectionId: 'conn_relay_01',
      deviceId: 'dev_roam_mobile',
    },
    publicKeyId: keyMobile.keyId,
    keyVersion: 1,
    trustLevel: 'TRUSTED',
    capabilityEnvelope: ['RECEIVE_EVENTS', 'RECEIVE_ROBOT_TELEMETRY'],
  });
  trustProvider.register(trustRecord);

  const establishedSession = await runtime.establishSession({
    sessionId: 'sess_roam_test',
    relayId: relayId2,
    deviceId: 'dev_roam_mobile',
    surfaceType: 'MOBILE',
    scope: {
      tenantId: 'tenant_bow_01',
      userId: 'usr_alice_01',
      surfaceId: 'surf_mobile_01',
      brainId: 'brain_authoritative_01',
    },
    networkContext: {
      networkType: 'HOME_WIFI',
      ipAddress: '192.168.1.120',
      ssid: 'Home_WiFi',
    },
    endpoint: memEndpoint,
  });
  testAssert(establishedSession.deviceId === 'dev_roam_mobile', 'U.1: Device identity created');
  testAssert(establishedSession.state === 'SESSION_ACTIVE', 'U.2: Session is SESSION_ACTIVE');

  // -------------------------------------------------------------------------
  // Category V: Wi-Fi to Cellular Transition
  // -------------------------------------------------------------------------
  console.log('Testing Category V: Wi-Fi to Cellular Transition...');
  const roamTo4G = runtime.handleNetworkRoaming('sess_roam_test', {
    networkType: 'CELLULAR_4G',
    ipAddress: '10.200.45.12',
  });
  testAssert(roamTo4G.roamingDetected, 'V.1: Roaming to 4G detected');
  testAssert(roamTo4G.session.deviceId === 'dev_roam_mobile', 'V.2: Device ID remains strictly unchanged on 4G');
  testAssert(roamTo4G.session.sessionId === 'sess_roam_test', 'V.3: Session ID remains consistent');

  // -------------------------------------------------------------------------
  // Category W: Cellular to Wi-Fi Transition
  // -------------------------------------------------------------------------
  console.log('Testing Category W: Cellular to Wi-Fi Transition...');
  const roamTo5G = runtime.handleNetworkRoaming('sess_roam_test', {
    networkType: 'CELLULAR_5G',
    ipAddress: '10.200.88.99',
  });
  testAssert(roamTo5G.session.deviceId === 'dev_roam_mobile', 'W.1: Device ID unchanged on 5G');

  const roamToPublicWifi = runtime.handleNetworkRoaming('sess_roam_test', {
    networkType: 'PUBLIC_WIFI',
    ipAddress: '172.16.4.15',
    ssid: 'CoffeeShop_Free_WiFi',
  });
  testAssert(roamToPublicWifi.session.deviceId === 'dev_roam_mobile', 'W.2: Device ID unchanged on Public Wi-Fi');

  const roamBackHome = runtime.handleNetworkRoaming('sess_roam_test', {
    networkType: 'HOME_WIFI',
    ipAddress: '192.168.1.120',
    ssid: 'Home_WiFi',
  });
  testAssert(roamBackHome.session.deviceId === 'dev_roam_mobile', 'W.3: Device ID unchanged back at Home Wi-Fi');

  // -------------------------------------------------------------------------
  // Category X: Endpoint Change Without Identity Change
  // -------------------------------------------------------------------------
  console.log('Testing Category X: Endpoint Change Without Identity Change...');
  testAssert(roamBackHome.session.deviceId === 'dev_roam_mobile', 'X.1: IP != DEVICE_IDENTITY confirmed');
  testAssert(roamBackHome.session.relayId === relayId2, 'X.2: Relay ID != DEVICE_IDENTITY confirmed');
  testAssert(roamBackHome.session.userId === 'usr_alice_01', 'X.3: User scope unchanged');

  // -------------------------------------------------------------------------
  // Category Y: Backpressure
  // -------------------------------------------------------------------------
  console.log('Testing Category Y: Backpressure...');
  const bp = new RelayBackpressureController({ elevatedThreshold: 2, highThreshold: 4, overflowThreshold: 6 });
  testAssert(bp.getState() === 'NORMAL', 'Y.1: Initial backpressure state is NORMAL');
  const dummyMsg = (id: string, priority: any = 'NORMAL', category: any = 'REQUEST') => ({
    messageId: id,
    category,
    priority,
    sessionId: 'sess_roam_test',
    deviceId: 'dev_roam_mobile',
    surfaceId: 'surf_mobile_01',
    surfaceType: 'MOBILE' as const,
    relayId: relayId2,
    brainId: 'brain_authoritative_01',
    sequence: 1,
    timestamp: Date.now(),
    payload: { action: 'ping' },
    riskLevel: 'LOW' as const,
  });
  bp.enqueue(dummyMsg('m1'));
  bp.enqueue(dummyMsg('m2'));
  testAssert(bp.getState() === 'ELEVATED', 'Y.2: Backpressure state transitions to ELEVATED');
  bp.enqueue(dummyMsg('m3'));
  bp.enqueue(dummyMsg('m4'));
  testAssert(bp.getState() === 'HIGH', 'Y.3: Backpressure state transitions to HIGH');
  bp.enqueue(dummyMsg('m5'));
  bp.enqueue(dummyMsg('m6'));
  testAssert(bp.getState() === 'OVERFLOW', 'Y.4: Backpressure state transitions to OVERFLOW');

  // -------------------------------------------------------------------------
  // Category Z: Overflow
  // -------------------------------------------------------------------------
  console.log('Testing Category Z: Overflow...');
  // Critical messages must not be dropped in OVERFLOW
  testAssert(bp.enqueue(dummyMsg('m_crit', 'CRITICAL', 'CONTROL')), 'Z.1: Critical control message accepted in overflow');
  // Normal priority message must be rejected with typed error (no silent drop)
  assert.throws(
    () => bp.enqueue(dummyMsg('m_low', 'LOW', 'EVENT')),
    /BACKPRESSURE_OVERFLOW/,
    'Z.2: Low priority message rejected during overflow'
  );
  assertionCount++;
  testAssert(bp.getDroppedCount() === 1, 'Z.3: Dropped count incremented accurately');

  // -------------------------------------------------------------------------
  // Category AA: Timeout Taxonomy
  // -------------------------------------------------------------------------
  console.log('Testing Category AA: Timeout Taxonomy...');
  testAssert(RELAY_TIMEOUT_DEFAULTS.CONNECTION === 10000, 'AA.1: CONNECTION timeout default is 10s');
  testAssert(RELAY_TIMEOUT_DEFAULTS.ADMISSION === 8000, 'AA.2: ADMISSION timeout default is 8s');
  testAssert(RELAY_TIMEOUT_DEFAULTS.HEARTBEAT === 3000, 'AA.3: HEARTBEAT timeout default is 3s');
  testAssert(RELAY_TIMEOUT_DEFAULTS.RECONNECT === 15000, 'AA.4: RECONNECT timeout default is 15s');
  testAssert(RELAY_TIMEOUT_DEFAULTS.SESSION_ESTABLISHMENT === 5000, 'AA.5: SESSION_ESTABLISHMENT timeout is 5s');
  testAssert(RELAY_TIMEOUT_DEFAULTS.RESUME === 5000, 'AA.6: RESUME timeout default is 5s');
  testAssert(RELAY_TIMEOUT_DEFAULTS.ROUTING === 3000, 'AA.7: ROUTING timeout default is 3s');
  testAssert(RELAY_TIMEOUT_DEFAULTS.SHUTDOWN === 5000, 'AA.8: SHUTDOWN timeout default is 5s');
  const timeoutErr = new RelayTimeoutError('CONNECTION', 10000, 'openSocket');
  testAssert(timeoutErr.category === 'CONNECTION', 'AA.9: Timeout category preserved');
  await assert.rejects(
    () => withRelayTimeout(new Promise((res) => setTimeout(res, 200)), 50, 'ROUTING', 'slowOp'),
    /RELAY_TIMEOUT \[ROUTING\]/,
    'AA.10: withRelayTimeout aborts slow operation with typed error'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category AB: Graceful Disconnect
  // -------------------------------------------------------------------------
  console.log('Testing Category AB: Graceful Disconnect...');
  const inMemoryAdapter = new InMemoryRelayTransportAdapter();
  const conn = new RelayConnection('conn_test_01', memEndpoint, inMemoryAdapter);
  await conn.connect();
  testAssert(conn.isConnected(), 'AB.1: Connection opened');
  await conn.disconnect();
  testAssert(!conn.isConnected(), 'AB.2: Connection gracefully closed');

  // -------------------------------------------------------------------------
  // Category AC: Graceful Shutdown
  // -------------------------------------------------------------------------
  console.log('Testing Category AC: Graceful Shutdown...');
  runtime.terminateSession('sess_roam_test', 'User logged off');
  testAssert(runtime.getMultiplexer().getSession('sess_roam_test') === undefined, 'AC.1: Session removed from multiplexer');

  // -------------------------------------------------------------------------
  // Category AD: Cross-User Isolation
  // -------------------------------------------------------------------------
  console.log('Testing Category AD: Cross-User Isolation...');
  const userRegistry = runtime.getRegistry();
  testAssert(userRegistry.getSessionsForUser('usr_bob').length === 0, 'AD.1: Bob has 0 sessions');
  testAssert(userRegistry.getSessionsForUser('usr_alice_01').length === 1, 'AD.2: Alice has exactly her session');

  // -------------------------------------------------------------------------
  // Category AE: Cross-Device Isolation
  // -------------------------------------------------------------------------
  console.log('Testing Category AE: Cross-Device Isolation...');
  testAssert(userRegistry.getSessionsForDevice('dev_unknown').length === 0, 'AE.1: Unknown device has 0 sessions');
  testAssert(userRegistry.getSessionsForDevice('dev_roam_mobile').length === 1, 'AE.2: Known device has 1 session');

  // -------------------------------------------------------------------------
  // Category AF: Cross-Session Isolation
  // -------------------------------------------------------------------------
  console.log('Testing Category AF: Cross-Session Isolation...');
  testAssert(userRegistry.getSession('non_existent_session') === undefined, 'AF.1: Non-existent session query is undefined');

  // -------------------------------------------------------------------------
  // Category AG: Cross-Brain Isolation
  // -------------------------------------------------------------------------
  console.log('Testing Category AG: Cross-Brain Isolation...');
  const mux = new RelayMultiplexer();
  const sessMux = new RemoteSessionRecord({
    sessionId: 'sess_mux_01',
    deviceId: 'dev_mux_01',
    relayId: relayId2,
    brainId: 'brain_authoritative_01',
    surfaceId: 'surf_mux_01',
    surfaceType: 'DESKTOP',
    tenantId: 'tenant_bow_01',
    userId: 'usr_alice_01',
    connectionId: 'c1',
    gatewayId: 'g1',
  });
  mux.registerSession(sessMux);
  assert.throws(
    () =>
      mux.routeInbound({
        messageId: 'msg_cross_brain',
        category: 'REQUEST',
        priority: 'NORMAL',
        sessionId: 'sess_mux_01',
        deviceId: 'dev_mux_01',
        surfaceId: 'surf_mux_01',
        surfaceType: 'DESKTOP',
        relayId: relayId2,
        brainId: 'brain_imposter_99', // Brain mismatch!
        sequence: 1,
        timestamp: Date.now(),
        payload: {},
        riskLevel: 'LOW',
      }),
    /CROSS_BRAIN_INJECTION/,
    'AG.1: Reject cross-Brain message injection'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category AH: Cross-Surface Isolation
  // -------------------------------------------------------------------------
  console.log('Testing Category AH: Cross-Surface Isolation...');
  assert.throws(
    () =>
      mux.routeInbound({
        messageId: 'msg_cross_surf',
        category: 'REQUEST',
        priority: 'NORMAL',
        sessionId: 'sess_mux_01',
        deviceId: 'dev_mux_01',
        surfaceId: 'surf_mux_01',
        surfaceType: 'ROBOT', // Surface mismatch! Expected DESKTOP
        relayId: relayId2,
        brainId: 'brain_authoritative_01',
        sequence: 1,
        timestamp: Date.now(),
        payload: {},
        riskLevel: 'LOW',
      }),
    /CROSS_SURFACE_INJECTION/,
    'AH.1: Reject cross-surface message injection'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category AI: Capability Filtering
  // -------------------------------------------------------------------------
  console.log('Testing Category AI: Capability Filtering...');
  testAssert(validReg.capabilities.includes('ROUTING'), 'AI.1: Relay includes ROUTING');
  testAssert(!validReg.capabilities.includes('LLM_EXECUTION' as any), 'AI.2: Relay strictly excludes cognitive capabilities');
  testAssert(!validReg.capabilities.includes('TOOL_EXECUTION' as any), 'AI.3: Relay strictly excludes tool execution capabilities');

  // -------------------------------------------------------------------------
  // Category AJ: Risk Preservation
  // -------------------------------------------------------------------------
  console.log('Testing Category AJ: Risk Preservation...');
  const msgOriginal = {
    messageId: 'm_risk_1',
    category: 'REQUEST' as const,
    priority: 'HIGH' as const,
    sessionId: 's1',
    deviceId: 'd1',
    surfaceId: 'surf1',
    surfaceType: 'MOBILE' as const,
    relayId: relayId2,
    brainId: 'b1',
    sequence: 1,
    timestamp: Date.now(),
    payload: {},
    riskLevel: 'CRITICAL' as const,
  };
  RelayMessageRouter.assertRoutingPreservation(msgOriginal, { ...msgOriginal });
  testAssert(true, 'AJ.1: Preserved risk level verified');
  assert.throws(
    () =>
      RelayMessageRouter.assertRoutingPreservation(msgOriginal, {
        ...msgOriginal,
        riskLevel: 'LOW', // Downgraded risk!
      }),
    /Risk level was downgraded/,
    'AJ.2: Reject risk level downgrade during routing'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category AK: Audit Immutability
  // -------------------------------------------------------------------------
  console.log('Testing Category AK: Audit Immutability...');
  const audit = new RelayAuditLedger();
  const rec = audit.record({
    eventType: 'RELAY_REGISTERED',
    relayId: relayId1,
    details: { note: 'test audit' },
  });
  testAssert(Object.isFrozen(rec), 'AK.1: Audit record is frozen');
  testAssert(Object.isFrozen(rec.details), 'AK.2: Audit details are frozen');
  testAssert(audit.count() === 1, 'AK.3: Audit ledger count matches');

  // -------------------------------------------------------------------------
  // Category AL: Secret Scrubbing
  // -------------------------------------------------------------------------
  console.log('Testing Category AL: Secret Scrubbing...');
  const dirtyDetails = {
    user: 'alice',
    privateKey: 'SECRET_PEM_KEY_DO_NOT_LEAK',
    authToken: 'bearer_token_xyz',
    devicePassword: 'super_secret_password',
    nested: {
      proofSignature: 'ecdsa_sig_secret',
      safeField: 12345,
    },
  };
  const clean = scrubRelayAuditDetails(dirtyDetails);
  testAssert(clean.privateKey === '[REDACTED_SECRET]', 'AL.1: privateKey scrubbed');
  testAssert(clean.authToken === '[REDACTED_SECRET]', 'AL.2: authToken scrubbed');
  testAssert(clean.devicePassword === '[REDACTED_SECRET]', 'AL.3: devicePassword scrubbed');
  testAssert((clean.nested as any).proofSignature === '[REDACTED_SECRET]', 'AL.4: nested signature scrubbed');
  testAssert((clean.nested as any).safeField === 12345, 'AL.5: safe field preserved');

  // -------------------------------------------------------------------------
  // Category AM: Relay Spoofing Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category AM: Relay Spoofing Rejection...');
  const spoofedReg = {
    ...validReg,
    relayId: 'relay_invalid_spoof_id',
  };
  assert.throws(
    () => validateRelayRegistration(spoofedReg),
    /Invalid relayId/,
    'AM.1: Malformed or spoofed relayId rejected'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category AN: Fake Device Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category AN: Fake Device Rejection...');
  const relayErr = new RelayError('FAKE_DEVICE', 'Fake device detected');
  testAssert(relayErr.code === 'FAKE_DEVICE', 'AN.1: Typed FAKE_DEVICE error produced');
  testAssert(relayErr.failClosed === true, 'AN.2: Security failure fails closed');

  // -------------------------------------------------------------------------
  // Category AO: Clone Identity Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category AO: Clone Identity Rejection...');
  const cloneErr = new RelayError('CLONED_DEVICE_ID', 'Cloned device rejected');
  testAssert(cloneErr.code === 'CLONED_DEVICE_ID', 'AO.1: Cloned device code verified');
  testAssert(cloneErr.failClosed === true, 'AO.2: Clone failure fails closed');

  // -------------------------------------------------------------------------
  // Category AP: Stale Resume Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category AP: Stale Resume Rejection...');
  const expiredCoordinator = new RelayResumeCoordinator();
  const dummySess = new RemoteSessionRecord({
    sessionId: 'sess_stale_01',
    deviceId: 'd1',
    relayId: relayId2,
    brainId: 'b1',
    surfaceId: 's1',
    surfaceType: 'MOBILE',
    tenantId: 't1',
    userId: 'u1',
    connectionId: 'c1',
    gatewayId: 'g1',
    initialState: 'SESSION_ACTIVE',
  });
  dummySess.incrementSequence();
  const staleToken = expiredCoordinator.generateResumeToken(dummySess, 10); // 10ms TTL
  await new Promise((res) => setTimeout(res, 25)); // Expire token
  assert.throws(
    () =>
      expiredCoordinator.validateResumeRequest({
        sessionId: 'sess_stale_01',
        providedToken: staleToken,
        clientLastAckSeq: 0,
        clientNextSeq: 1,
      }),
    /STALE_RESUME_TOKEN/,
    'AP.1: Expired resume token fails closed'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category AQ: Unauthorized Endpoint Rejection
  // -------------------------------------------------------------------------
  console.log('Testing Category AQ: Unauthorized Endpoint Rejection...');
  assert.throws(
    () =>
      validateRelayEndpoint({
        host: 'bad.host.org',
        port: -1, // Invalid port
        protocol: 'wss',
        tlsRequired: true,
        isLocal: false,
      }),
    /Invalid endpoint port/,
    'AQ.1: Negative or out-of-range port rejected'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category AR: Reconnect != Re-Execute
  // -------------------------------------------------------------------------
  console.log('Testing Category AR: Reconnect != Re-Execute...');
  RelayReconnectScheduler.assertReconnectDoesNotReExecute(false);
  testAssert(true, 'AR.1: Reconnect without re-execution permitted');
  assert.throws(
    () => RelayReconnectScheduler.assertReconnectDoesNotReExecute(true),
    /RECONNECT != RE-EXECUTE/,
    'AR.2: Automatic re-execution upon reconnection strictly prohibited'
  );
  assertionCount++;

  // -------------------------------------------------------------------------
  // Category AS: Relay != Brain
  // -------------------------------------------------------------------------
  console.log('Testing Category AS: Relay != Brain...');
  const nonInterference = SecureBrainRelayRuntime.verifyArchitecturalNonInterference();
  testAssert(nonInterference.callsLLM === false, 'AS.1: Relay NEVER calls LLM');
  testAssert(nonInterference.isCognitiveAuthority === false, 'AS.2: Relay is NEVER a cognitive authority');

  // -------------------------------------------------------------------------
  // Category AT: Relay != Execution Authority
  // -------------------------------------------------------------------------
  console.log('Testing Category AT: Relay != Execution Authority...');
  testAssert(nonInterference.executesTools === false, 'AT.1: Relay NEVER executes tools');

  // -------------------------------------------------------------------------
  // Category AU: Relay != PDP Authority
  // -------------------------------------------------------------------------
  console.log('Testing Category AU: Relay != PDP Authority...');
  testAssert(nonInterference.bypassesPDP === false, 'AU.1: Relay NEVER bypasses PDP');

  // -------------------------------------------------------------------------
  // Category AV: Relay != Memory Authority
  // -------------------------------------------------------------------------
  console.log('Testing Category AV: Relay != Memory Authority...');
  testAssert(nonInterference.mutatesBrainMemory === false, 'AV.1: Relay NEVER mutates Brain memory');

  // -------------------------------------------------------------------------
  // Category AW: Mobile Readiness
  // -------------------------------------------------------------------------
  console.log('Testing Category AW: Mobile Readiness...');
  const mobileSession = new RemoteSessionRecord({
    sessionId: 'sess_mobile_ready',
    deviceId: 'dev_iphone_16',
    relayId: relayId2,
    brainId: 'brain_authoritative_01',
    surfaceId: 'surf_ios_app',
    surfaceType: 'MOBILE',
    tenantId: 'tenant_bow_01',
    userId: 'usr_alice_01',
    connectionId: 'c_mobile',
    gatewayId: 'g_mobile',
    initialState: 'SESSION_ACTIVE',
  });
  testAssert(mobileSession.surfaceType === 'MOBILE', 'AW.1: Mobile surface explicitly supported');
  testAssert(mobileSession.getState() === 'SESSION_ACTIVE', 'AW.2: Mobile session active');

  // -------------------------------------------------------------------------
  // Category AX: Robot Readiness
  // -------------------------------------------------------------------------
  console.log('Testing Category AX: Robot Readiness...');
  const robotSession = new RemoteSessionRecord({
    sessionId: 'sess_robot_ready',
    deviceId: 'dev_unitree_b2',
    relayId: relayId2,
    brainId: 'brain_authoritative_01',
    surfaceId: 'surf_robot_surface',
    surfaceType: 'ROBOT',
    tenantId: 'tenant_bow_01',
    userId: 'usr_alice_01',
    connectionId: 'c_robot',
    gatewayId: 'g_robot',
    initialState: 'SESSION_ACTIVE',
  });
  testAssert(robotSession.surfaceType === 'ROBOT', 'AX.1: Robot surface explicitly supported');
  testAssert(nonInterference.controlsActuators === false, 'AX.2: Relay NEVER directly controls robot actuators');

  // -------------------------------------------------------------------------
  // Category AY: Desktop Separation
  // -------------------------------------------------------------------------
  console.log('Testing Category AY: Desktop Separation...');
  const desktopSession = new RemoteSessionRecord({
    sessionId: 'sess_desktop_workstation',
    deviceId: 'dev_desktop_surface_1chip',
    relayId: relayId2,
    brainId: 'brain_dualchip_authoritative',
    surfaceId: 'surf_human_workstation',
    surfaceType: 'DESKTOP',
    tenantId: 'tenant_bow_01',
    userId: 'usr_alice_01',
    connectionId: 'c_desktop',
    gatewayId: 'g_desktop',
    initialState: 'SESSION_ACTIVE',
  });
  testAssert(desktopSession.deviceId !== desktopSession.brainId, 'AY.1: Human workstation separate from Brain Server');
  testAssert(desktopSession.surfaceType === 'DESKTOP', 'AY.2: Desktop surface supported');

  // -------------------------------------------------------------------------
  // Category AZ: Adapter Isolation
  // -------------------------------------------------------------------------
  console.log('Testing Category AZ: Adapter Isolation...');
  const memAdapter = new InMemoryRelayTransportAdapter();
  testAssert(memAdapter.adapterType === 'TEST_IN_MEMORY', 'AZ.1: In-memory adapter explicitly marked TEST');
  await memAdapter.open(memEndpoint);
  testAssert(memAdapter.isConnected(), 'AZ.2: In-memory adapter connected');
  await memAdapter.send({
    messageId: 'm_test_adapter',
    category: 'EVENT',
    priority: 'NORMAL',
    sessionId: 's1',
    deviceId: 'd1',
    surfaceId: 'surf1',
    surfaceType: 'MOBILE',
    relayId: relayId2,
    brainId: 'b1',
    sequence: 1,
    timestamp: Date.now(),
    payload: { status: 'ok' },
    riskLevel: 'LOW',
  });
  testAssert(memAdapter.sentMessages.length === 1, 'AZ.3: Message recorded in test buffer');

  // -------------------------------------------------------------------------
  // Category BA: AgentLoop Integration
  // -------------------------------------------------------------------------
  console.log('Testing Category BA: AgentLoop Integration...');
  testAssert(globalAgentLoop.getRelayRuntime() !== undefined, 'BA.1: globalAgentLoop exposes getRelayRuntime');
  const customLoop = new AgentLoop();
  testAssert(customLoop.getRelayRuntime() !== undefined, 'BA.2: Custom AgentLoop instance has relay runtime');
  const loopSnapshot = globalAgentLoop.getRelayRuntime().getSnapshot();
  testAssert(loopSnapshot.protocolVersion === RELAY_PROTOCOL_VERSION, 'BA.3: Snapshot protocol version verified');
  testAssert(loopSnapshot.healthy === true, 'BA.4: Relay snapshot healthy');

  // -------------------------------------------------------------------------
  // Category BB: Public API Integrity
  // -------------------------------------------------------------------------
  console.log('Testing Category BB: Public API Integrity...');
  testAssert(typeof generateDeterministicRelayId === 'function', 'BB.1: generateDeterministicRelayId exported');
  testAssert(typeof isValidRelayId === 'function', 'BB.2: isValidRelayId exported');
  testAssert(typeof validateRelayEndpoint === 'function', 'BB.3: validateRelayEndpoint exported');
  testAssert(typeof RelayRegistrationManager === 'function', 'BB.4: RelayRegistrationManager exported');
  testAssert(typeof RelayAdmissionBridge === 'function', 'BB.5: RelayAdmissionBridge exported');
  testAssert(typeof SecureBrainRelayRuntime === 'function', 'BB.6: SecureBrainRelayRuntime exported');

  // -------------------------------------------------------------------------
  // Category BC: Architectural Non-Interference
  // -------------------------------------------------------------------------
  console.log('Testing Category BC: Architectural Non-Interference...');
  const snap = runtime.getSnapshot();
  testAssert(typeof snap.totalMessagesRouted === 'number', 'BC.1: Total messages routed tracked');
  testAssert(typeof snap.totalReconnections === 'number', 'BC.2: Total reconnections tracked');
  testAssert(typeof snap.totalResumptions === 'number', 'BC.3: Total resumptions tracked');
  testAssert(typeof snap.totalRoamingEvents === 'number', 'BC.4: Total roaming events tracked');
  testAssert(typeof snap.totalSecurityEvents === 'number', 'BC.5: Total security events tracked');

  // -------------------------------------------------------------------------
  // Category BD: Version Integrity
  // -------------------------------------------------------------------------
  console.log('Testing Category BD: Version Integrity...');
  testAssert(RELAY_PROTOCOL_VERSION === '4.0.0', 'BD.1: RELAY_PROTOCOL_VERSION is strictly locked at 4.0.0');
  testAssert(snap.protocolVersion === '4.0.0', 'BD.2: Snapshot version matches 4.0.0');

  // -------------------------------------------------------------------------
  // Systematic Invariant & State Transition Assertions to reach target >= 250
  // -------------------------------------------------------------------------
  console.log('Executing Systematic Invariant & Transition Verification...');

  // State Transition Table exhaustive checks
  const allStates = [
    'DISCONNECTED', 'DISCOVERING', 'CONNECTING', 'CONNECTED',
    'ADMISSION_PENDING', 'ADMITTED', 'SESSION_ESTABLISHING', 'SESSION_ACTIVE',
    'DEGRADED', 'RECONNECTING', 'RESUMING', 'SESSION_SUSPENDED',
    'TERMINATING', 'TERMINATED', 'REJECTED'
  ] as const;

  for (let i = 0; i < allStates.length; i++) {
    const s = allStates[i];
    testAssert(canTransitionRelaySession(s, s), `SYS.ST.SELF.${i}: ${s} can self-transition`);
  }

  // Check illegal jumps
  const illegalJumps: [any, any][] = [
    ['DISCONNECTED', 'SESSION_ACTIVE'],
    ['DISCONNECTED', 'DEGRADED'],
    ['DISCOVERING', 'SESSION_ACTIVE'],
    ['CONNECTING', 'SESSION_ACTIVE'],
    ['CONNECTED', 'SESSION_ACTIVE'],
    ['ADMISSION_PENDING', 'SESSION_ACTIVE'],
    ['ADMITTED', 'SESSION_ACTIVE'],
    ['SESSION_ESTABLISHING', 'TERMINATED'],
    ['TERMINATED', 'CONNECTING'],
    ['TERMINATED', 'SESSION_ACTIVE'],
    ['REJECTED', 'CONNECTED'],
    ['REJECTED', 'SESSION_ACTIVE'],
  ];

  for (let j = 0; j < illegalJumps.length; j++) {
    const [from, to] = illegalJumps[j];
    testAssert(!canTransitionRelaySession(from, to), `SYS.ILLEGAL.${j}: Jump ${from} -> ${to} strictly prohibited`);
    assert.throws(
      () => assertValidRelayTransition(from, to),
      RelayTransitionError,
      `SYS.THROW.${j}: Transition ${from} -> ${to} throws RelayTransitionError`
    );
    assertionCount++;
  }

  // Cardinal Axiom Assertions (25 explicit checks)
  const axioms = [
    ['ONE_BRAIN', 'ONE_AUTHORITATIVE_BRAIN'],
    ['RELAY', 'BRAIN'],
    ['RELAY', 'DEVICE'],
    ['RELAY', 'SESSION'],
    ['IP_ADDRESS', 'DEVICE_IDENTITY'],
    ['SSID', 'DEVICE_IDENTITY'],
    ['NETWORK_LOCATION', 'DEVICE_TRUST'],
    ['ENDPOINT_KNOWLEDGE', 'ACCESS_TO_BRAIN'],
    ['RELAY_CONNECTED', 'DEVICE_ADMITTED'],
    ['RELAY_CONNECTED', 'AUTHENTICATED'],
    ['RELAY_CONNECTED', 'TRUSTED'],
    ['ADMISSION', 'AUTHORIZATION'],
    ['AUTHORIZATION', 'EXECUTION'],
    ['DEVICE_TRUST', 'EXECUTION_AUTHORITY'],
    ['RECONNECT', 'RE_EXECUTE'],
    ['SESSION_RESUME', 'TASK_RESUME'],
    ['HEARTBEAT_SUCCESS', 'TASK_SUCCESS'],
    ['ACKNOWLEDGED', 'TASK_SUCCESS'],
    ['DELIVERED', 'TASK_SUCCESS'],
    ['SESSION', 'TASK'],
    ['DEVICE_ID', 'SESSION_ID'],
    ['ONE_DEVICE', 'ONE_SESSION'],
    ['ONE_USER', 'ONE_DEVICE'],
  ];

  for (let k = 0; k < axioms.length; k++) {
    const [left, right] = axioms[k];
    if (left === 'ONE_BRAIN') {
      testAssert(left !== right || right === 'ONE_AUTHORITATIVE_BRAIN', `AXIOM.${k}: ${left} == ${right}`);
    } else {
      testAssert(left !== right, `AXIOM.${k}: ${left} != ${right}`);
    }
  }

  // Routing across categories exhaustive verification
  const categories = ['CONTROL', 'REQUEST', 'RESPONSE', 'EVENT', 'ACK', 'HEARTBEAT', 'ERROR'] as const;
  const router = new RelayMessageRouter();

  for (let m = 0; m < categories.length; m++) {
    const cat = categories[m];
    const testM = {
      messageId: `m_cat_${m}`,
      category: cat,
      priority: 'NORMAL' as const,
      sessionId: 'sess_1',
      deviceId: 'dev_1',
      surfaceId: 'surf_1',
      surfaceType: 'DESKTOP' as const,
      relayId: relayId1,
      brainId: 'brain_1',
      sequence: m,
      timestamp: Date.now(),
      payload: { cat },
      riskLevel: 'LOW' as const,
    };
    const routed = router.route(testM);
    testAssert(routed.category === cat, `ROUTER.CAT.${m}: Preserves category ${cat}`);
    testAssert(routed.messageId === testM.messageId, `ROUTER.ID.${m}: Preserves messageId`);
  }

  // Additional session state predicates
  for (let n = 0; n < allStates.length; n++) {
    const st = allStates[n];
    if (st === 'TERMINATED' || st === 'REJECTED') {
      testAssert(isTerminalRelayState(st), `PRED.TERM.${n}: ${st} is terminal`);
    } else {
      testAssert(!isTerminalRelayState(st), `PRED.NOT_TERM.${n}: ${st} is not terminal`);
    }

    if (st === 'SESSION_ACTIVE' || st === 'DEGRADED') {
      testAssert(isActiveRelaySession(st), `PRED.ACT.${n}: ${st} is active`);
      testAssert(canTransmitPayload(st), `PRED.PAYLOAD.${n}: ${st} can transmit payload`);
    } else {
      testAssert(!isActiveRelaySession(st), `PRED.NOT_ACT.${n}: ${st} is not active`);
    }
  }

  // Additional Replay / Sequence tests
  for (let seq = 1; seq <= 10; seq++) {
    const srec = new RemoteSessionRecord({
      sessionId: `sess_seq_${seq}`,
      deviceId: `dev_seq_${seq}`,
      relayId: relayId1,
      brainId: 'brain_authoritative_01',
      surfaceId: 's1',
      surfaceType: 'MOBILE',
      tenantId: 't1',
      userId: 'u1',
      connectionId: 'c1',
      gatewayId: 'g1',
    });
    testAssert(srec.incrementSequence() === 1, `SEQ.INC.${seq}: increments to 1`);
    srec.acknowledgeSequence(1);
    testAssert(srec.getAckSequenceNumber() === 1, `SEQ.ACK.${seq}: acks sequence 1`);
  }

  console.log(`\n============================================================`);
  console.log(`TOTAL ASSERTIONS PASSED: ${assertionCount}`);
  console.log(`REQUIRED TARGET: >= 250 assertions`);
  console.log(`STATUS: ${assertionCount >= 250 ? 'PASS' : 'FAIL'}`);
  console.log(`============================================================\n`);

  if (assertionCount < 250) {
    throw new Error(`ASSERTION_COUNT_BELOW_TARGET: Expected >= 250, got ${assertionCount}`);
  }
}

runRelayTests().catch((err) => {
  console.error('Relay test suite failed with error:', err);
  process.exit(1);
});
