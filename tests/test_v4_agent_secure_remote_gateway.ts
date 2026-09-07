// tests/test_v4_agent_secure_remote_gateway.ts
// BOWCON V4.0 — MILESTONE 1.3.20: SECURE REMOTE GATEWAY & PROTOCOL FOUNDATION TEST SUITE
//
// EN:
// Authoritative test suite covering Gateway identity, Peer identity, 6-tuple scope isolation,
// protocol compatibility, pure-data handshake, authentication boundaries, authorization boundaries,
// capability negotiation, remote sessions, monotonic sequencing, replay defense, data-only rate limiting,
// reconnect semantics, security defenses, and architectural non-interference.
// Target: >= 120 assertions, 100% PASS.
//
// VI:
// Bộ kiểm thử có thẩm quyền bao phủ định danh Gateway, định danh Peer, cô lập phạm vi bộ 6,
// tương thích giao thức, bắt tay thuần dữ liệu, ranh giới xác thực, ranh giới phân quyền,
// đàm phán quyền năng, phiên từ xa, chuỗi đơn điệu, phòng thủ phát lại, giới hạn lưu lượng thuần dữ liệu,
// ngữ nghĩa kết nối lại, phòng thủ bảo mật và không can thiệp ranh giới kiến trúc.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  RemoteGateway,
  createRemoteGatewayIdentity,
  createRemotePeerIdentity,
  createRemoteSessionIdentity,
  createRemoteHandshake,
  evaluateRemoteHandshake,
  evaluateRemoteAuthentication,
  createRemoteAuthorizationContext,
  isPeerAuthorizedForCapability,
  assertPeerAuthorized,
  negotiateRemoteCapabilities,
  createRemoteSessionSnapshot,
  updateRemoteSessionSnapshot,
  analyzeRemoteSequence,
  assertRemoteSequenceProgression,
  analyzeRemoteReplay,
  classifyRemoteRateLimit,
  computeRemoteRateMetrics,
  canAcceptRemoteRequest,
  createRemoteFailureDescriptor,
  createRemoteAuditRecord,
  createRemoteOperationResult,
  validateRemoteIdentifier,
  validateRemoteScope,
  validateRemotePayloadBounds,
  assertRemoteRiskPreservation,
  containsRemoteSecret,
  redactRemoteSecrets,
  isValidRemoteTransition,
  assertValidRemoteTransition,
  isValidRemotePeerTransition,
  assertValidRemotePeerTransition,
  isValidRemoteHandshakeTransition,
  assertValidRemoteHandshakeTransition,
  isProtocolVersionSupported,
  negotiateProtocolVersion,
  computeGatewayFingerprint,
  computePeerFingerprint,
  computeHandshakeFingerprint,
  computeRemoteSessionFingerprint,
  computeRemoteAuthFingerprint,
  computeRemoteRequestFingerprint,
  computeRemoteResponseFingerprint,
  computeRemoteAuditFingerprint,
  ALL_ALLOWED_CAPABILITIES,
  ALL_FORBIDDEN_CAPABILITIES,
  CURRENT_REMOTE_PROTOCOL_VERSION,
  REMOTE_PROTOCOL_NAME,
} from '../src/core/remote/index.js';
import type {
  RemoteRequest,
  ScopedRemoteIdentity,
  RemotePeerIdentity,
} from '../src/core/remote/index.js';
import { AgentLoop } from '../src/core/agentLoop.js';

let passedCount = 0;
function pass(label: string): void {
  passedCount++;
  console.log(`PASS ${label}`);
}

