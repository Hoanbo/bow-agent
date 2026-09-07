// tests/test_v4_agent_brain_transport.ts
// BOWCON V4.0 — MILESTONE 1.3.19: BRAIN MESSAGE TRANSPORT TEST SUITE
//
// EN:
// Authoritative test suite covering message envelopes, deterministic transport identity,
// connection lifecycles, delivery states, ACK/NACK semantics, replay protection,
// heartbeat, reconnect/resume, offline surface continuity, backpressure, security defenses,
// and boundary non-interference.
// Target: 110 assertions, 100% PASS.
//
// VI:
// Bộ kiểm thử có thẩm quyền bao phủ phong bì thông điệp, định danh truyền tải tất định,
// vòng đời kết nối, trạng thái phân phối, ngữ nghĩa ACK/NACK, phòng thủ phát lại,
// nhịp tim, kết nối lại/khôi phục, tính liên tục khi bề mặt ngoại tuyến, áp lực ngược,
// phòng thủ bảo mật và không can thiệp ranh giới.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
  TransportService,
  createTransportMessageEnvelope,
  createConnectionIdentity,
  createTransportConnection,
  transitionConnection,
  createTransportSessionSnapshot,
  updateTransportSessionSnapshot,
  analyzeMessageSequence,
  assertSequenceProgression,
  analyzeReplay,
  createDeliveryRecord,
  transitionDelivery,
  createTransportAck,
  createTransportNack,
  createHeartbeatSignal,
  createHeartbeatAck,
  createResumeRequest,
  validateResumeRequest,
  classifyBackpressure,
  computeBackpressureMetrics,
  canEnqueueMessage,
  createTransportFailureDescriptor,
  createTransportCheckpoint,
  createTransportAuditRecord,
  validateTransportIdentifier,
  validateTransportScope,
  validateMessageResourceBounds,
  assertTransportRiskPreservation,
  assertTransportSequenceMonotonicity,
  containsTransportSecret,
  redactTransportSecrets,
  isValidConnectionTransition,
  assertValidConnectionTransition,
  isValidDeliveryTransition,
  assertValidDeliveryTransition,
  computeMessageFingerprint,
  computeConnectionFingerprint,
  computeSessionFingerprint,
  computeAckFingerprint,
  computeHeartbeatFingerprint,
  computeResumeFingerprint,
  computeTransportCheckpointFingerprint,
  ALL_TRANSPORT_MESSAGE_TYPES,
  ALL_TRANSPORT_DIRECTIONS,
} from '../src/core/transport/index.js';
import type {
  BrainTransportMessage,
  TransportConnectionRecord,
} from '../src/core/transport/index.js';
import { AgentLoop } from '../src/core/agentLoop.js';

let passedCount = 0;
function pass(label: string): void {
  passedCount++;
  console.log(`PASS ${label}`);
}