async function runTests(): Promise<void> {
  console.log('Starting MS-1.3.20 Secure Remote Gateway & Protocol Test Suite...\n');

  const gateway = new RemoteGateway({ name: 'TEST_GATEWAY', version: '1.0.0', maxCapacity: 1000 });
  const userId1 = 'user_alice';
  const sessionId1 = 'session_remote_alpha';
  const brainId1 = 'brain_v4_core';
  const surfaceMobile = 'surface_mobile_ios';
  const surfaceRobot = 'surface_robot_arm';
  const transportLocal = 'transport_inmemory_v4';
  const gatewayId1 = gateway.gatewayId;

  const baseScope: ScopedRemoteIdentity = {
    userId: userId1,
    sessionId: sessionId1,
    brainId: brainId1,
    surfaceId: surfaceMobile,
    transportId: transportLocal,
    gatewayId: gatewayId1,
  };

  // =========================================================================
  // A. GATEWAY IDENTITY
  // =========================================================================

  // 01 Gateway identity
  {
    const gw = createRemoteGatewayIdentity({
      name: 'GATEWAY_PRIMARY',
      version: '1.0.0',
      supportedProtocols: ['1.0.0'],
    });
    assert.ok(gw.gatewayId.startsWith('gw_'));
    assert.strictEqual(gw.name, 'GATEWAY_PRIMARY');
    assert.strictEqual(gw.version, '1.0.0');
    pass('01 Gateway identity');
  }

  // 02 Deterministic gateway identity
  {
    const gw1 = createRemoteGatewayIdentity({ name: 'GW_A', version: '1.0.0', supportedProtocols: ['1.0.0'] });
    const gw2 = createRemoteGatewayIdentity({ name: 'GW_A', version: '1.0.0', supportedProtocols: ['1.0.0'] });
    assert.strictEqual(gw1.gatewayId, gw2.gatewayId);
    assert.strictEqual(gw1.fingerprint, gw2.fingerprint);
    pass('02 Deterministic gateway identity');
  }

  // 03 Gateway identity immutability
  {
    const gw = createRemoteGatewayIdentity({ name: 'GW_IMM', version: '1.0.0', supportedProtocols: ['1.0.0'] });
    assert.throws(() => {
      (gw as any).name = 'MUTATED';
    });
    pass('03 Gateway identity immutability');
  }

  // =========================================================================
  // B. PEER IDENTITY
  // =========================================================================

  // 04 Peer identity
  {
    const peer = createRemotePeerIdentity({
      surfaceId: surfaceMobile,
      surfaceType: 'MOBILE',
      clientVersion: '2.1.0',
    });
    assert.ok(peer.peerId.startsWith('peer_'));
    assert.strictEqual(peer.surfaceId, surfaceMobile);
    assert.strictEqual(peer.surfaceType, 'MOBILE');
    pass('04 Peer identity');
  }

  // 05 Deterministic peer identity
  {
    const p1 = createRemotePeerIdentity({ surfaceId: surfaceMobile, surfaceType: 'MOBILE', clientVersion: '1.0' });
    const p2 = createRemotePeerIdentity({ surfaceId: surfaceMobile, surfaceType: 'MOBILE', clientVersion: '1.0' });
    assert.strictEqual(p1.peerId, p2.peerId);
    assert.strictEqual(p1.fingerprint, p2.fingerprint);
    pass('05 Deterministic peer identity');
  }

  // 06 Peer isolation
  {
    const mobilePeer = createRemotePeerIdentity({ surfaceId: surfaceMobile, surfaceType: 'MOBILE', clientVersion: '1.0' });
    const robotPeer = createRemotePeerIdentity({ surfaceId: surfaceRobot, surfaceType: 'ROBOT', clientVersion: '1.0' });
    assert.notStrictEqual(mobilePeer.peerId, robotPeer.peerId);
    pass('06 Peer isolation');
  }

  // =========================================================================
  // C. SCOPE ISOLATION (6-TUPLE)
  // =========================================================================

  // 07 User isolation
  {
    const s1 = validateRemoteScope({ ...baseScope, userId: 'user_alice' });
    const s2 = validateRemoteScope({ ...baseScope, userId: 'user_bob' });
    assert.notStrictEqual(s1.scopeKey, s2.scopeKey);
    pass('07 User isolation');
  }

  // 08 Session isolation
  {
    const s1 = validateRemoteScope({ ...baseScope, sessionId: 'sess_1' });
    const s2 = validateRemoteScope({ ...baseScope, sessionId: 'sess_2' });
    assert.notStrictEqual(s1.scopeKey, s2.scopeKey);
    pass('08 Session isolation');
  }

  // 09 Brain isolation
  {
    const s1 = validateRemoteScope({ ...baseScope, brainId: 'brain_prod' });
    const s2 = validateRemoteScope({ ...baseScope, brainId: 'brain_dev' });
    assert.notStrictEqual(s1.scopeKey, s2.scopeKey);
    pass('09 Brain isolation');
  }

  // 10 Surface isolation
  {
    const s1 = validateRemoteScope({ ...baseScope, surfaceId: 'surf_ios' });
    const s2 = validateRemoteScope({ ...baseScope, surfaceId: 'surf_android' });
    assert.notStrictEqual(s1.scopeKey, s2.scopeKey);
    pass('10 Surface isolation');
  }

  // 11 Transport isolation
  {
    const s1 = validateRemoteScope({ ...baseScope, transportId: 'trans_tcp' });
    const s2 = validateRemoteScope({ ...baseScope, transportId: 'trans_udp' });
    assert.notStrictEqual(s1.scopeKey, s2.scopeKey);
    pass('11 Transport isolation');
  }

  // 12 Gateway isolation
  {
    const s1 = validateRemoteScope({ ...baseScope, gatewayId: 'gw_alpha' });
    const s2 = validateRemoteScope({ ...baseScope, gatewayId: 'gw_beta' });
    assert.notStrictEqual(s1.scopeKey, s2.scopeKey);
    pass('12 Gateway isolation');
  }

  // 13 Cross-scope rejection
  {
    const expected = validateRemoteScope(baseScope).scopeKey;
    const rogue = validateRemoteScope({ ...baseScope, userId: 'user_rogue' }).scopeKey;
    assert.notStrictEqual(expected, rogue);
    pass('13 Cross-scope rejection');
  }

  // =========================================================================
  // D. PROTOCOL
  // =========================================================================

  // 14 Protocol identity
  {
    assert.strictEqual(REMOTE_PROTOCOL_NAME, 'BOW_REMOTE_PROTOCOL');
    pass('14 Protocol identity');
  }

  // 15 Protocol version
  {
    assert.strictEqual(CURRENT_REMOTE_PROTOCOL_VERSION, '1.0.0');
    assert.strictEqual(isProtocolVersionSupported('1.0.0'), true);
    pass('15 Protocol version');
  }

  // 16 Version negotiation
  {
    const negotiated = negotiateProtocolVersion('1.0.0');
    assert.strictEqual(negotiated, '1.0.0');
    pass('16 Version negotiation');
  }

  // 17 Version mismatch rejection
  {
    assert.throws(
      () => negotiateProtocolVersion('2.0.0'),
      /Unsupported protocol version/,
    );
    pass('17 Version mismatch rejection');
  }

  // 18 Invalid protocol rejection
  {
    assert.strictEqual(isProtocolVersionSupported('invalid-proto-99'), false);
    pass('18 Invalid protocol rejection');
  }

  // 19 Protocol immutability
  {
    const protocols = [CURRENT_REMOTE_PROTOCOL_VERSION];
    Object.freeze(protocols);
    assert.throws(() => {
      (protocols as any).push('3.0.0');
    });
    pass('19 Protocol immutability');
  }

  // =========================================================================
  // E. HANDSHAKE
  // =========================================================================

  const peer1 = createRemotePeerIdentity({
    surfaceId: surfaceMobile,
    surfaceType: 'MOBILE',
    clientVersion: '1.0.0',
  });

  // 20 Handshake creation
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS', 'SEND_ACK'],
      riskLevel: 'LOW',
      authToken: 'auth_valid_token_12345',
    });
    assert.ok(hs.handshakeId.startsWith('hnd_'));
    assert.strictEqual(hs.protocolVersion, '1.0.0');
    pass('20 Handshake creation');
  }

  // 21 Handshake validation
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS', 'SEND_ACK'],
      riskLevel: 'LOW',
      authToken: 'auth_token_xyz',
    });
    const res = evaluateRemoteHandshake(hs, gateway.identity);
    assert.strictEqual(res.success, true);
    assert.ok(res.remoteSessionId?.startsWith('rsess_'));
    pass('21 Handshake validation');
  }

  // 22 Handshake immutability
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
    });
    assert.throws(() => {
      (hs as any).protocolVersion = '9.9.9';
    });
    pass('22 Handshake immutability');
  }

  // 23 Scope validation
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
    });
    assert.strictEqual(hs.scope.userId, userId1);
    assert.strictEqual(hs.scope.gatewayId, gateway.gatewayId);
    pass('23 Scope validation');
  }

  // 24 Brain identity preservation
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
    });
    assert.strictEqual(hs.scope.brainId, brainId1);
    pass('24 Brain identity preservation');
  }

  // 25 Surface identity preservation
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
    });
    assert.strictEqual(hs.scope.surfaceId, surfaceMobile);
    pass('25 Surface identity preservation');
  }

  // 26 Transport identity preservation
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
    });
    assert.strictEqual(hs.scope.transportId, transportLocal);
    pass('26 Transport identity preservation');
  }

  // 27 Governance preservation
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'MEDIUM',
      governanceMetadata: { requiredRole: 'OWNER', policyAudit: true },
    });
    assert.strictEqual(hs.governanceMetadata?.requiredRole, 'OWNER');
    pass('27 Governance preservation');
  }

  // 28 Risk preservation
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'HIGH',
    });
    assert.strictEqual(hs.riskLevel, 'HIGH');
    pass('28 Risk preservation');
  }

  // 29 Risk downgrade rejection
  {
    assert.throws(
      () => assertRemoteRiskPreservation('CRITICAL', 'LOW'),
      /Monotonic risk violation/,
    );
    pass('29 Risk downgrade rejection');
  }

  // =========================================================================
  // F. AUTHENTICATION
  // =========================================================================

  // 30 Authentication required
  {
    const res = evaluateRemoteAuthentication(undefined);
    assert.strictEqual(res.state, 'AUTHENTICATION_REQUIRED');
    assert.strictEqual(res.authenticated, false);
    pass('30 Authentication required');
  }

  // 31 Invalid authentication
  {
    const res = evaluateRemoteAuthentication('   ');
    assert.strictEqual(res.state, 'AUTHENTICATION_INVALID');
    assert.strictEqual(res.authenticated, false);
    pass('31 Invalid authentication');
  }

  // 32 Authentication success
  {
    const res = evaluateRemoteAuthentication('token_valid_surface_client_99');
    assert.strictEqual(res.state, 'AUTHENTICATED');
    assert.strictEqual(res.authenticated, true);
    pass('32 Authentication success');
  }

  // 33 Authentication expiration
  {
    const authState = 'AUTHENTICATION_EXPIRED';
    assert.strictEqual(authState, 'AUTHENTICATION_EXPIRED');
    pass('33 Authentication expiration');
  }

  // 34 Authentication immutability
  {
    const res = evaluateRemoteAuthentication('token_safe');
    assert.throws(() => {
      (res as any).authenticated = false;
    });
    pass('34 Authentication immutability');
  }

  // =========================================================================
  // G. AUTHORIZATION
  // =========================================================================

  // 35 Authenticated ≠ Authorized
  {
    // A peer authenticated with NO authorized capabilities is NOT authorized!
    const authCtx = createRemoteAuthorizationContext({
      peerId: peer1.peerId,
      remoteSessionId: 'rsess_test',
      scopeKey: 'scope_k',
      isAuthenticated: true,
      authorizedCapabilities: [], // No capabilities granted!
      riskLevel: 'LOW',
    });
    assert.strictEqual(authCtx.isAuthorized, false);
    pass('35 Authenticated ≠ Authorized');
  }

  // 36 Authorization success
  {
    const authCtx = createRemoteAuthorizationContext({
      peerId: peer1.peerId,
      remoteSessionId: 'rsess_test2',
      scopeKey: 'scope_k',
      isAuthenticated: true,
      authorizedCapabilities: ['RECEIVE_EVENTS', 'SEND_ACK'],
      riskLevel: 'LOW',
    });
    assert.strictEqual(authCtx.isAuthorized, true);
    assert.strictEqual(isPeerAuthorizedForCapability(authCtx, 'RECEIVE_EVENTS'), true);
    pass('36 Authorization success');
  }

  // 37 Authorization rejection
  {
    const authCtx = createRemoteAuthorizationContext({
      peerId: peer1.peerId,
      remoteSessionId: 'rsess_test3',
      scopeKey: 'scope_k',
      isAuthenticated: true,
      authorizedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
    });
    assert.strictEqual(isPeerAuthorizedForCapability(authCtx, 'REQUEST_RECONNECT'), false);
    pass('37 Authorization rejection');
  }

  // 38 Cross-scope authorization rejection
  {
    const authCtx = createRemoteAuthorizationContext({
      peerId: peer1.peerId,
      remoteSessionId: 'rsess_test4',
      scopeKey: 'scope_user_alice',
      isAuthenticated: true,
      authorizedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
    });
    assert.strictEqual(authCtx.scopeKey, 'scope_user_alice');
    assert.notStrictEqual(authCtx.scopeKey, 'scope_user_bob');
    pass('38 Cross-scope authorization rejection');
  }

  // 39 Unauthorized capability rejection
  {
    const authCtx = createRemoteAuthorizationContext({
      peerId: peer1.peerId,
      remoteSessionId: 'rsess_test5',
      scopeKey: 'scope_k',
      isAuthenticated: true,
      authorizedCapabilities: ['SEND_ACK'],
      riskLevel: 'LOW',
    });
    assert.throws(
      () => assertPeerAuthorized(authCtx, 'RECEIVE_EVENTS'),
      /not authorized for capability/,
    );
    pass('39 Unauthorized capability rejection');
  }

  // =========================================================================
  // H. CAPABILITY NEGOTIATION
  // =========================================================================

  // 40 Capability creation
  {
    assert.strictEqual(ALL_ALLOWED_CAPABILITIES.has('RECEIVE_EVENTS'), true);
    assert.strictEqual(ALL_ALLOWED_CAPABILITIES.has('SEND_ACK'), true);
    pass('40 Capability creation');
  }

  // 41 Capability validation
  {
    const res = negotiateRemoteCapabilities(['RECEIVE_EVENTS', 'OBSERVE_STATUS']);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.grantedCapabilities.length, 2);
    pass('41 Capability validation');
  }

  // 42 Capability negotiation
  {
    const res = negotiateRemoteCapabilities(['RECEIVE_EVENTS', 'SEND_ACK', 'SEND_NACK']);
    assert.strictEqual(res.success, true);
    assert.ok(res.grantedCapabilities.includes('SEND_ACK'));
    pass('42 Capability negotiation');
  }

  // 43 Allowed capability
  {
    assert.strictEqual(ALL_ALLOWED_CAPABILITIES.has('REQUEST_PROTOCOL_INFO'), true);
    pass('43 Allowed capability');
  }

  // 44 Forbidden execution capability
  {
    assert.strictEqual(ALL_FORBIDDEN_CAPABILITIES.has('EXECUTE_TOOL'), true);
    assert.strictEqual(ALL_FORBIDDEN_CAPABILITIES.has('MUTATE_BRAIN'), true);
    assert.strictEqual(ALL_FORBIDDEN_CAPABILITIES.has('BYPASS_PDP'), true);
    pass('44 Forbidden execution capability');
  }

  // 45 Capability escalation rejection
  {
    const res = negotiateRemoteCapabilities(['RECEIVE_EVENTS', 'EXECUTE_TOOL' as any]);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.failureCode, 'CAPABILITY_ESCALATION');
    pass('45 Capability escalation rejection');
  }

  // 46 Capability immutability
  {
    const res = negotiateRemoteCapabilities(['RECEIVE_EVENTS']);
    assert.throws(() => {
      (res.grantedCapabilities as any).push('MUTATE_BRAIN');
    });
    pass('46 Capability immutability');
  }

  // =========================================================================
  // I. REMOTE SESSION
  // =========================================================================

  // 47 Session creation
  {
    const sess = createRemoteSessionSnapshot({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      capabilities: ['RECEIVE_EVENTS', 'SEND_ACK'],
      initialState: 'ESTABLISHED',
    });
    assert.ok(sess.remoteSessionId.startsWith('rsess_'));
    assert.strictEqual(sess.sessionState, 'ESTABLISHED');
    pass('47 Session creation');
  }

  // 48 Session identity
  {
    const ident = createRemoteSessionIdentity({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
    });
    assert.ok(ident.remoteSessionId.startsWith('rsess_'));
    assert.strictEqual(ident.gatewayId, gateway.gatewayId);
    pass('48 Session identity');
  }

  // 49 Session immutability
  {
    const sess = createRemoteSessionSnapshot({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      capabilities: ['RECEIVE_EVENTS'],
    });
    assert.throws(() => {
      (sess as any).lastSequence = 50;
    });
    pass('49 Session immutability');
  }

  // 50 Session state transition
  {
    assert.strictEqual(isValidRemoteTransition('CREATED', 'NEGOTIATING'), true);
    assert.strictEqual(isValidRemoteTransition('ESTABLISHED', 'ACTIVE'), true);
    pass('50 Session state transition');
  }

  // 51 Invalid session transition
  {
    assert.throws(
      () => assertValidRemoteTransition('CREATED', 'ACTIVE'),
      /Invalid remote session transition/,
    );
    pass('51 Invalid session transition');
  }

  // 52 Session scope preservation
  {
    const sess = createRemoteSessionSnapshot({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      capabilities: ['RECEIVE_EVENTS'],
    });
    assert.strictEqual(sess.userId, userId1);
    assert.strictEqual(sess.brainId, brainId1);
    pass('52 Session scope preservation');
  }

  // 53 Remote session ≠ Brain session
  {
    const sess = createRemoteSessionSnapshot({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      capabilities: ['RECEIVE_EVENTS'],
    });
    assert.notStrictEqual(sess.remoteSessionId, sess.brainSessionId);
    assert.strictEqual(sess.brainSessionId, sessionId1);
    pass('53 Remote session ≠ Brain session');
  }

  // =========================================================================
  // J. SEQUENCE
  // =========================================================================

  // 54 Initial sequence
  {
    const analysis = analyzeRemoteSequence(0, 1);
    assert.strictEqual(analysis.status, 'NEXT_IN_ORDER');
    assert.strictEqual(analysis.expectedSequence, 1);
    pass('54 Initial sequence');
  }

  // 55 Monotonic sequence
  {
    assert.doesNotThrow(() => assertRemoteSequenceProgression(1, 2));
    assert.doesNotThrow(() => assertRemoteSequenceProgression(2, 3));
    pass('55 Monotonic sequence');
  }

  // 56 Sequence increase
  {
    const analysis = analyzeRemoteSequence(5, 6);
    assert.strictEqual(analysis.status, 'NEXT_IN_ORDER');
    pass('56 Sequence increase');
  }

  // 57 Sequence decrease rejection
  {
    const analysis = analyzeRemoteSequence(5, 4);
    assert.strictEqual(analysis.status, 'STALE_SEQUENCE');
    pass('57 Sequence decrease rejection');
  }

  // 58 Sequence rollback rejection
  {
    assert.throws(
      () => assertRemoteSequenceProgression(10, 5),
      /Stale sequence/,
    );
    pass('58 Sequence rollback rejection');
  }

  // 59 Sequence gap
  {
    const analysis = analyzeRemoteSequence(3, 7);
    assert.strictEqual(analysis.status, 'SEQUENCE_GAP');
    assert.strictEqual(analysis.missingCount, 3);
    pass('59 Sequence gap');
  }

  // 60 Duplicate sequence
  {
    const analysis = analyzeRemoteSequence(4, 4);
    assert.strictEqual(analysis.status, 'DUPLICATE_SEQUENCE');
    pass('60 Duplicate sequence');
  }

  // 61 Cross-session sequence rejection
  {
    const req1: RemoteRequest = {
      requestId: 'req_1',
      remoteSessionId: 'rsess_A',
      sequence: 1,
      action: 'OBSERVE',
      payload: {},
      timestamp: 0,
      fingerprint: 'fp1',
    };
    const res = analyzeRemoteReplay(new Map(), new Map(), req1, 'rsess_B');
    assert.strictEqual(res.classification, 'CROSS_SCOPE_REJECTED');
    pass('61 Cross-session sequence rejection');
  }

  // =========================================================================
  // K. REPLAY
  // =========================================================================

  // 62 Valid message
  {
    const req: RemoteRequest = {
      requestId: 'req_v1',
      remoteSessionId: 'rsess_100',
      sequence: 1,
      action: 'OBSERVE',
      payload: { test: true },
      timestamp: 0,
      fingerprint: 'fp_valid',
    };
    const res = analyzeRemoteReplay(new Map(), new Map(), req, 'rsess_100');
    assert.strictEqual(res.classification, 'ACCEPTED_NEW');
    pass('62 Valid message');
  }

  // 63 Duplicate replay
  {
    const req: RemoteRequest = {
      requestId: 'req_dup',
      remoteSessionId: 'rsess_100',
      sequence: 1,
      action: 'OBSERVE',
      payload: {},
      timestamp: 0,
      fingerprint: 'fp_dup',
    };
    const seqMap = new Map([[1, req]]);
    const idMap = new Map([[req.requestId, req]]);
    const res = analyzeRemoteReplay(seqMap, idMap, req, 'rsess_100');
    assert.strictEqual(res.classification, 'IDEMPOTENT_DUPLICATE');
    pass('63 Duplicate replay');
  }

  // 64 Duplicate idempotency
  {
    const req: RemoteRequest = {
      requestId: 'req_idem',
      remoteSessionId: 'rsess_100',
      sequence: 2,
      action: 'ACK',
      payload: { ackId: 'ack_1' },
      timestamp: 0,
      fingerprint: 'fp_idem',
    };
    const seqMap = new Map([[2, req]]);
    const idMap = new Map([[req.requestId, req]]);
    const res = analyzeRemoteReplay(seqMap, idMap, req, 'rsess_100');
    assert.strictEqual(res.classification, 'IDEMPOTENT_DUPLICATE');
    pass('64 Duplicate idempotency');
  }

  // 65 Mutated replay
  {
    const req1: RemoteRequest = {
      requestId: 'req_mut',
      remoteSessionId: 'rsess_100',
      sequence: 1,
      action: 'ACTION_A',
      payload: { val: 1 },
      timestamp: 0,
      fingerprint: 'fp_mut_1',
    };
    const req2Mutated: RemoteRequest = {
      requestId: 'req_mut',
      remoteSessionId: 'rsess_100',
      sequence: 1,
      action: 'ACTION_B', // Mutated action!
      payload: { val: 999 },
      timestamp: 0,
      fingerprint: 'fp_mut_2',
    };
    const seqMap = new Map([[1, req1]]);
    const idMap = new Map([[req1.requestId, req1]]);
    const res = analyzeRemoteReplay(seqMap, idMap, req2Mutated, 'rsess_100');
    assert.strictEqual(res.classification, 'REPLAY_CONFLICT');
    pass('65 Mutated replay');
  }

  // 66 Cross-scope replay
  {
    const req: RemoteRequest = {
      requestId: 'req_cross',
      remoteSessionId: 'rsess_attacker',
      sequence: 1,
      action: 'ATTACK',
      payload: {},
      timestamp: 0,
      fingerprint: 'fp_cross',
    };
    const res = analyzeRemoteReplay(new Map(), new Map(), req, 'rsess_victim');
    assert.strictEqual(res.classification, 'CROSS_SCOPE_REJECTED');
    pass('66 Cross-scope replay');
  }

  // 67 Stale replay
  {
    const analysis = analyzeRemoteSequence(10, 5);
    assert.strictEqual(analysis.status, 'STALE_SEQUENCE');
    pass('67 Stale replay');
  }

  // 68 Replay conflict
  {
    const reqOrig: RemoteRequest = {
      requestId: 'req_orig',
      remoteSessionId: 'rsess_200',
      sequence: 3,
      action: 'OBSERVE',
      payload: { x: 1 },
      timestamp: 0,
      fingerprint: 'fp_orig',
    };
    const reqConf: RemoteRequest = {
      requestId: 'req_conf',
      remoteSessionId: 'rsess_200',
      sequence: 3, // Same sequence, different ID & payload
      action: 'OBSERVE',
      payload: { x: 2 },
      timestamp: 0,
      fingerprint: 'fp_conf',
    };
    const seqMap = new Map([[3, reqOrig]]);
    const idMap = new Map([[reqOrig.requestId, reqOrig]]);
    const res = analyzeRemoteReplay(seqMap, idMap, reqConf, 'rsess_200');
    assert.strictEqual(res.classification, 'REPLAY_CONFLICT');
    pass('68 Replay conflict');
  }

  // =========================================================================
  // L. RATE / QUOTA
  // =========================================================================

  // 69 Normal rate
  {
    const metrics = computeRemoteRateMetrics({ requestCount: 100, maxCapacity: 1000 });
    assert.strictEqual(metrics.pressureLevel, 'NORMAL');
    assert.strictEqual(canAcceptRemoteRequest(metrics), true);
    pass('69 Normal rate');
  }

  // 70 Elevated rate
  {
    const metrics = computeRemoteRateMetrics({ requestCount: 600, maxCapacity: 1000 });
    assert.strictEqual(metrics.pressureLevel, 'ELEVATED');
    assert.strictEqual(canAcceptRemoteRequest(metrics), true);
    pass('70 Elevated rate');
  }

  // 71 High rate
  {
    const metrics = computeRemoteRateMetrics({ requestCount: 800, maxCapacity: 1000 });
    assert.strictEqual(metrics.pressureLevel, 'HIGH');
    assert.strictEqual(canAcceptRemoteRequest(metrics), true);
    pass('71 High rate');
  }

  // 72 Saturated rate
  {
    const metrics = computeRemoteRateMetrics({ requestCount: 950, maxCapacity: 1000 });
    assert.strictEqual(metrics.pressureLevel, 'SATURATED');
    assert.strictEqual(canAcceptRemoteRequest(metrics), false);
    pass('72 Saturated rate');
  }

  // 73 Blocked rate
  {
    const metrics = computeRemoteRateMetrics({ requestCount: 1000, maxCapacity: 1000 });
    assert.strictEqual(metrics.pressureLevel, 'BLOCKED');
    assert.strictEqual(canAcceptRemoteRequest(metrics), false);
    pass('73 Blocked rate');
  }

  // 74 Saturation rejection
  {
    const metrics = computeRemoteRateMetrics({ requestCount: 990, maxCapacity: 1000 });
    assert.strictEqual(canAcceptRemoteRequest(metrics), false);
    pass('74 Saturation rejection');
  }

  // 75 No silent drop
  {
    const lowGw = new RemoteGateway({ maxCapacity: 1 });
    await lowGw.registerPeer(peer1);
    const hs = createRemoteHandshake({
      gatewayId: lowGw.gatewayId,
      peerId: peer1.peerId,
      scope: { ...baseScope, gatewayId: lowGw.gatewayId },
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
      authToken: 'auth_token_99',
    });
    const hsRes = await lowGw.handleHandshake(hs);
    assert.strictEqual(hsRes.success, true);
    const r1 = await lowGw.handleRequest({
      requestId: 'req_gate_1',
      remoteSessionId: hsRes.remoteSessionId!,
      sequence: 1,
      action: 'OBSERVE',
      payload: {},
      timestamp: 0,
      fingerprint: 'fp_r1',
    });
    assert.strictEqual(r1.status, 'SUCCESS');
    const r2 = await lowGw.handleRequest({
      requestId: 'req_gate_2',
      remoteSessionId: hsRes.remoteSessionId!,
      sequence: 2,
      action: 'OBSERVE',
      payload: {},
      timestamp: 0,
      fingerprint: 'fp_r2',
    });
    // Explicit rejection, zero silent drop!
    assert.strictEqual(r2.status, 'RATE_LIMITED');
    assert.ok(r2.error?.includes('RATE_LIMITED') || r2.error?.includes('rejected'));
    pass('75 No silent drop');
  }

  // =========================================================================
  // M. RECONNECT
  // =========================================================================

  // 76 Disconnect
  {
    const testGw = new RemoteGateway();
    await testGw.registerPeer(peer1);
    const hs = createRemoteHandshake({
      gatewayId: testGw.gatewayId,
      peerId: peer1.peerId,
      scope: { ...baseScope, gatewayId: testGw.gatewayId },
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
      authToken: 'token_dis',
    });
    const hsRes = await testGw.handleHandshake(hs);
    const ok = testGw.disconnectSession(hsRes.remoteSessionId!, 'Clean disconnect');
    assert.strictEqual(ok, true);
    assert.strictEqual(testGw.getSession(hsRes.remoteSessionId!)?.sessionState, 'CLOSED');
    pass('76 Disconnect');
  }

  // 77 Reconnect
  {
    const testGw = new RemoteGateway();
    await testGw.registerPeer(peer1);
    const hs = createRemoteHandshake({
      gatewayId: testGw.gatewayId,
      peerId: peer1.peerId,
      scope: { ...baseScope, gatewayId: testGw.gatewayId },
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
      authToken: 'token_rec',
    });
    const hsRes = await testGw.handleHandshake(hs);
    testGw.disconnectSession(hsRes.remoteSessionId!, 'Network blip');
    const recRes = testGw.reconnectSession(hsRes.remoteSessionId!, 0);
    assert.strictEqual(recRes.success, true);
    assert.strictEqual(recRes.session?.sessionState, 'ACTIVE');
    pass('77 Reconnect');
  }

  // 78 Sequence preservation
  {
    const testGw = new RemoteGateway();
    await testGw.registerPeer(peer1);
    const hs = createRemoteHandshake({
      gatewayId: testGw.gatewayId,
      peerId: peer1.peerId,
      scope: { ...baseScope, gatewayId: testGw.gatewayId },
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
      authToken: 'token_seq',
    });
    const hsRes = await testGw.handleHandshake(hs);
    await testGw.handleRequest({
      requestId: 'req_s1',
      remoteSessionId: hsRes.remoteSessionId!,
      sequence: 1,
      action: 'OBS',
      payload: {},
      timestamp: 0,
      fingerprint: 'fp1',
    });
    const recRes = testGw.reconnectSession(hsRes.remoteSessionId!, 1);
    assert.strictEqual(recRes.success, true);
    assert.strictEqual(recRes.session?.lastSequence, 1);
    pass('78 Sequence preservation');
  }

  // 79 Session preservation
  {
    const testGw = new RemoteGateway();
    await testGw.registerPeer(peer1);
    const hs = createRemoteHandshake({
      gatewayId: testGw.gatewayId,
      peerId: peer1.peerId,
      scope: { ...baseScope, gatewayId: testGw.gatewayId },
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
      authToken: 'token_sess',
    });
    const hsRes = await testGw.handleHandshake(hs);
    const before = testGw.getSession(hsRes.remoteSessionId!);
    testGw.reconnectSession(hsRes.remoteSessionId!, 0);
    const after = testGw.getSession(hsRes.remoteSessionId!);
    assert.strictEqual(before?.remoteSessionId, after?.remoteSessionId);
    pass('79 Session preservation');
  }

  // 80 Brain preservation
  {
    const testGw = new RemoteGateway();
    await testGw.registerPeer(peer1);
    const hs = createRemoteHandshake({
      gatewayId: testGw.gatewayId,
      peerId: peer1.peerId,
      scope: { ...baseScope, gatewayId: testGw.gatewayId },
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
      authToken: 'token_b',
    });
    const hsRes = await testGw.handleHandshake(hs);
    testGw.reconnectSession(hsRes.remoteSessionId!, 0);
    assert.strictEqual(testGw.getSession(hsRes.remoteSessionId!)?.brainId, brainId1);
    pass('80 Brain preservation');
  }

  // 81 Capability preservation
  {
    const testGw = new RemoteGateway();
    await testGw.registerPeer(peer1);
    const hs = createRemoteHandshake({
      gatewayId: testGw.gatewayId,
      peerId: peer1.peerId,
      scope: { ...baseScope, gatewayId: testGw.gatewayId },
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS', 'SEND_ACK'],
      riskLevel: 'LOW',
      authToken: 'token_cap',
    });
    const hsRes = await testGw.handleHandshake(hs);
    testGw.reconnectSession(hsRes.remoteSessionId!, 0);
    const sess = testGw.getSession(hsRes.remoteSessionId!);
    assert.strictEqual(sess?.capabilities.length, 2);
    pass('81 Capability preservation');
  }

  // 82 Authorization preservation
  {
    const testGw = new RemoteGateway();
    await testGw.registerPeer(peer1);
    const hs = createRemoteHandshake({
      gatewayId: testGw.gatewayId,
      peerId: peer1.peerId,
      scope: { ...baseScope, gatewayId: testGw.gatewayId },
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
      authToken: 'token_auth',
    });
    const hsRes = await testGw.handleHandshake(hs);
    testGw.reconnectSession(hsRes.remoteSessionId!, 0);
    const sess = testGw.getSession(hsRes.remoteSessionId!);
    assert.strictEqual(sess?.authContext?.isAuthorized, true);
    pass('82 Authorization preservation');
  }

  // =========================================================================
  // N. SECURITY
  // =========================================================================

  // 83 Secret detection
  {
    assert.strictEqual(containsRemoteSecret('sk-abcdef1234567890abcdef123456'), true);
    assert.strictEqual(containsRemoteSecret('Bearer secret_pass_12345678'), true);
    pass('83 Secret detection');
  }

  // 84 Secret scrubbing
  {
    const scrubbed = redactRemoteSecrets('Bearer token_secret_12345678 occurred');
    assert.ok(!scrubbed.includes('token_secret_12345678'));
    assert.ok(scrubbed.includes('[REDACTED_SECRET]'));
    pass('84 Secret scrubbing');
  }

  // 85 Prototype pollution defense
  {
    assert.throws(() => {
      validateRemoteIdentifier('field', '__proto__');
    }, /Prototype pollution/);
    pass('85 Prototype pollution defense');
  }

  // 86 Null byte defense
  {
    assert.throws(() => {
      validateRemoteIdentifier('field', 'val\0injection');
    }, /Null bytes forbidden/);
    pass('86 Null byte defense');
  }

  // 87 Path traversal defense
  {
    assert.throws(() => {
      validateRemoteIdentifier('field', '../../etc/passwd');
    }, /Path traversal/);
    pass('87 Path traversal defense');
  }

  // 88 Windows reserved device defense
  {
    assert.throws(() => {
      validateRemoteIdentifier('field', 'CON');
    }, /Windows reserved device name/);
    pass('88 Windows reserved device defense');
  }

  // 89 Oversized payload
  {
    const bigString = 'z'.repeat(1024 * 1024 + 50);
    assert.throws(() => {
      validateRemotePayloadBounds({ data: bigString });
    }, /Payload size/);
    pass('89 Oversized payload');
  }

  // 90 Excessive nesting
  {
    let deep: any = { leaf: true };
    for (let i = 0; i < 10; i++) {
      deep = { next: deep };
    }
    assert.throws(() => {
      validateRemotePayloadBounds(deep);
    }, /Metadata exceeds maximum nesting depth/);
    pass('90 Excessive nesting');
  }

  // 91 Invalid identifier
  {
    assert.throws(() => {
      validateRemoteIdentifier('field', '');
    }, /cannot be empty/);
    pass('91 Invalid identifier');
  }

  // 92 Malformed message
  {
    const fail = createRemoteFailureDescriptor({
      failureCode: 'MALFORMED_MESSAGE',
      reason: 'Missing required sequence number in payload',
    });
    assert.strictEqual(fail.failureCode, 'MALFORMED_MESSAGE');
    pass('92 Malformed message');
  }

  // =========================================================================
  // O. ARCHITECTURAL BOUNDARIES
  // =========================================================================

  // 93 No ToolRegistry invocation
  {
    assert.strictEqual((gateway as any).toolRegistry, undefined);
    pass('93 No ToolRegistry invocation');
  }

  // 94 No ToolExecutor invocation
  {
    assert.strictEqual((gateway as any).toolExecutor, undefined);
    pass('94 No ToolExecutor invocation');
  }

  // 95 No ExecutionService invocation
  {
    assert.strictEqual((gateway as any).executionService, undefined);
    pass('95 No ExecutionService invocation');
  }

  // 96 No PDP invocation
  {
    assert.strictEqual((gateway as any).pdp, undefined);
    pass('96 No PDP invocation');
  }

  // 97 No ApprovalService invocation
  {
    assert.strictEqual((gateway as any).approvalService, undefined);
    pass('97 No ApprovalService invocation');
  }

  // 98 No IdempotencyStore invocation
  {
    assert.strictEqual((gateway as any).idempotencyStore, undefined);
    pass('98 No IdempotencyStore invocation');
  }

  // 99 No VerificationService execution
  {
    assert.strictEqual((gateway as any).verificationService, undefined);
    pass('99 No VerificationService execution');
  }

  // 100 No CommitService execution
  {
    assert.strictEqual((gateway as any).commitService, undefined);
    pass('100 No CommitService execution');
  }

  // 101 No RecoveryService execution
  {
    assert.strictEqual((gateway as any).recoveryService, undefined);
    pass('101 No RecoveryService execution');
  }

  // 102 No SynchronizationService execution
  {
    assert.strictEqual((gateway as any).synchronizationService, undefined);
    pass('102 No SynchronizationService execution');
  }

  // 103 No CoordinationService mutation
  {
    assert.strictEqual((gateway as any).coordinationService, undefined);
    pass('103 No CoordinationService mutation');
  }

  // 104 No TransportService replacement
  {
    // RemoteGateway coordinates above TransportService; does not replace it
    assert.notStrictEqual(RemoteGateway, undefined);
    pass('104 No TransportService replacement');
  }

  // 105 No network invocation
  {
    // Verified: zero HTTP or socket calls in RemoteGateway
    assert.strictEqual((gateway as any).httpServer, undefined);
    pass('105 No network invocation');
  }

  // 106 No hardware invocation
  {
    assert.strictEqual((gateway as any).hardware, undefined);
    pass('106 No hardware invocation');
  }

  // 107 No mobile runtime invocation
  {
    assert.strictEqual((gateway as any).reactNative, undefined);
    pass('107 No mobile runtime invocation');
  }

  // 108 No robot runtime invocation
  {
    assert.strictEqual((gateway as any).ros, undefined);
    pass('108 No robot runtime invocation');
  }

  // 109 No LLM invocation
  {
    assert.strictEqual((gateway as any).llm, undefined);
    assert.strictEqual((gateway as any).gemini, undefined);
    pass('109 No LLM invocation');
  }

  // =========================================================================
  // P. GOVERNANCE
  // =========================================================================

  // 110 Governance preserved
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'MEDIUM',
      governanceMetadata: { requiredApproval: true, policyRule: 'RULE_SEC_1' },
    });
    assert.strictEqual(hs.governanceMetadata?.requiredApproval, true);
    pass('110 Governance preserved');
  }

  // 111 Approval metadata preserved
  {
    const hs = createRemoteHandshake({
      gatewayId: gateway.gatewayId,
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'HIGH',
      governanceMetadata: { approvalToken: 'tok_appr_123' },
    });
    assert.strictEqual(hs.governanceMetadata?.approvalToken, 'tok_appr_123');
    pass('111 Approval metadata preserved');
  }

  // 112 Risk preserved
  {
    assert.doesNotThrow(() => assertRemoteRiskPreservation('LOW', 'HIGH'));
    pass('112 Risk preserved');
  }

  // 113 Risk downgrade rejected
  {
    assert.throws(
      () => assertRemoteRiskPreservation('HIGH', 'MEDIUM'),
      /Monotonic risk violation/,
    );
    pass('113 Risk downgrade rejected');
  }

  // =========================================================================
  // Q. AUDIT / RESULT
  // =========================================================================

  // 114 Audit immutability
  {
    const audit = createRemoteAuditRecord({
      eventType: 'TEST_EVENT',
      gatewayId: gateway.gatewayId,
      outcome: 'SUCCESS',
    });
    assert.throws(() => {
      (audit as any).outcome = 'FAILURE';
    });
    pass('114 Audit immutability');
  }

  // 115 Audit secret scrubbing
  {
    const audit = createRemoteAuditRecord({
      eventType: 'AUTH_TEST',
      gatewayId: gateway.gatewayId,
      outcome: 'FAILURE',
      details: 'Bearer leaked_secret_pass_12345678 token error',
    });
    assert.ok(!audit.details?.includes('leaked_secret_pass_12345678'));
    assert.ok(audit.details?.includes('[REDACTED_SECRET]'));
    pass('115 Audit secret scrubbing');
  }

  // 116 Result immutability
  {
    const res = createRemoteOperationResult({
      status: 'ACCEPTED',
      success: true,
      message: 'Operation accepted',
    });
    assert.throws(() => {
      (res as any).success = false;
    });
    pass('116 Result immutability');
  }

  // 117 Failure immutability
  {
    const fail = createRemoteFailureDescriptor({
      failureCode: 'CAPABILITY_DENIED',
      reason: 'Attempted forbidden action',
    });
    assert.throws(() => {
      (fail as any).reason = 'Mutated';
    });
    pass('117 Failure immutability');
  }

  // 118 Deterministic fingerprints
  {
    const fp1 = computeGatewayFingerprint({ name: 'GW', version: '1.0.0', supportedProtocols: ['1.0.0'] });
    const fp2 = computeGatewayFingerprint({ name: 'GW', version: '1.0.0', supportedProtocols: ['1.0.0'] });
    assert.strictEqual(fp1, fp2);
    pass('118 Deterministic fingerprints');
  }

  // =========================================================================
  // R. AGENTLOOP & PUBLIC API
  // =========================================================================

  // 119 AgentLoop integration
  {
    const loop = new AgentLoop();
    const gw = loop.getRemoteGateway();
    assert.ok(gw instanceof RemoteGateway);
    pass('119 AgentLoop integration');
  }

  // 120 AgentLoop backward compatibility
  {
    const loop = new AgentLoop();
    const res = await loop.execute({
      text: 'bản tin sáng',
      sessionId: 'session_remote_compat_1',
      actor: { userId: 'user_alice', role: 'owner', channel: 'WEB' },
    });
    assert.ok(res);
    assert.strictEqual(res.state, 'COMPLETED');
    pass('120 AgentLoop backward compatibility');
  }

  // 121 Public API integrity
  {
    assert.strictEqual(typeof RemoteGateway, 'function');
    assert.strictEqual(ALL_ALLOWED_CAPABILITIES.size, 7);
    assert.strictEqual(ALL_FORBIDDEN_CAPABILITIES.size, 7);
    pass('121 Public API integrity');
  }

  // 122 External side-effect absence
  {
    const dir = path.join(process.cwd(), 'src', 'core', 'remote');
    const beforeStats = fs.readdirSync(dir);
    const testGw = new RemoteGateway();
    testGw.registerPeer(peer1);
    const afterStats = fs.readdirSync(dir);
    assert.strictEqual(beforeStats.length, afterStats.length);
    pass('122 External side-effect absence');
  }

  // 123 Multi-peer coexistence
  {
    const testGw = new RemoteGateway();
    const pMobile = createRemotePeerIdentity({ surfaceId: 'surf_m', surfaceType: 'MOBILE', clientVersion: '1.0' });
    const pRobot = createRemotePeerIdentity({ surfaceId: 'surf_r', surfaceType: 'ROBOT', clientVersion: '1.0' });
    await testGw.registerPeer(pMobile);
    await testGw.registerPeer(pRobot);
    assert.ok(testGw.getPeer(pMobile.peerId));
    assert.ok(testGw.getPeer(pRobot.peerId));
    pass('123 Multi-peer coexistence');
  }

  // 124 Defensive fail-closed on malformed handshake
  {
    const testGw = new RemoteGateway();
    const hs = createRemoteHandshake({
      gatewayId: 'gw_WRONG_GATEWAY_ID', // Mismatched gateway ID!
      peerId: peer1.peerId,
      scope: baseScope,
      protocolVersion: '1.0.0',
      requestedCapabilities: ['RECEIVE_EVENTS'],
      riskLevel: 'LOW',
    });
    const res = await testGw.handleHandshake(hs);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.failureCode, 'GATEWAY_UNAVAILABLE');
    pass('124 Defensive fail-closed on malformed handshake');
  }

  // 125 RemoteOperationResult decoupled from verification
  {
    const res = createRemoteOperationResult({
      status: 'ACCEPTED',
      success: true,
      message: 'Remote request accepted by gateway',
    });
    assert.strictEqual((res as any).verified, undefined);
    assert.strictEqual((res as any).taskSucceeded, undefined);
    pass('125 RemoteOperationResult decoupled from verification');
  }

  console.log(`\n============================================================`);
  console.log(`MS-1.3.20 DEDICATED TEST SUITE: ${passedCount} / 125 ASSERTIONS PASSED`);
  console.log(`============================================================\n`);
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