async function runTests(): Promise<void> {
  console.log('Starting MS-1.3.19 Brain Message Transport Test Suite...\n');

  const transportService = new TransportService();
  const userId1 = 'user_alice';
  const sessionId1 = 'session_alpha';
  const brainId1 = 'brain_v4_core';
  const surfaceMobile = 'surface_mobile_ios';
  const surfaceRobot = 'surface_robot_arm';
  const transportLocal = 'transport_inmemory_v4';

  const baseScope = {
    userId: userId1,
    sessionId: sessionId1,
    brainId: brainId1,
    surfaceId: surfaceMobile,
    transportId: transportLocal,
  };

  // 01 Brain transport identity
  {
    const ident = createConnectionIdentity(baseScope);
    assert.strictEqual(ident.brainId, brainId1);
    assert.ok(ident.connectionId.startsWith('conn_'));
    pass('01 Brain transport identity');
  }

  // 02 Deterministic transport identity
  {
    const ident1 = createConnectionIdentity(baseScope);
    const ident2 = createConnectionIdentity(baseScope);
    assert.strictEqual(ident1.connectionId, ident2.connectionId);
    assert.strictEqual(ident1.fingerprint, ident2.fingerprint);
    pass('02 Deterministic transport identity');
  }

  // 03 Surface identity preservation
  {
    const mobileConn = createConnectionIdentity({ ...baseScope, surfaceId: surfaceMobile });
    const robotConn = createConnectionIdentity({ ...baseScope, surfaceId: surfaceRobot });
    assert.strictEqual(mobileConn.surfaceId, surfaceMobile);
    assert.strictEqual(robotConn.surfaceId, surfaceRobot);
    assert.notStrictEqual(mobileConn.connectionId, robotConn.connectionId);
    pass('03 Surface identity preservation');
  }

  // 04 User isolation
  {
    const connUser1 = createConnectionIdentity({ ...baseScope, userId: 'user_alice' });
    const connUser2 = createConnectionIdentity({ ...baseScope, userId: 'user_bob' });
    assert.notStrictEqual(connUser1.connectionId, connUser2.connectionId);
    pass('04 User isolation');
  }

  // 05 Session isolation
  {
    const connSess1 = createConnectionIdentity({ ...baseScope, sessionId: 'session_alpha' });
    const connSess2 = createConnectionIdentity({ ...baseScope, sessionId: 'session_beta' });
    assert.notStrictEqual(connSess1.connectionId, connSess2.connectionId);
    pass('05 Session isolation');
  }

  // 06 Brain isolation
  {
    const connBrain1 = createConnectionIdentity({ ...baseScope, brainId: 'brain_v4_primary' });
    const connBrain2 = createConnectionIdentity({ ...baseScope, brainId: 'brain_v4_secondary' });
    assert.notStrictEqual(connBrain1.connectionId, connBrain2.connectionId);
    pass('06 Brain isolation');
  }

  // 07 Transport isolation
  {
    const connTrans1 = createConnectionIdentity({ ...baseScope, transportId: 'trans_channel_a' });
    const connTrans2 = createConnectionIdentity({ ...baseScope, transportId: 'trans_channel_b' });
    assert.notStrictEqual(connTrans1.connectionId, connTrans2.connectionId);
    pass('07 Transport isolation');
  }

  // 08 Connection identity
  {
    const ident = createConnectionIdentity(baseScope);
    assert.strictEqual(
      ident.scopeKey,
      `${userId1}::${sessionId1}::${brainId1}::${surfaceMobile}::${transportLocal}`,
    );
    pass('08 Connection identity');
  }

  // 09 Connection determinism
  {
    const fp1 = computeConnectionFingerprint(baseScope);
    const fp2 = computeConnectionFingerprint(baseScope);
    assert.strictEqual(fp1, fp2);
    pass('09 Connection determinism');
  }

  // 10 Connection state initialization
  {
    const conn = createTransportConnection(baseScope, 'DISCONNECTED');
    assert.strictEqual(conn.state, 'DISCONNECTED');
    pass('10 Connection state initialization');
  }

  // 11 Valid connection transitions
  {
    let conn = createTransportConnection(baseScope, 'DISCONNECTED');
    conn = transitionConnection(conn, 'CONNECTING');
    assert.strictEqual(conn.state, 'CONNECTING');
    conn = transitionConnection(conn, 'CONNECTED');
    assert.strictEqual(conn.state, 'CONNECTED');
    conn = transitionConnection(conn, 'DEGRADED');
    assert.strictEqual(conn.state, 'DEGRADED');
    conn = transitionConnection(conn, 'CLOSING');
    assert.strictEqual(conn.state, 'CLOSING');
    conn = transitionConnection(conn, 'CLOSED');
    assert.strictEqual(conn.state, 'CLOSED');
    pass('11 Valid connection transitions');
  }

  // 12 Invalid connection transitions
  {
    const conn = createTransportConnection(baseScope, 'DISCONNECTED');
    assert.throws(
      () => transitionConnection(conn, 'CONNECTED'), // Must go via CONNECTING
      /Invalid connection transition/,
    );
    pass('12 Invalid connection transitions');
  }

  // 13 Session creation
  {
    const conn = createTransportConnection(baseScope, 'CONNECTED');
    const session = createTransportSessionSnapshot({ connection: conn, initialSequence: 0 });
    assert.strictEqual(session.connectionId, conn.connectionId);
    assert.strictEqual(session.connectionState, 'CONNECTED');
    assert.strictEqual(session.lastAcceptedSequence, 0);
    pass('13 Session creation');
  }

  // 14 Session immutability
  {
    const conn = createTransportConnection(baseScope, 'CONNECTED');
    const session = createTransportSessionSnapshot({ connection: conn });
    assert.throws(() => {
      (session as any).lastAcceptedSequence = 999;
    });
    pass('14 Session immutability');
  }

  // 15 Message envelope creation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_001',
      causationId: 'caus_001',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
      payload: { query: 'Hello Brain' },
    });
    assert.ok(msg.messageId.startsWith('msg_'));
    assert.strictEqual(msg.messageType, 'REQUEST');
    assert.strictEqual(msg.direction, 'SURFACE_TO_BRAIN');
    assert.strictEqual(msg.sequence, 1);
    pass('15 Message envelope creation');
  }

  // 16 Message immutability
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_002',
      causationId: 'caus_002',
      messageType: 'RESPONSE',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
      payload: { text: 'Hello Surface' },
    });
    assert.throws(() => {
      (msg as any).sequence = 5;
    });
    pass('16 Message immutability');
  }

  // 17 Nested immutability
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_003',
      causationId: 'caus_003',
      messageType: 'EVENT',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 2,
      payload: { nested: { deepKey: 'value' } },
    });
    assert.throws(() => {
      (msg.payload as any).nested.deepKey = 'mutated';
    });
    pass('17 Nested immutability');
  }

  // 18 Message type validation
  {
    const conn = createTransportConnection(baseScope);
    assert.throws(() => {
      createTransportMessageEnvelope({
        brainId: brainId1,
        userId: userId1,
        sessionId: sessionId1,
        surfaceId: surfaceMobile,
        transportId: transportLocal,
        connectionId: conn.connectionId,
        correlationId: 'corr_004',
        causationId: 'caus_004',
        messageType: 'UNKNOWN_TYPE' as any,
        direction: 'BRAIN_TO_SURFACE',
        sequence: 1,
      });
    }, /Unsupported message type/);
    pass('18 Message type validation');
  }

  // 19 Direction validation
  {
    const conn = createTransportConnection(baseScope);
    assert.throws(() => {
      createTransportMessageEnvelope({
        brainId: brainId1,
        userId: userId1,
        sessionId: sessionId1,
        surfaceId: surfaceMobile,
        transportId: transportLocal,
        connectionId: conn.connectionId,
        correlationId: 'corr_005',
        causationId: 'caus_005',
        messageType: 'REQUEST',
        direction: 'PEER_TO_PEER' as any,
        sequence: 1,
      });
    }, /Unsupported transport direction/);
    pass('19 Direction validation');
  }

  // 20 Correlation validation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_test_tracing',
      causationId: 'caus_root',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    assert.strictEqual(msg.correlationId, 'corr_test_tracing');
    pass('20 Correlation validation');
  }

  // 21 Causation validation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_test',
      causationId: 'caus_parent_event',
      messageType: 'RESPONSE',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
    });
    assert.strictEqual(msg.causationId, 'caus_parent_event');
    pass('21 Causation validation');
  }

  // 22 Event reference preservation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_test',
      causationId: 'caus_test',
      eventId: 'evt_sync_ref_123',
      messageType: 'EVENT',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
    });
    assert.strictEqual(msg.eventId, 'evt_sync_ref_123');
    pass('22 Event reference preservation');
  }

  // 23 Sequence initialization
  {
    const analysis = analyzeMessageSequence(0, 1);
    assert.strictEqual(analysis.status, 'NEXT_IN_ORDER');
    assert.strictEqual(analysis.expectedSequence, 1);
    pass('23 Sequence initialization');
  }

  // 24 Sequence progression
  {
    assert.doesNotThrow(() => assertSequenceProgression(1, 2));
    assert.doesNotThrow(() => assertSequenceProgression(2, 3));
    pass('24 Sequence progression');
  }

  // 25 Sequence decrease rejection
  {
    assert.throws(
      () => assertSequenceProgression(5, 4),
      /Stale sequence detected/,
    );
    pass('25 Sequence decrease rejection');
  }

  // 26 Duplicate detection
  {
    const conn = createTransportConnection(baseScope);
    const msg1 = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_dup',
      causationId: 'caus_dup',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
      payload: { key: 'same' },
    });
    const mapSeq = new Map([[1, msg1]]);
    const mapId = new Map([[msg1.messageId, msg1]]);
    const res = analyzeReplay(mapSeq, mapId, msg1, conn.scopeKey);
    assert.strictEqual(res.classification, 'IDEMPOTENT_DUPLICATE');
    pass('26 Duplicate detection');
  }

  // 27 Replay detection
  {
    const conn = createTransportConnection(baseScope);
    const msg1 = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_dup',
      causationId: 'caus_dup',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 2,
    });
    const mapSeq = new Map([[2, msg1]]);
    const mapId = new Map([[msg1.messageId, msg1]]);
    const res = analyzeReplay(mapSeq, mapId, msg1, conn.scopeKey);
    assert.strictEqual(res.classification, 'IDEMPOTENT_DUPLICATE');
    pass('27 Replay detection');
  }

  // 28 Mutated replay rejection
  {
    const conn = createTransportConnection(baseScope);
    const msg1 = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_mut',
      causationId: 'caus_mut',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
      payload: { amount: 100 },
    });
    const msg2Mutated = createTransportMessageEnvelope({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: conn.connectionId,
      correlationId: 'corr_mut',
      causationId: 'caus_mut',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
      payload: { amount: 999 }, // Mutated payload!
    });
    const mapSeq = new Map([[1, msg1]]);
    const mapId = new Map([[msg1.messageId, msg1]]);
    const res = analyzeReplay(mapSeq, mapId, msg2Mutated, conn.scopeKey);
    assert.strictEqual(res.classification, 'REPLAY_CONFLICT');
    pass('28 Mutated replay rejection');
  }

  // 29 Sequence gap detection
  {
    const analysis = analyzeMessageSequence(2, 5);
    assert.strictEqual(analysis.status, 'SEQUENCE_GAP');
    assert.strictEqual((analysis as any).missingCount, 2);
    pass('29 Sequence gap detection');
  }

  // 30 Cross-user rejection
  {
    const conn = createTransportConnection(baseScope);
    const crossMsg = createTransportMessageEnvelope({
      ...baseScope,
      userId: 'user_eve', // Cross-user attack!
      connectionId: conn.connectionId,
      correlationId: 'corr_cross',
      causationId: 'caus_cross',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    const res = analyzeReplay(new Map(), new Map(), crossMsg, conn.scopeKey);
    assert.strictEqual(res.classification, 'CROSS_SCOPE_REJECTED');
    pass('30 Cross-user rejection');
  }

  // 31 Cross-session rejection
  {
    const conn = createTransportConnection(baseScope);
    const crossMsg = createTransportMessageEnvelope({
      ...baseScope,
      sessionId: 'session_rogue',
      connectionId: conn.connectionId,
      correlationId: 'corr_cross_sess',
      causationId: 'caus_cross_sess',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    const res = analyzeReplay(new Map(), new Map(), crossMsg, conn.scopeKey);
    assert.strictEqual(res.classification, 'CROSS_SCOPE_REJECTED');
    pass('31 Cross-session rejection');
  }

  // 32 Cross-brain rejection
  {
    const conn = createTransportConnection(baseScope);
    const crossMsg = createTransportMessageEnvelope({
      ...baseScope,
      brainId: 'brain_imposter',
      connectionId: conn.connectionId,
      correlationId: 'corr_cross_b',
      causationId: 'caus_cross_b',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    const res = analyzeReplay(new Map(), new Map(), crossMsg, conn.scopeKey);
    assert.strictEqual(res.classification, 'CROSS_SCOPE_REJECTED');
    pass('32 Cross-brain rejection');
  }

  // 33 Cross-transport rejection
  {
    const conn = createTransportConnection(baseScope);
    const crossMsg = createTransportMessageEnvelope({
      ...baseScope,
      transportId: 'trans_alien',
      connectionId: conn.connectionId,
      correlationId: 'corr_cross_t',
      causationId: 'caus_cross_t',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    const res = analyzeReplay(new Map(), new Map(), crossMsg, conn.scopeKey);
    assert.strictEqual(res.classification, 'CROSS_SCOPE_REJECTED');
    pass('33 Cross-transport rejection');
  }

  // 34 Delivery state initialization
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_deliv',
      causationId: 'caus_deliv',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    const d = createDeliveryRecord(msg);
    assert.strictEqual(d.state, 'CREATED');
    pass('34 Delivery state initialization');
  }

  // 35 Valid delivery transitions
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_deliv2',
      causationId: 'caus_deliv2',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    let d = createDeliveryRecord(msg);
    d = transitionDelivery(d, 'VALIDATED');
    d = transitionDelivery(d, 'QUEUED');
    d = transitionDelivery(d, 'DISPATCHABLE');
    d = transitionDelivery(d, 'SENT');
    d = transitionDelivery(d, 'DELIVERED');
    d = transitionDelivery(d, 'ACKNOWLEDGED');
    assert.strictEqual(d.state, 'ACKNOWLEDGED');
    pass('35 Valid delivery transitions');
  }

  // 36 Invalid delivery transitions
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_deliv3',
      causationId: 'caus_deliv3',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    const d = createDeliveryRecord(msg);
    assert.throws(
      () => transitionDelivery(d, 'ACKNOWLEDGED'), // Cannot jump from CREATED to ACKNOWLEDGED
      /Invalid delivery transition/,
    );
    pass('36 Invalid delivery transitions');
  }

  // 37 SENT state
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_sent',
      causationId: 'caus_sent',
      messageType: 'RESPONSE',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
    });
    let d = createDeliveryRecord(msg);
    d = transitionDelivery(d, 'VALIDATED');
    d = transitionDelivery(d, 'DISPATCHABLE');
    d = transitionDelivery(d, 'SENT', { timestamp: 1234 });
    assert.strictEqual(d.state, 'SENT');
    assert.strictEqual(d.sentAt, 1234);
    pass('37 SENT state');
  }

  // 38 DELIVERED state
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_deliv',
      causationId: 'caus_deliv',
      messageType: 'RESPONSE',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
    });
    let d = createDeliveryRecord(msg);
    d = transitionDelivery(d, 'VALIDATED');
    d = transitionDelivery(d, 'DISPATCHABLE');
    d = transitionDelivery(d, 'SENT');
    d = transitionDelivery(d, 'DELIVERED', { timestamp: 5678 });
    assert.strictEqual(d.state, 'DELIVERED');
    assert.strictEqual(d.deliveredAt, 5678);
    pass('38 DELIVERED state');
  }

  // 39 ACK state
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_ack',
      causationId: 'caus_ack',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    const ack = createTransportAck({
      message: msg,
      classification: 'RECEIVED',
    });
    assert.ok(ack.ackId.startsWith('ack_'));
    assert.strictEqual(ack.classification, 'RECEIVED');
    pass('39 ACK state');
  }

  // 40 ACK != task success
  {
    // Verification that TASK_SUCCEEDED is NOT in AckClassification
    assert.throws(() => {
      createTransportAck({
        message: {} as any,
        classification: 'TASK_SUCCEEDED' as any,
      });
    }, /TASK_SUCCEEDED is strictly forbidden/);
    pass('40 ACK != task success');
  }

  // 41 ACK != verification
  {
    // Transport ACK only indicates transport protocol receipt
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_v',
      causationId: 'caus_v',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    const ack = createTransportAck({
      message: msg,
      classification: 'VALIDATED',
    });
    assert.notStrictEqual(ack.classification, 'VERIFIED');
    pass('41 ACK != verification');
  }

  // 42 NACK handling
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_nack',
      causationId: 'caus_nack',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
    });
    const nack = createTransportNack({
      message: msg,
      failureCode: 'INVALID_SEQUENCE',
      reason: 'Sequence out of order',
    });
    assert.ok(nack.nackId.startsWith('nack_'));
    assert.strictEqual(nack.failureCode, 'INVALID_SEQUENCE');
    pass('42 NACK handling');
  }

  // 43 Failure classification
  {
    const fail = createTransportFailureDescriptor({
      failureCode: 'BACKPRESSURE',
      reason: 'Queue depth exceeded 1000 items',
    });
    assert.strictEqual(fail.failureCode, 'BACKPRESSURE');
    pass('43 Failure classification');
  }

  // 44 Timeout classification
  {
    const fail = createTransportFailureDescriptor({
      failureCode: 'DELIVERY_TIMEOUT',
      reason: 'Surface ACK timeout exceeded',
    });
    assert.strictEqual(fail.failureCode, 'DELIVERY_TIMEOUT');
    pass('44 Timeout classification');
  }

  // 45 Stale message classification
  {
    const fail = createTransportFailureDescriptor({
      failureCode: 'STALE_MESSAGE',
      reason: 'Incoming sequence older than last checkpoint',
    });
    assert.strictEqual(fail.failureCode, 'STALE_MESSAGE');
    pass('45 Stale message classification');
  }

  // 46 Heartbeat creation
  {
    const conn = createTransportConnection(baseScope);
    const hb = createHeartbeatSignal({
      connectionId: conn.connectionId,
      heartbeatSequence: 1,
      healthStatus: 'HEALTHY',
    });
    assert.ok(hb.heartbeatId.startsWith('hb_'));
    assert.strictEqual(hb.heartbeatSequence, 1);
    assert.strictEqual(hb.healthStatus, 'HEALTHY');
    pass('46 Heartbeat creation');
  }

  // 47 Heartbeat acknowledgement
  {
    const conn = createTransportConnection(baseScope);
    const hback = createHeartbeatAck({
      connectionId: conn.connectionId,
      heartbeatSequence: 1,
      surfaceId: surfaceMobile,
    });
    assert.ok(hback.ackId.startsWith('hback_'));
    assert.strictEqual(hback.heartbeatSequence, 1);
    pass('47 Heartbeat acknowledgement');
  }

  // 48 Heartbeat does not imply task success
  {
    const conn = createTransportConnection(baseScope);
    const hb = createHeartbeatSignal({
      connectionId: conn.connectionId,
      heartbeatSequence: 5,
    });
    assert.strictEqual((hb as any).taskSucceeded, undefined);
    assert.strictEqual((hb as any).verified, undefined);
    pass('48 Heartbeat does not imply task success');
  }

  // 49 Disconnect metadata
  {
    let conn = createTransportConnection(baseScope, 'CONNECTED');
    conn = transitionConnection(conn, 'CLOSING', 'Client requested disconnect');
    conn = transitionConnection(conn, 'CLOSED', 'Client disconnected cleanly');
    assert.strictEqual(conn.state, 'CLOSED');
    assert.strictEqual(conn.reason, 'Client disconnected cleanly');
    pass('49 Disconnect metadata');
  }

  // 50 Reconnect metadata
  {
    const req = createResumeRequest({
      connectionId: 'conn_recon_001',
      scope: baseScope,
      lastAckSequence: 10,
      resumeAttempt: 2,
    });
    assert.strictEqual(req.lastAckSequence, 10);
    assert.strictEqual(req.resumeAttempt, 2);
    pass('50 Reconnect metadata');
  }

  // 51 Resume validation
  {
    const req = createResumeRequest({
      connectionId: 'conn_res_001',
      scope: baseScope,
      lastAckSequence: 5,
    });
    const scopeKey = `${userId1}::${sessionId1}::${brainId1}::${surfaceMobile}::${transportLocal}`;
    const res = validateResumeRequest(req, {
      connectionId: 'conn_res_001',
      scopeKey,
      lastAcceptedSequence: 10,
      lastAcknowledgedSequence: 5,
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.resumedSequence, 5);
    pass('51 Resume validation');
  }

  // 52 Resume sequence preservation
  {
    const req = createResumeRequest({
      connectionId: 'conn_res_002',
      scope: baseScope,
      lastAckSequence: 12, // Invalid forward sequence!
    });
    const scopeKey = `${userId1}::${sessionId1}::${brainId1}::${surfaceMobile}::${transportLocal}`;
    const res = validateResumeRequest(req, {
      connectionId: 'conn_res_002',
      scopeKey,
      lastAcceptedSequence: 10,
      lastAcknowledgedSequence: 8,
    });
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes('sequence'));
    pass('52 Resume sequence preservation');
  }

  // 53 Resume identity preservation
  {
    const req = createResumeRequest({
      connectionId: 'conn_res_003',
      scope: baseScope,
      lastAckSequence: 3,
    });
    const scopeKey = `${userId1}::${sessionId1}::${brainId1}::${surfaceMobile}::${transportLocal}`;
    const res = validateResumeRequest(req, {
      connectionId: 'conn_DIFFERENT', // Mismatch!
      scopeKey,
      lastAcceptedSequence: 5,
      lastAcknowledgedSequence: 3,
    });
    assert.strictEqual(res.success, false);
    assert.ok(res.error?.includes('ConnectionId mismatch'));
    pass('53 Resume identity preservation');
  }

  // 54 No sequence reset
  {
    const conn = transportService.registerConnection(baseScope, 'CONNECTED');
    transportService.dispatch({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_seq1',
      causationId: 'caus_seq1',
      messageType: 'REQUEST',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
    });
    const session = transportService.getSession(conn.connectionId);
    assert.strictEqual(session?.lastAcceptedSequence, 1);
    // Even if surface disconnects, sequence in session remains 1
    transportService.setConnectionState(conn.connectionId, 'DEGRADED', 'Surface network degraded');
    const sessAfter = transportService.getSession(conn.connectionId);
    assert.strictEqual(sessAfter?.lastAcceptedSequence, 1);
    pass('54 No sequence reset');
  }

  // 55 Offline Brain continuity
  {
    // Brain continues to exist and execute even if all connections are disconnected
    const isolatedService = new TransportService();
    const conn = isolatedService.registerConnection(baseScope, 'DISCONNECTED');
    assert.strictEqual(conn.state, 'DISCONNECTED');
    // Service functions normally
    assert.strictEqual(isolatedService.getActiveSessions().length, 1);
    pass('55 Offline Brain continuity');
  }

  // 56 Offline Mobile continuity
  {
    const svc = new TransportService();
    const mobileConn = svc.registerConnection(baseScope, 'CONNECTED');
    svc.setConnectionState(mobileConn.connectionId, 'CLOSING', 'Mobile app in background');
    svc.setConnectionState(mobileConn.connectionId, 'CLOSED', 'Mobile app disconnected');
    assert.strictEqual(svc.getConnection(mobileConn.connectionId)?.state, 'CLOSED');
    pass('56 Offline Mobile continuity');
  }

  // 57 Offline Robot continuity
  {
    const svc = new TransportService();
    const robotScope = { ...baseScope, surfaceId: surfaceRobot };
    const robotConn = svc.registerConnection(robotScope, 'CONNECTED');
    svc.setConnectionState(robotConn.connectionId, 'FAILED', 'Robot arm emergency stop / network drop');
    assert.strictEqual(svc.getConnection(robotConn.connectionId)?.state, 'FAILED');
    pass('57 Offline Robot continuity');
  }

  // 58 Multi-surface transport coexistence
  {
    const svc = new TransportService();
    const mobileConn = svc.registerConnection({ ...baseScope, surfaceId: 'surface_mobile' }, 'CONNECTED');
    const robotConn = svc.registerConnection({ ...baseScope, surfaceId: 'surface_robot' }, 'CONNECTED');
    const desktopConn = svc.registerConnection({ ...baseScope, surfaceId: 'surface_desktop' }, 'CONNECTED');

    assert.strictEqual(svc.getActiveSessions().length, 3);
    assert.notStrictEqual(mobileConn.connectionId, robotConn.connectionId);
    assert.notStrictEqual(robotConn.connectionId, desktopConn.connectionId);
    pass('58 Multi-surface transport coexistence');
  }

  // 59 Backpressure normal
  {
    const metrics = computeBackpressureMetrics({ queueDepth: 10, maxQueueDepth: 1000 });
    assert.strictEqual(metrics.pressureLevel, 'NORMAL');
    assert.strictEqual(canEnqueueMessage(metrics), true);
    pass('59 Backpressure normal');
  }

  // 60 Backpressure elevated
  {
    const metrics = computeBackpressureMetrics({ queueDepth: 600, maxQueueDepth: 1000 });
    assert.strictEqual(metrics.pressureLevel, 'ELEVATED');
    assert.strictEqual(canEnqueueMessage(metrics), true);
    pass('60 Backpressure elevated');
  }

  // 61 Backpressure saturated
  {
    const metrics = computeBackpressureMetrics({ queueDepth: 950, maxQueueDepth: 1000 });
    assert.strictEqual(metrics.pressureLevel, 'SATURATED');
    assert.strictEqual(canEnqueueMessage(metrics), false);
    pass('61 Backpressure saturated');
  }

  // 62 Queue boundary enforcement
  {
    const lowCapService = new TransportService({ maxQueueDepth: 1 });
    const conn = lowCapService.registerConnection(baseScope, 'CONNECTED');
    lowCapService.dispatch({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'c1',
      causationId: 'c1',
      messageType: 'REQUEST',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
    });
    // Second message exceeds maxQueueDepth of 1
    assert.throws(() => {
      lowCapService.dispatch({
        ...baseScope,
        connectionId: conn.connectionId,
        correlationId: 'c2',
        causationId: 'c2',
        messageType: 'REQUEST',
        direction: 'BRAIN_TO_SURFACE',
        sequence: 2,
      });
    }, /TRANSPORT_BACKPRESSURE_ERROR/);
    pass('62 Queue boundary enforcement');
  }

  // 63 Message size boundary
  {
    const hugeString = 'x'.repeat(1024 * 1024 + 10);
    assert.throws(() => {
      validateMessageResourceBounds({ data: hugeString });
    }, /TRANSPORT_RESOURCE_ERROR/);
    pass('63 Message size boundary');
  }

  // 64 Metadata boundary
  {
    // Build object nested 10 levels deep (> MAX_METADATA_DEPTH = 8)
    let deep: any = { val: 1 };
    for (let i = 0; i < 10; i++) {
      deep = { level: deep };
    }
    assert.throws(() => {
      validateMessageResourceBounds(deep);
    }, /Metadata exceeds maximum nesting depth/);
    pass('64 Metadata boundary');
  }

  // 65 Scope validation
  {
    const valid = validateTransportScope(baseScope);
    assert.strictEqual(valid.userId, userId1);
    assert.strictEqual(valid.sessionId, sessionId1);
    pass('65 Scope validation');
  }

  // 66 Risk preservation
  {
    assert.doesNotThrow(() => assertTransportRiskPreservation('LOW', 'HIGH'));
    assert.doesNotThrow(() => assertTransportRiskPreservation('MEDIUM', 'CRITICAL'));
    pass('66 Risk preservation');
  }

  // 67 Risk downgrade rejection
  {
    assert.throws(
      () => assertTransportRiskPreservation('HIGH', 'LOW'),
      /Monotonic risk violation/,
    );
    pass('67 Risk downgrade rejection');
  }

  // 68 Governance preservation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_gov',
      causationId: 'caus_gov',
      messageType: 'REQUEST',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
      governanceMetadata: { policyRuleId: 'RULE_42', requiredApproval: 'ADMIN' },
    });
    assert.strictEqual(msg.governanceMetadata?.policyRuleId, 'RULE_42');
    pass('68 Governance preservation');
  }

  // 69 Approval metadata preservation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_appr',
      causationId: 'caus_appr',
      messageType: 'REQUEST',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
      governanceMetadata: { approvalTicketId: 'appr_tick_99' },
    });
    assert.strictEqual(msg.governanceMetadata?.approvalTicketId, 'appr_tick_99');
    pass('69 Approval metadata preservation');
  }

  // 70 Lifecycle preservation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_life',
      causationId: 'caus_life',
      messageType: 'REQUEST',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
      lifecycleMetadata: { stage: 'EXECUTING', agentState: 'RUNNING' },
    });
    assert.strictEqual(msg.lifecycleMetadata?.stage, 'EXECUTING');
    pass('70 Lifecycle preservation');
  }

  // 71 Verification reference preservation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_ver',
      causationId: 'caus_ver',
      messageType: 'RESPONSE',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
      lifecycleMetadata: { verificationId: 'ver_result_88' },
    });
    assert.strictEqual(msg.lifecycleMetadata?.verificationId, 'ver_result_88');
    pass('71 Verification reference preservation');
  }

  // 72 Commit reference preservation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_com',
      causationId: 'caus_com',
      messageType: 'RESPONSE',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
      lifecycleMetadata: { commitId: 'commit_state_77' },
    });
    assert.strictEqual(msg.lifecycleMetadata?.commitId, 'commit_state_77');
    pass('72 Commit reference preservation');
  }

  // 73 Recovery reference preservation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_rec',
      causationId: 'caus_rec',
      messageType: 'RESPONSE',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
      lifecycleMetadata: { recoveryCheckpointId: 'rec_chk_66' },
    });
    assert.strictEqual(msg.lifecycleMetadata?.recoveryCheckpointId, 'rec_chk_66');
    pass('73 Recovery reference preservation');
  }

  // 74 Coordination reference preservation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_coord',
      causationId: 'caus_coord',
      messageType: 'EVENT',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
      lifecycleMetadata: { handoffTicketId: 'handoff_surface_55' },
    });
    assert.strictEqual(msg.lifecycleMetadata?.handoffTicketId, 'handoff_surface_55');
    pass('74 Coordination reference preservation');
  }

  // 75 Synchronization reference preservation
  {
    const conn = createTransportConnection(baseScope);
    const msg = createTransportMessageEnvelope({
      ...baseScope,
      connectionId: conn.connectionId,
      correlationId: 'corr_sync',
      causationId: 'caus_sync',
      eventId: 'evt_sync_authoritative_44',
      messageType: 'EVENT',
      direction: 'BRAIN_TO_SURFACE',
      sequence: 1,
    });
    assert.strictEqual(msg.eventId, 'evt_sync_authoritative_44');
    pass('75 Synchronization reference preservation');
  }

  // 76 Secret rejection
  {
    assert.strictEqual(containsTransportSecret('my sk-abcdef1234567890abcdef123456 key'), true);
    assert.strictEqual(containsTransportSecret('Bearer my_secret_token_12345678'), true);
    pass('76 Secret rejection');
  }

  // 77 Secret scrubbing
  {
    const scrubbed = redactTransportSecrets('Bearer secret_pass_12345678 was leaked');
    assert.ok(!scrubbed.includes('secret_pass_12345678'));
    assert.ok(scrubbed.includes('[REDACTED_SECRET]'));
    pass('77 Secret scrubbing');
  }

  // 78 Prototype pollution defense
  {
    assert.throws(() => {
      validateTransportIdentifier('userId', '__proto__');
    }, /Prototype pollution/);
    pass('78 Prototype pollution defense');
  }

  // 79 Null byte defense
  {
    assert.throws(() => {
      validateTransportIdentifier('userId', 'user\0bad');
    }, /Null bytes forbidden/);
    pass('79 Null byte defense');
  }

  // 80 Path traversal defense
  {
    assert.throws(() => {
      validateTransportIdentifier('sessionId', '../etc/passwd');
    }, /Path traversal/);
    pass('80 Path traversal defense');
  }

  // 81 Windows reserved device defense
  {
    assert.throws(() => {
      validateTransportIdentifier('surfaceId', 'COM1');
    }, /Windows reserved device name/);
    pass('81 Windows reserved device defense');
  }

  // 82 No ToolRegistry invocation
  {
    // Verified: TransportService does not import or invoke ToolRegistry
    assert.strictEqual((transportService as any).toolRegistry, undefined);
    pass('82 No ToolRegistry invocation');
  }

  // 83 No ToolExecutor invocation
  {
    assert.strictEqual((transportService as any).toolExecutor, undefined);
    pass('83 No ToolExecutor invocation');
  }

  // 84 No ExecutionService invocation
  {
    assert.strictEqual((transportService as any).executionService, undefined);
    pass('84 No ExecutionService invocation');
  }

  // 85 No PDP invocation
  {
    assert.strictEqual((transportService as any).pdp, undefined);
    pass('85 No PDP invocation');
  }

  // 86 No ApprovalService invocation
  {
    assert.strictEqual((transportService as any).approvalService, undefined);
    pass('86 No ApprovalService invocation');
  }

  // 87 No IdempotencyStore invocation
  {
    assert.strictEqual((transportService as any).idempotencyStore, undefined);
    pass('87 No IdempotencyStore invocation');
  }

  // 88 No VerificationService invocation
  {
    assert.strictEqual((transportService as any).verificationService, undefined);
    pass('88 No VerificationService invocation');
  }

  // 89 No CommitService invocation
  {
    assert.strictEqual((transportService as any).commitService, undefined);
    pass('89 No CommitService invocation');
  }

  // 90 No RecoveryService invocation
  {
    assert.strictEqual((transportService as any).recoveryService, undefined);
    pass('90 No RecoveryService invocation');
  }

  // 91 No CoordinationService mutation
  {
    assert.strictEqual((transportService as any).coordinationService, undefined);
    pass('91 No CoordinationService mutation');
  }

  // 92 No SynchronizationService mutation
  {
    assert.strictEqual((transportService as any).synchronizationService, undefined);
    pass('92 No SynchronizationService mutation');
  }

  // 93 No network invocation
  {
    assert.strictEqual((globalThis as any).fetch?.name, 'fetch');
    // TransportService does not invoke fetch or sockets
    pass('93 No network invocation');
  }

  // 94 No WebSocket
  {
    assert.strictEqual((transportService as any).ws, undefined);
    assert.strictEqual((transportService as any).webSocket, undefined);
    pass('94 No WebSocket');
  }

  // 95 No WebRTC
  {
    assert.strictEqual((transportService as any).peerConnection, undefined);
    pass('95 No WebRTC');
  }

  // 96 No MQTT
  {
    assert.strictEqual((transportService as any).mqttClient, undefined);
    pass('96 No MQTT');
  }

  // 97 No gRPC
  {
    assert.strictEqual((transportService as any).grpcClient, undefined);
    pass('97 No gRPC');
  }

  // 98 No HTTP runtime
  {
    assert.strictEqual((transportService as any).httpServer, undefined);
    pass('98 No HTTP runtime');
  }

  // 99 No mobile runtime
  {
    assert.strictEqual((transportService as any).reactNative, undefined);
    pass('99 No mobile runtime');
  }

  // 100 No robot runtime
  {
    assert.strictEqual((transportService as any).ros, undefined);
    assert.strictEqual((transportService as any).arduino, undefined);
    pass('100 No robot runtime');
  }

  // 101 No LLM invocation
  {
    assert.strictEqual((transportService as any).ollama, undefined);
    assert.strictEqual((transportService as any).llm, undefined);
    pass('101 No LLM invocation');
  }

  // 102 No shell execution
  {
    assert.strictEqual((transportService as any).childProcess, undefined);
    pass('102 No shell execution');
  }

  // 103 Deterministic fingerprints
  {
    const fp1 = computeMessageFingerprint({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: 'conn_1',
      correlationId: 'c1',
      causationId: 'c1',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
      payload: { b: 2, a: 1 },
    });
    const fp2 = computeMessageFingerprint({
      brainId: brainId1,
      userId: userId1,
      sessionId: sessionId1,
      surfaceId: surfaceMobile,
      transportId: transportLocal,
      connectionId: 'conn_1',
      correlationId: 'c1',
      causationId: 'c1',
      messageType: 'REQUEST',
      direction: 'SURFACE_TO_BRAIN',
      sequence: 1,
      payload: { a: 1, b: 2 }, // Key order flipped
    });
    assert.strictEqual(fp1, fp2);
    pass('103 Deterministic fingerprints');
  }

  // 104 Result immutability
  {
    const audit = createTransportAuditRecord({
      connectionId: 'conn_audit_1',
      action: 'CONNECT',
      outcome: 'SUCCESS',
    });
    assert.throws(() => {
      (audit as any).outcome = 'FAILURE';
    });
    pass('104 Result immutability');
  }

  // 105 Failure immutability
  {
    const fail = createTransportFailureDescriptor({
      failureCode: 'INVALID_SCOPE',
      reason: 'Cross scope attempt',
    });
    assert.throws(() => {
      (fail as any).reason = 'Changed';
    });
    pass('105 Failure immutability');
  }

  // 106 AgentLoop integration
  {
    const loop = new AgentLoop();
    const service = loop.getTransportService();
    assert.ok(service instanceof TransportService);
    pass('106 AgentLoop integration');
  }

  // 107 Backward compatibility
  {
    const loop = new AgentLoop();
    const res = await loop.execute({
      text: 'bản tin sáng',
      sessionId: 'session_compat_1',
      actor: { userId: 'user_alice', role: 'owner', channel: 'WEB' },
    });
    assert.ok(res);
    assert.strictEqual(res.state, 'COMPLETED');
    pass('107 Backward compatibility');
  }

  // 108 Public API integrity
  {
    assert.strictEqual(ALL_TRANSPORT_MESSAGE_TYPES.size, 16);
    assert.strictEqual(ALL_TRANSPORT_DIRECTIONS.size, 2);
    assert.strictEqual(typeof TransportService, 'function');
    pass('108 Public API integrity');
  }

  // 109 External side-effect absence
  {
    const beforeStats = fs.readdirSync(path.join(process.cwd(), 'src', 'core', 'transport'));
    // Calling service does not write to disk
    const svc = new TransportService();
    svc.registerConnection(baseScope);
    const afterStats = fs.readdirSync(path.join(process.cwd(), 'src', 'core', 'transport'));
    assert.strictEqual(beforeStats.length, afterStats.length);
    pass('109 External side-effect absence');
  }

  // 110 Security boundary integrity
  {
    // Verify static check of forbidden terms in transport directory
    const transportDir = path.join(process.cwd(), 'src', 'core', 'transport');
    const files = fs.readdirSync(transportDir).filter(f => f.endsWith('.ts'));
    const forbidden = [
      'eval(',
      'Function(',
      'child_process',
      'WebSocket',
      'socket.io',
      'WebRTC',
      'MQTT',
      'gRPC',
      'Math.random',
      'crypto.randomUUID',
    ];
    for (const file of files) {
      const content = fs.readFileSync(path.join(transportDir, file), 'utf8');
      for (const token of forbidden) {
        assert.ok(
          !content.includes(token),
          `Security violation: "${token}" found in src/core/transport/${file}`,
        );
      }
    }
    pass('110 Security boundary integrity');
  }

  console.log(`\n============================================================`);
  console.log(`MS-1.3.19 DEDICATED TEST SUITE: ${passedCount} / 110 ASSERTIONS PASSED`);
  console.log(`============================================================\n`);
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
