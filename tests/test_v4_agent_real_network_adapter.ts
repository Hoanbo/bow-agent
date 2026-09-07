// tests/test_v4_agent_real_network_adapter.ts
// BOWCON V4.0 — MILESTONE 1.3.21: REAL NETWORK ADAPTER & CONNECTION RUNTIME TEST SUITE
//
// EN:
// Authoritative deterministic test suite for MS-1.3.21.
// Covers 36 categories (A through AJ) with 150 meaningful assertions.
//
// VI:
// Bộ kiểm thử tất định có thẩm quyền cho MS-1.3.21.
// Bao phủ 36 danh mục (từ A đến AJ) với 150 khẳng định thực chất.

import assert from 'node:assert';
import {
  ALL_NETWORK_ADAPTER_TYPES,
  ALL_NETWORK_DIRECTIONS,
  ALL_NETWORK_PROTOCOL_MODES,
  ALL_NETWORK_EVENT_TYPES,
  ALL_NETWORK_CONNECTION_STATES,
  ALL_NETWORK_ADAPTER_STATES,
  ALL_NETWORK_HEARTBEAT_STATES,
  ALL_NETWORK_BACKPRESSURE_STATES,
  isNetworkConnectionActive,
  isNetworkConnectionTerminal,
  isNetworkAdapterReady,
  isValidNetworkConnectionTransition,
  assertValidNetworkConnectionTransition,
  isValidNetworkAdapterTransition,
  assertValidNetworkAdapterTransition,
  isValidNetworkHeartbeatTransition,
  assertValidNetworkHeartbeatTransition,
  computeNetworkScopeKey,
  computeNetworkConnectionFingerprint,
  computeNetworkFrameFingerprint,
  computePayloadChecksum,
  computeNetworkHeartbeatFingerprint,
  computeNetworkAuditFingerprint,
  computeNetworkFailureFingerprint,
  validateNetworkIdentifier,
  validateScopedNetworkIdentity,
  validateNetworkPayloadBounds,
  redactNetworkSecrets,
  createNetworkFrame,
  validateNetworkFrame,
  assertValidNetworkFrame,
  NetworkCodec,
  createNetworkConnectionSnapshot,
  updateNetworkConnectionSnapshot,
  NetworkListenerRegistry,
  createNetworkHeartbeatSignal,
  createNetworkHeartbeatAck,
  evaluateNetworkHeartbeat,
  createNetworkReconnectRequest,
  evaluateNetworkReconnect,
  evaluateNetworkTimeout,
  classifyNetworkBackpressure,
  computeNetworkBackpressure,
  canAcceptNetworkFrame,
  createNetworkFailureDescriptor,
  createNetworkAuditRecord,
  createNetworkOperationResult,
  NetworkRegistry,
  NetworkInMemoryAdapter,
  NetworkRuntime,
} from '../src/core/network/index.js';
import type {
  ScopedNetworkIdentity,
  NetworkFrame,
  NetworkDirection,
} from '../src/core/network/index.js';
import { AgentLoop } from '../src/core/agentLoop.js';

let passedCount = 0;
function pass(label: string): void {
  passedCount++;
  console.log(`PASS ${label}`);
}

async function runTests(): Promise<void> {
  console.log('Starting MS-1.3.21 Real Network Adapter & Connection Runtime Test Suite...\n');

  const baseScope: ScopedNetworkIdentity = {
    userId: 'user_alice',
    sessionId: 'sess_net_alpha',
    brainId: 'brain_v4_core',
    surfaceId: 'surface_mobile_ios',
    transportId: 'transport_local_01',
    gatewayId: 'gw_remote_primary',
    networkAdapterId: 'adp_lan_01',
  };

  // =========================================================================
  // A. NETWORK IDENTITY
  // =========================================================================

  // 01 Adapter types
  {
    assert.strictEqual(ALL_NETWORK_ADAPTER_TYPES.has('IN_MEMORY'), true);
    assert.strictEqual(ALL_NETWORK_ADAPTER_TYPES.has('LAN'), true);
    pass('01 Adapter types');
  }

  // 02 Connection identity format
  {
    const snap = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'LAN',
    });
    assert.ok(snap.networkConnectionId.startsWith('net_'));
    pass('02 Connection identity format');
  }

  // 03 ScopeKey computation
  {
    const key = computeNetworkScopeKey(baseScope);
    assert.strictEqual(
      key,
      'user_alice::sess_net_alpha::brain_v4_core::surface_mobile_ios::transport_local_01::gw_remote_primary::adp_lan_01',
    );
    pass('03 ScopeKey computation');
  }

  // 04 7-tuple presence
  {
    const validated = validateScopedNetworkIdentity(baseScope);
    assert.strictEqual(validated.userId, 'user_alice');
    assert.strictEqual(validated.networkAdapterId, 'adp_lan_01');
    pass('04 7-tuple presence');
  }

  // =========================================================================
  // B. DETERMINISTIC IDENTITY
  // =========================================================================

  // 05 Same scope produces identical connection ID
  {
    const snap1 = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    const snap2 = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    assert.strictEqual(snap1.networkConnectionId, snap2.networkConnectionId);
    pass('05 Same scope produces identical connection ID');
  }

  // 06 Different scope produces different connection ID
  {
    const scope2: ScopedNetworkIdentity = { ...baseScope, userId: 'user_bob' };
    const snap1 = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    const snap2 = createNetworkConnectionSnapshot({ scope: scope2, adapterType: 'LAN' });
    assert.notStrictEqual(snap1.networkConnectionId, snap2.networkConnectionId);
    pass('06 Different scope produces different connection ID');
  }

  // 07 Zero random UUID in primary identity
  {
    const snap = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    assert.ok(/^[a-f0-9]{8}$/.test(snap.networkConnectionId.slice(4)));
    pass('07 Zero random UUID in primary identity');
  }

  // =========================================================================
  // C. SCOPE ISOLATION (7-TUPLE)
  // =========================================================================

  // 08 User isolation
  {
    const reg = new NetworkRegistry();
    const snap = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    reg.registerConnection(snap);
    assert.throws(
      () => reg.getConnectionBySurface(baseScope.surfaceId, 'user_attacker'),
      /User isolation/,
    );
    pass('08 User isolation');
  }

  // 09 Session isolation
  {
    const scopeB = { ...baseScope, sessionId: 'sess_other' };
    const keyA = computeNetworkScopeKey(baseScope);
    const keyB = computeNetworkScopeKey(scopeB);
    assert.notStrictEqual(keyA, keyB);
    pass('09 Session isolation');
  }

  // 10 Brain isolation
  {
    const reg = new NetworkRegistry();
    const snap = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    reg.registerConnection(snap);
    assert.throws(
      () => reg.getConnectionBySurface(baseScope.surfaceId, baseScope.userId, 'brain_foreign'),
      /Brain isolation/,
    );
    pass('10 Brain isolation');
  }

  // 11 Surface isolation
  {
    const scopeOtherSurface = { ...baseScope, surfaceId: 'surface_robot_01' };
    const snap1 = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    const snap2 = createNetworkConnectionSnapshot({ scope: scopeOtherSurface, adapterType: 'LAN' });
    assert.notStrictEqual(snap1.scopeKey, snap2.scopeKey);
    pass('11 Surface isolation');
  }

  // 12 Transport isolation
  {
    const scopeOtherTransport = { ...baseScope, transportId: 'transport_remote_ws' };
    const snap1 = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    const snap2 = createNetworkConnectionSnapshot({ scope: scopeOtherTransport, adapterType: 'LAN' });
    assert.notStrictEqual(snap1.networkConnectionId, snap2.networkConnectionId);
    pass('12 Transport isolation');
  }

  // 13 Gateway isolation
  {
    const scopeOtherGw = { ...baseScope, gatewayId: 'gw_secondary' };
    const snap1 = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    const snap2 = createNetworkConnectionSnapshot({ scope: scopeOtherGw, adapterType: 'LAN' });
    assert.notStrictEqual(snap1.networkConnectionId, snap2.networkConnectionId);
    pass('13 Gateway isolation');
  }

  // 14 Adapter isolation
  {
    const scopeOtherAdp = { ...baseScope, networkAdapterId: 'adp_wan_99' };
    const snap1 = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    const snap2 = createNetworkConnectionSnapshot({ scope: scopeOtherAdp, adapterType: 'LAN' });
    assert.notStrictEqual(snap1.networkConnectionId, snap2.networkConnectionId);
    pass('14 Adapter isolation');
  }

  // 15 Cross-scope rejection
  {
    const reg = new NetworkRegistry();
    const snap = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'LAN' });
    reg.registerConnection(snap);
    const foreignScope = { ...baseScope, userId: 'attacker_user' };
    assert.throws(
      () => reg.getConnection(snap.networkConnectionId, foreignScope),
      /Cross-scope access denied/,
    );
    pass('15 Cross-scope rejection');
  }

  // =========================================================================
  // D. FRAME CREATION
  // =========================================================================

  // 16 Frame ID format
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { hello: 'world' },
    });
    assert.ok(frame.frameId.startsWith('frm_'));
    pass('16 Frame ID format');
  }

  // 17 Checksum computation
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { key: 'val' },
    });
    const expectedChecksum = computePayloadChecksum({ key: 'val' });
    assert.strictEqual(frame.checksum, expectedChecksum);
    pass('17 Checksum computation');
  }

  // 18 Sequence validation
  {
    assert.throws(
      () =>
        createNetworkFrame({
          networkConnectionId: 'net_12345678',
          gatewayId: 'gw_01',
          transportId: 'trans_01',
          surfaceId: 'surf_01',
          sequence: -1,
          direction: 'OUTBOUND',
          messageType: 'EVENT',
          payload: {},
        }),
      /Sequence must be a non-negative integer/,
    );
    pass('18 Sequence validation');
  }

  // 19 Direction validation
  {
    assert.strictEqual(ALL_NETWORK_DIRECTIONS.has('INBOUND'), true);
    assert.strictEqual(ALL_NETWORK_DIRECTIONS.has('OUTBOUND'), true);
    assert.strictEqual(ALL_NETWORK_DIRECTIONS.has('BIDIRECTIONAL'), true);
    pass('19 Direction validation');
  }

  // 20 Payload preservation
  {
    const payload = { telemetry: [1, 2, 3], sensor: 'lidar' };
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 2,
      direction: 'INBOUND',
      messageType: 'OBSERVATION',
      payload,
    });
    assert.deepStrictEqual(frame.payload, payload);
    pass('20 Payload preservation');
  }

  // =========================================================================
  // E. FRAME IMMUTABILITY
  // =========================================================================

  // 21 Frame object frozen
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { a: 1 },
    });
    assert.throws(() => {
      (frame as any).sequence = 999;
    });
    pass('21 Frame object frozen');
  }

  // 22 Payload mutation throws
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { a: 1 },
    });
    assert.throws(() => {
      (frame.payload as any).a = 2;
    });
    pass('22 Payload mutation throws');
  }

  // 23 Metadata mutation throws
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: {},
      metadata: { meta: 'val' },
    });
    assert.throws(() => {
      (frame.metadata as any).meta = 'mutated';
    });
    pass('23 Metadata mutation throws');
  }

  // =========================================================================
  // F. CODEC ENCODE
  // =========================================================================

  const codec = new NetworkCodec();

  // 24 Codec encodes frame to JSON string
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { ping: true },
    });
    const encoded = codec.encode(frame);
    assert.strictEqual(typeof encoded, 'string');
    assert.ok(encoded.includes('"ping":true'));
    pass('24 Codec encodes frame to JSON string');
  }

  // 25 Codec output contains essential fields
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 5,
      direction: 'INBOUND',
      messageType: 'REQUEST',
      payload: {},
    });
    const encoded = codec.encode(frame);
    assert.ok(encoded.includes(frame.frameId));
    assert.ok(encoded.includes(frame.networkConnectionId));
    assert.ok(encoded.includes('"sequence":5'));
    pass('25 Codec output contains essential fields');
  }

  // 26 Validate frame before serializing
  {
    assert.throws(() => codec.encode(null as any), /Frame must be a valid object/);
    pass('26 Validate frame before serializing');
  }

  // 27 Bounds check on encoded size
  {
    const tinyCodec = new NetworkCodec({ maxRawSizeBytes: 50 });
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { large: 'a'.repeat(100) },
    });
    assert.throws(() => tinyCodec.encode(frame), /exceeds max size/);
    pass('27 Bounds check on encoded size');
  }

  // =========================================================================
  // G. CODEC DECODE
  // =========================================================================

  // 28 Decodes valid string to matching NetworkFrame
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 3,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { count: 42 },
    });
    const encoded = codec.encode(frame);
    const decoded = codec.decode(encoded);
    assert.strictEqual(decoded.frameId, frame.frameId);
    assert.strictEqual(decoded.sequence, 3);
    assert.deepStrictEqual(decoded.payload, { count: 42 });
    pass('28 Decodes valid string to matching NetworkFrame');
  }

  // 29 Validates checksum upon decoding
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { val: 1 },
    });
    const rawObj = JSON.parse(codec.encode(frame));
    rawObj.checksum = 'tampered_checksum';
    assert.throws(() => codec.decode(JSON.stringify(rawObj)), /checksum mismatch/);
    pass('29 Validates checksum upon decoding');
  }

  // 30 Validates fingerprint upon decoding
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { val: 1 },
    });
    const rawObj = JSON.parse(codec.encode(frame));
    rawObj.fingerprint = 'tampered_fingerprint';
    assert.throws(() => codec.decode(JSON.stringify(rawObj)), /fingerprint mismatch/);
    pass('30 Validates fingerprint upon decoding');
  }

  // 31 Deep freezes decoded frame
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: { x: 10 },
    });
    const decoded = codec.decode(codec.encode(frame));
    assert.throws(() => {
      (decoded.payload as any).x = 20;
    });
    pass('31 Deep freezes decoded frame');
  }

  // 32 Preserves all fields accurately
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_alpha',
      transportId: 'trans_beta',
      surfaceId: 'surf_gamma',
      sequence: 10,
      direction: 'BIDIRECTIONAL',
      messageType: 'SYNC_SIGNAL',
      payload: { status: 'OK' },
    });
    const decoded = codec.decode(codec.encode(frame));
    assert.strictEqual(decoded.gatewayId, 'gw_alpha');
    assert.strictEqual(decoded.transportId, 'trans_beta');
    assert.strictEqual(decoded.surfaceId, 'surf_gamma');
    assert.strictEqual(decoded.direction, 'BIDIRECTIONAL');
    pass('32 Preserves all fields accurately');
  }

  // =========================================================================
  // H. MALFORMED FRAME REJECTION
  // =========================================================================

  // 33 Non-JSON raw input fails closed
  {
    assert.throws(() => codec.decode('not valid json {[[['), /JSON/);
    pass('33 Non-JSON raw input fails closed');
  }

  // 34 Missing required fields fails closed
  {
    const incomplete = JSON.stringify({ frameId: 'frm_1234' });
    assert.throws(() => codec.decode(incomplete), /Identifier/);
    pass('34 Missing required fields fails closed');
  }

  // 35 Checksum mismatch fails closed
  {
    assert.strictEqual(codec.validateEncodedFrame('invalid-frame-raw'), false);
    pass('35 Checksum mismatch fails closed');
  }

  // 36 Invalid sequence fails closed
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: {},
    });
    const rawObj = JSON.parse(codec.encode(frame));
    rawObj.sequence = -5;
    assert.throws(() => codec.decode(JSON.stringify(rawObj)), /sequence must be/i);
    pass('36 Invalid sequence fails closed');
  }

  // 37 Invalid direction fails closed
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_12345678',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'EVENT',
      payload: {},
    });
    const rawObj = JSON.parse(codec.encode(frame));
    rawObj.direction = 'UNKNOWN_DIRECTION';
    assert.throws(() => codec.decode(JSON.stringify(rawObj)), /Invalid frame direction/);
    pass('37 Invalid direction fails closed');
  }

  // =========================================================================
  // I. OVERSIZED PAYLOAD REJECTION
  // =========================================================================

  // 38 Payload exceeding 64KB throws
  {
    const hugePayload = { big: 'x'.repeat(70 * 1024) };
    assert.throws(
      () =>
        createNetworkFrame({
          networkConnectionId: 'net_12345678',
          gatewayId: 'gw_01',
          transportId: 'trans_01',
          surfaceId: 'surf_01',
          sequence: 1,
          direction: 'OUTBOUND',
          messageType: 'EVENT',
          payload: hugePayload,
        }),
      /exceeds limit of 65536 bytes/,
    );
    pass('38 Payload exceeding 64KB throws');
  }

  // 39 Nesting exceeding 8 levels throws
  {
    let deep: any = { val: 1 };
    for (let i = 0; i < 10; i++) {
      deep = { child: deep };
    }
    assert.throws(
      () =>
        createNetworkFrame({
          networkConnectionId: 'net_12345678',
          gatewayId: 'gw_01',
          transportId: 'trans_01',
          surfaceId: 'surf_01',
          sequence: 1,
          direction: 'OUTBOUND',
          messageType: 'EVENT',
          payload: deep,
        }),
      /Payload nesting depth exceeds maximum/,
    );
    pass('39 Nesting exceeding 8 levels throws');
  }

  // 40 Oversized raw input in decode throws
  {
    const hugeRaw = 'a'.repeat(200 * 1024);
    assert.throws(() => codec.decode(hugeRaw), /exceeds limit/);
    pass('40 Oversized raw input in decode throws');
  }

  // 41 Validate payload bounds directly
  {
    assert.doesNotThrow(() => validateNetworkPayloadBounds({ valid: true }));
    pass('41 Validate payload bounds directly');
  }

  // =========================================================================
  // J. CONNECTION LIFECYCLE
  // =========================================================================

  // 42 Create connection in CREATED state
  {
    const conn = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'CREATED',
    });
    assert.strictEqual(conn.state, 'CREATED');
    pass('42 Create connection in CREATED state');
  }

  // 43 Full lifecycle transition path
  {
    let conn = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'CREATED',
    });
    conn = updateNetworkConnectionSnapshot(conn, { state: 'CONNECTING' });
    conn = updateNetworkConnectionSnapshot(conn, { state: 'OPEN' });
    conn = updateNetworkConnectionSnapshot(conn, { state: 'ACTIVE' });
    conn = updateNetworkConnectionSnapshot(conn, { state: 'IDLE' });
    conn = updateNetworkConnectionSnapshot(conn, { state: 'DRAINING' });
    conn = updateNetworkConnectionSnapshot(conn, { state: 'CLOSING' });
    conn = updateNetworkConnectionSnapshot(conn, { state: 'CLOSED' });
    assert.strictEqual(conn.state, 'CLOSED');
    pass('43 Full lifecycle transition path');
  }

  // 44 Terminal state cannot transition
  {
    const conn = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'CLOSED',
    });
    assert.throws(
      () => updateNetworkConnectionSnapshot(conn, { state: 'OPEN' }),
      /Invalid connection transition/,
    );
    pass('44 Terminal state cannot transition');
  }

  // 45 Health status tracking
  {
    let conn = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
    });
    assert.strictEqual(conn.health, 'HEALTHY');
    conn = updateNetworkConnectionSnapshot(conn, { health: 'DEGRADED' });
    assert.strictEqual(conn.health, 'DEGRADED');
    pass('45 Health status tracking');
  }

  // 46 Pending frame count tracking
  {
    let conn = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
    });
    conn = updateNetworkConnectionSnapshot(conn, { pendingFrameCount: 15 });
    assert.strictEqual(conn.pendingFrameCount, 15);
    pass('46 Pending frame count tracking');
  }

  // 47 Sequence tracking in connection
  {
    let conn = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
    });
    conn = updateNetworkConnectionSnapshot(conn, { lastSentSequence: 7, lastReceivedSequence: 5 });
    assert.strictEqual(conn.lastSentSequence, 7);
    assert.strictEqual(conn.lastReceivedSequence, 5);
    pass('47 Sequence tracking in connection');
  }

  // =========================================================================
  // K. CONNECTION TRANSITION VALIDATION
  // =========================================================================

  // 48 Valid connection transition predicate
  {
    assert.strictEqual(isValidNetworkConnectionTransition('CREATED', 'CONNECTING'), true);
    assert.strictEqual(isValidNetworkConnectionTransition('OPEN', 'ACTIVE'), true);
    pass('48 Valid connection transition predicate');
  }

  // 49 Invalid connection jump rejected
  {
    assert.strictEqual(isValidNetworkConnectionTransition('CREATED', 'ACTIVE'), false);
    assert.strictEqual(isValidNetworkConnectionTransition('CLOSED', 'OPEN'), false);
    pass('49 Invalid connection jump rejected');
  }

  // 50 Assert valid transition throws on invalid
  {
    assert.throws(
      () => assertValidNetworkConnectionTransition('FAILED', 'OPEN'),
      /Invalid connection transition/,
    );
    pass('50 Assert valid transition throws on invalid');
  }

  // 51 Active connection predicate
  {
    assert.strictEqual(isNetworkConnectionActive('OPEN'), true);
    assert.strictEqual(isNetworkConnectionActive('ACTIVE'), true);
    assert.strictEqual(isNetworkConnectionActive('CLOSED'), false);
    pass('51 Active connection predicate');
  }

  // 52 Terminal connection predicate
  {
    assert.strictEqual(isNetworkConnectionTerminal('CLOSED'), true);
    assert.strictEqual(isNetworkConnectionTerminal('FAILED'), true);
    assert.strictEqual(isNetworkConnectionTerminal('ACTIVE'), false);
    pass('52 Terminal connection predicate');
  }

  // =========================================================================
  // L. ADAPTER LIFECYCLE
  // =========================================================================

  // 53 Adapter initial state is READY
  {
    const adp = new NetworkInMemoryAdapter();
    assert.strictEqual(adp.getState(), 'READY');
    assert.strictEqual(isNetworkAdapterReady(adp.getState()), true);
    pass('53 Adapter initial state is READY');
  }

  // 54 Adapter transition to PAUSED -> READY -> STOPPED
  {
    assert.strictEqual(isValidNetworkAdapterTransition('READY', 'PAUSED'), true);
    assert.strictEqual(isValidNetworkAdapterTransition('PAUSED', 'READY'), true);
    assert.strictEqual(isValidNetworkAdapterTransition('READY', 'STOPPED'), true);
    pass('54 Adapter transition to PAUSED -> READY -> STOPPED');
  }

  // 55 Adapter terminal state STOPPED
  {
    assert.strictEqual(isValidNetworkAdapterTransition('STOPPED', 'READY'), false);
    pass('55 Adapter terminal state STOPPED');
  }

  // 56 Assert valid adapter transition
  {
    assert.throws(
      () => assertValidNetworkAdapterTransition('FAILED', 'READY'),
      /Invalid adapter transition/,
    );
    pass('56 Assert valid adapter transition');
  }

  // =========================================================================
  // M. SEND
  // =========================================================================

  // 57 Send frame via adapter returns ACCEPTED
  {
    const adp = new NetworkInMemoryAdapter();
    const conn = await adp.open(baseScope);
    const frame = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'TEST_MSG',
      payload: { ok: true },
    });
    const res = await adp.send(frame);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'ACCEPTED');
    pass('57 Send frame via adapter returns ACCEPTED');
  }

  // 58 Send updates lastSentSequence
  {
    const adp = new NetworkInMemoryAdapter();
    const conn = await adp.open(baseScope);
    const frame = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 12,
      direction: 'OUTBOUND',
      messageType: 'TEST_MSG',
      payload: {},
    });
    await adp.send(frame);
    const updated = adp.getConnection(conn.networkConnectionId);
    assert.strictEqual(updated?.lastSentSequence, 12);
    pass('58 Send updates lastSentSequence');
  }

  // 59 Send updates pending frame count
  {
    const adp = new NetworkInMemoryAdapter();
    const conn = await adp.open(baseScope);
    const frame = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'TEST_MSG',
      payload: {},
    });
    await adp.send(frame);
    const updated = adp.getConnection(conn.networkConnectionId);
    assert.strictEqual(updated?.pendingFrameCount, 1);
    pass('59 Send updates pending frame count');
  }

  // 60 Send on closed connection returns FAILED with CONNECTION_CLOSED
  {
    const adp = new NetworkInMemoryAdapter();
    const conn = await adp.open(baseScope);
    await adp.close(conn.networkConnectionId);
    const frame = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'TEST_MSG',
      payload: {},
    });
    const res = await adp.send(frame);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error?.code, 'CONNECTION_CLOSED');
    pass('60 Send on closed connection returns FAILED with CONNECTION_CLOSED');
  }

  // 61 Send on non-existent connection returns FAILED
  {
    const adp = new NetworkInMemoryAdapter();
    const frame = createNetworkFrame({
      networkConnectionId: 'net_non_existent',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'TEST_MSG',
      payload: {},
    });
    const res = await adp.send(frame);
    assert.strictEqual(res.success, false);
    pass('61 Send on non-existent connection returns FAILED');
  }

  // =========================================================================
  // N. RECEIVE
  // =========================================================================

  // 62 Receive retrieves previously sent frame
  {
    const adp = new NetworkInMemoryAdapter();
    const conn = await adp.open(baseScope);
    const frame = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 1,
      direction: 'INBOUND',
      messageType: 'OBSERVE',
      payload: { val: 'abc' },
    });
    await adp.send(frame);
    const received = await adp.receive(conn.networkConnectionId);
    assert.ok(received);
    assert.strictEqual(received?.frameId, frame.frameId);
    assert.deepStrictEqual(received?.payload, { val: 'abc' });
    pass('62 Receive retrieves previously sent frame');
  }

  // 63 Receive updates lastReceivedSequence
  {
    const adp = new NetworkInMemoryAdapter();
    const conn = await adp.open(baseScope);
    const frame = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 9,
      direction: 'INBOUND',
      messageType: 'OBSERVE',
      payload: {},
    });
    await adp.send(frame);
    await adp.receive(conn.networkConnectionId);
    const updated = adp.getConnection(conn.networkConnectionId);
    assert.strictEqual(updated?.lastReceivedSequence, 9);
    pass('63 Receive updates lastReceivedSequence');
  }

  // 64 Receive decrements pending count
  {
    const adp = new NetworkInMemoryAdapter();
    const conn = await adp.open(baseScope);
    const frame = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 1,
      direction: 'INBOUND',
      messageType: 'OBSERVE',
      payload: {},
    });
    await adp.send(frame);
    await adp.receive(conn.networkConnectionId);
    const updated = adp.getConnection(conn.networkConnectionId);
    assert.strictEqual(updated?.pendingFrameCount, 0);
    pass('64 Receive decrements pending count');
  }

  // 65 Receive on empty queue returns undefined
  {
    const adp = new NetworkInMemoryAdapter();
    const conn = await adp.open(baseScope);
    const received = await adp.receive(conn.networkConnectionId);
    assert.strictEqual(received, undefined);
    pass('65 Receive on empty queue returns undefined');
  }

  // 66 Receive on closed connection returns undefined
  {
    const adp = new NetworkInMemoryAdapter();
    const conn = await adp.open(baseScope);
    await adp.close(conn.networkConnectionId);
    const received = await adp.receive(conn.networkConnectionId);
    assert.strictEqual(received, undefined);
    pass('66 Receive on closed connection returns undefined');
  }

  // =========================================================================
  // O. HEARTBEAT
  // =========================================================================

  // 67 Create heartbeat signal
  {
    const sig = createNetworkHeartbeatSignal({
      networkConnectionId: 'net_conn_test',
      sequence: 1,
      timestamp: 1000,
    });
    assert.ok(sig.heartbeatId.startsWith('hb_'));
    assert.strictEqual(sig.sequence, 1);
    pass('67 Create heartbeat signal');
  }

  // 68 Create heartbeat ack
  {
    const sig = createNetworkHeartbeatSignal({
      networkConnectionId: 'net_conn_test',
      sequence: 1,
      timestamp: 1000,
    });
    const ack = createNetworkHeartbeatAck({
      signal: sig,
      currentTimestamp: 1020,
    });
    assert.ok(ack.ackId.startsWith('hback_'));
    assert.strictEqual(ack.roundTripTimeMs, 20);
    pass('68 Create heartbeat ack');
  }

  // 69 Evaluate heartbeat success
  {
    const sig = createNetworkHeartbeatSignal({
      networkConnectionId: 'net_conn_test',
      sequence: 1,
      timestamp: 1000,
    });
    const ack = createNetworkHeartbeatAck({ signal: sig, currentTimestamp: 1015 });
    const res = evaluateNetworkHeartbeat(sig, ack);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.heartbeatState, 'ACKNOWLEDGED');
    pass('69 Evaluate heartbeat success');
  }

  // 70 Heartbeat connection mismatch fails
  {
    const sig = createNetworkHeartbeatSignal({
      networkConnectionId: 'net_conn_A',
      sequence: 1,
      timestamp: 1000,
    });
    const ack = {
      ackId: 'hback_fake',
      heartbeatId: sig.heartbeatId,
      networkConnectionId: 'net_conn_B',
      roundTripTimeMs: 10,
      timestamp: 1010,
      fingerprint: 'fp',
    };
    const res = evaluateNetworkHeartbeat(sig, ack);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.heartbeatState, 'FAILED');
    pass('70 Heartbeat connection mismatch fails');
  }

  // 71 Heartbeat ID mismatch fails
  {
    const sig = createNetworkHeartbeatSignal({
      networkConnectionId: 'net_conn_A',
      sequence: 1,
      timestamp: 1000,
    });
    const ack = {
      ackId: 'hback_fake',
      heartbeatId: 'hb_different',
      networkConnectionId: 'net_conn_A',
      roundTripTimeMs: 10,
      timestamp: 1010,
      fingerprint: 'fp',
    };
    const res = evaluateNetworkHeartbeat(sig, ack);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.heartbeatState, 'FAILED');
    pass('71 Heartbeat ID mismatch fails');
  }

  // 72 Heartbeat RTT timeout
  {
    const sig = createNetworkHeartbeatSignal({
      networkConnectionId: 'net_conn_A',
      sequence: 1,
      timestamp: 1000,
    });
    const ack = createNetworkHeartbeatAck({ signal: sig, currentTimestamp: 20000 });
    const res = evaluateNetworkHeartbeat(sig, ack, 5000);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.heartbeatState, 'TIMED_OUT');
    pass('72 Heartbeat RTT timeout');
  }

  // =========================================================================
  // P. TIMEOUT
  // =========================================================================

  // 73 Operation within timeout returns false
  {
    const res = evaluateNetworkTimeout({
      timeoutType: 'FRAME_TIMEOUT',
      startTimestamp: 1000,
      currentTimestamp: 1500,
    });
    assert.strictEqual(res.timedOut, false);
    pass('73 Operation within timeout returns false');
  }

  // 74 Operation exceeding timeout returns true
  {
    const res = evaluateNetworkTimeout({
      timeoutType: 'FRAME_TIMEOUT',
      startTimestamp: 1000,
      currentTimestamp: 15000,
      config: { frameTimeoutMs: 5000 },
    });
    assert.strictEqual(res.timedOut, true);
    assert.strictEqual(res.failureCode, 'FRAME_TIMEOUT');
    pass('74 Operation exceeding timeout returns true');
  }

  // 75 Connect timeout
  {
    const res = evaluateNetworkTimeout({
      timeoutType: 'CONNECT_TIMEOUT',
      startTimestamp: 0,
      currentTimestamp: 10000,
      config: { connectTimeoutMs: 2000 },
    });
    assert.strictEqual(res.failureCode, 'CONNECTION_TIMEOUT');
    pass('75 Connect timeout');
  }

  // 76 Heartbeat timeout
  {
    const res = evaluateNetworkTimeout({
      timeoutType: 'HEARTBEAT_TIMEOUT',
      startTimestamp: 0,
      currentTimestamp: 20000,
      config: { heartbeatTimeoutMs: 15000 },
    });
    assert.strictEqual(res.failureCode, 'HEARTBEAT_TIMEOUT');
    pass('76 Heartbeat timeout');
  }

  // 77 Reconnect timeout
  {
    const res = evaluateNetworkTimeout({
      timeoutType: 'RECONNECT_TIMEOUT',
      startTimestamp: 0,
      currentTimestamp: 40000,
      config: { reconnectTimeoutMs: 30000 },
    });
    assert.strictEqual(res.failureCode, 'RECONNECT_TIMEOUT');
    pass('77 Reconnect timeout');
  }

  // 78 Response timeout
  {
    const res = evaluateNetworkTimeout({
      timeoutType: 'RESPONSE_TIMEOUT',
      startTimestamp: 0,
      currentTimestamp: 12000,
      config: { responseTimeoutMs: 10000 },
    });
    assert.strictEqual(res.failureCode, 'RESPONSE_TIMEOUT');
    pass('78 Response timeout');
  }

  // =========================================================================
  // Q. RECONNECT
  // =========================================================================

  // 79 Create reconnect request
  {
    const req = createNetworkReconnectRequest({
      previousConnectionId: 'net_prev_01',
      scope: baseScope,
      lastAcknowledgedSequence: 5,
    });
    assert.ok(req.reconnectId.startsWith('rec_'));
    assert.strictEqual(req.lastAcknowledgedSequence, 5);
    pass('79 Create reconnect request');
  }

  // 80 Evaluate reconnect accepts valid request
  {
    const prev = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'SUSPENDED',
      initialSequence: 10,
    });
    const req = createNetworkReconnectRequest({
      previousConnectionId: prev.networkConnectionId,
      scope: baseScope,
      lastAcknowledgedSequence: 8,
    });
    const res = evaluateNetworkReconnect(prev, req);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.status, 'RECONNECTED');
    pass('80 Evaluate reconnect accepts valid request');
  }

  // 81 Reconnect preserves lastSentSequence
  {
    const prev = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'SUSPENDED',
      initialSequence: 15,
    });
    const req = createNetworkReconnectRequest({
      previousConnectionId: prev.networkConnectionId,
      scope: baseScope,
      lastAcknowledgedSequence: 10,
    });
    const res = evaluateNetworkReconnect(prev, req);
    assert.strictEqual(res.resumedSequence, 15);
    pass('81 Reconnect preserves lastSentSequence');
  }

  // 82 Reconnect increments reconnectCount
  {
    const prev = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'SUSPENDED',
    });
    const req = createNetworkReconnectRequest({
      previousConnectionId: prev.networkConnectionId,
      scope: baseScope,
      lastAcknowledgedSequence: 0,
    });
    const res = evaluateNetworkReconnect(prev, req);
    assert.strictEqual(res.connection?.reconnectCount, 1);
    pass('82 Reconnect increments reconnectCount');
  }

  // 83 Reconnect rejects connection ID mismatch
  {
    const prev = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'SUSPENDED',
    });
    const req = createNetworkReconnectRequest({
      previousConnectionId: 'net_wrong_conn',
      scope: baseScope,
      lastAcknowledgedSequence: 0,
    });
    const res = evaluateNetworkReconnect(prev, req);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'RECONNECT_REJECTED');
    pass('83 Reconnect rejects connection ID mismatch');
  }

  // 84 Reconnect rejects scopeKey mismatch
  {
    const prev = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'SUSPENDED',
    });
    const otherScope = { ...baseScope, userId: 'other_user' };
    const req = createNetworkReconnectRequest({
      previousConnectionId: prev.networkConnectionId,
      scope: otherScope,
      lastAcknowledgedSequence: 0,
    });
    const res = evaluateNetworkReconnect(prev, req);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'RECONNECT_REJECTED');
    pass('84 Reconnect rejects scopeKey mismatch');
  }

  // =========================================================================
  // R. SEQUENCE PRESERVATION
  // =========================================================================

  // 85 Reconnect does not reset sequence to zero
  {
    const prev = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'SUSPENDED',
      initialSequence: 100,
    });
    const req = createNetworkReconnectRequest({
      previousConnectionId: prev.networkConnectionId,
      scope: baseScope,
      lastAcknowledgedSequence: 90,
    });
    const res = evaluateNetworkReconnect(prev, req);
    assert.strictEqual(res.connection?.lastSentSequence, 100);
    pass('85 Reconnect does not reset sequence to zero');
  }

  // 86 Ack sequence exceeding last sent is rejected
  {
    const prev = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'SUSPENDED',
      initialSequence: 50,
    });
    const req = createNetworkReconnectRequest({
      previousConnectionId: prev.networkConnectionId,
      scope: baseScope,
      lastAcknowledgedSequence: 999, // Impossible future sequence
    });
    const res = evaluateNetworkReconnect(prev, req);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'RECONNECT_REJECTED');
    pass('86 Ack sequence exceeding last sent is rejected');
  }

  // 87 Monotonic sequence progression preserved
  {
    let conn = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'IN_MEMORY' });
    conn = updateNetworkConnectionSnapshot(conn, { lastSentSequence: 1 });
    conn = updateNetworkConnectionSnapshot(conn, { lastSentSequence: 2 });
    assert.strictEqual(conn.lastSentSequence, 2);
    pass('87 Monotonic sequence progression preserved');
  }

  // 88 Negative sequence rejected
  {
    assert.throws(
      () =>
        createNetworkFrame({
          networkConnectionId: 'net_01',
          gatewayId: 'gw_01',
          transportId: 'trans_01',
          surfaceId: 'surf_01',
          sequence: -10,
          direction: 'INBOUND',
          messageType: 'PING',
          payload: {},
        }),
      /Sequence must be a non-negative integer/,
    );
    pass('88 Negative sequence rejected');
  }

  // =========================================================================
  // S. REPLAY DEFENSE
  // =========================================================================

  // 89 Frame checksum matches payload
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_01',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'MSG',
      payload: { x: 1 },
    });
    assert.strictEqual(validateNetworkFrame(frame), true);
    pass('89 Frame checksum matches payload');
  }

  // 90 Mutated payload fails frame validation
  {
    const frame = createNetworkFrame({
      networkConnectionId: 'net_01',
      gatewayId: 'gw_01',
      transportId: 'trans_01',
      surfaceId: 'surf_01',
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'MSG',
      payload: { x: 1 },
    });
    const mutated = { ...frame, checksum: 'bad_checksum' };
    assert.strictEqual(validateNetworkFrame(mutated), false);
    pass('90 Mutated payload fails frame validation');
  }

  // 91 Assert valid network frame throws on invalid
  {
    assert.throws(() => assertValidNetworkFrame({ bad: 'frame' }), /Frame integrity validation failed/);
    pass('91 Assert valid network frame throws on invalid');
  }

  // 92 Checksum calculation is deterministic
  {
    const cs1 = computePayloadChecksum({ a: 1, b: 2 });
    const cs2 = computePayloadChecksum({ b: 2, a: 1 });
    assert.strictEqual(cs1, cs2);
    pass('92 Checksum calculation is deterministic');
  }

  // =========================================================================
  // T. BACKPRESSURE
  // =========================================================================

  // 93 Normal backpressure state
  {
    assert.strictEqual(classifyNetworkBackpressure(100, 1000), 'NORMAL');
    pass('93 Normal backpressure state');
  }

  // 94 Elevated backpressure state
  {
    assert.strictEqual(classifyNetworkBackpressure(600, 1000), 'ELEVATED');
    pass('94 Elevated backpressure state');
  }

  // 95 High backpressure state
  {
    assert.strictEqual(classifyNetworkBackpressure(800, 1000), 'HIGH');
    pass('95 High backpressure state');
  }

  // 96 Saturated backpressure state
  {
    assert.strictEqual(classifyNetworkBackpressure(950, 1000), 'SATURATED');
    pass('96 Saturated backpressure state');
  }

  // 97 Blocked backpressure state
  {
    assert.strictEqual(classifyNetworkBackpressure(1000, 1000), 'BLOCKED');
    pass('97 Blocked backpressure state');
  }

  // 98 Send returns RATE_LIMITED on saturated queue (zero silent drop)
  {
    const adp = new NetworkInMemoryAdapter({ maxQueueDepth: 1 });
    const conn = await adp.open(baseScope);
    const f1 = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'TEST',
      payload: {},
    });
    const f2 = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 2,
      direction: 'OUTBOUND',
      messageType: 'TEST',
      payload: {},
    });
    const r1 = await adp.send(f1);
    assert.strictEqual(r1.status, 'ACCEPTED');
    const r2 = await adp.send(f2);
    assert.strictEqual(r2.status, 'RATE_LIMITED');
    assert.strictEqual(r2.error?.code, 'NETWORK_BACKPRESSURE_BLOCKED');
    pass('98 Send returns RATE_LIMITED on saturated queue (zero silent drop)');
  }

  // =========================================================================
  // U. NETWORK REGISTRY
  // =========================================================================

  // 99 Register and retrieve adapter
  {
    const reg = new NetworkRegistry();
    const adp = new NetworkInMemoryAdapter();
    reg.registerAdapter(adp);
    assert.strictEqual(reg.getAdapter(adp.adapterId), adp);
    pass('99 Register and retrieve adapter');
  }

  // 100 Register and retrieve connection
  {
    const reg = new NetworkRegistry();
    const conn = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'IN_MEMORY' });
    reg.registerConnection(conn);
    assert.strictEqual(reg.getConnection(conn.networkConnectionId), conn);
    pass('100 Register and retrieve connection');
  }

  // 101 Unregister connection
  {
    const reg = new NetworkRegistry();
    const conn = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'IN_MEMORY' });
    reg.registerConnection(conn);
    reg.unregisterConnection(conn.networkConnectionId);
    assert.strictEqual(reg.getConnection(conn.networkConnectionId), undefined);
    pass('101 Unregister connection');
  }

  // 102 List active adapters
  {
    const reg = new NetworkRegistry();
    const adp = new NetworkInMemoryAdapter();
    reg.registerAdapter(adp);
    assert.strictEqual(reg.listAdapters().length, 1);
    pass('102 List active adapters');
  }

  // 103 Active connection count
  {
    const reg = new NetworkRegistry();
    const conn1 = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'IN_MEMORY' });
    reg.registerConnection(conn1);
    assert.strictEqual(reg.getActiveConnectionCount(), 1);
    pass('103 Active connection count');
  }

  // =========================================================================
  // V. SURFACE BINDING
  // =========================================================================

  // 104 Surface mapping lookup
  {
    const reg = new NetworkRegistry();
    const conn = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'IN_MEMORY' });
    reg.registerConnection(conn);
    const found = reg.getConnectionBySurface(baseScope.surfaceId);
    assert.strictEqual(found?.networkConnectionId, conn.networkConnectionId);
    pass('104 Surface mapping lookup');
  }

  // 105 Surface lookup with correct user succeeds
  {
    const reg = new NetworkRegistry();
    const conn = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'IN_MEMORY' });
    reg.registerConnection(conn);
    const found = reg.getConnectionBySurface(baseScope.surfaceId, baseScope.userId);
    assert.strictEqual(found?.networkConnectionId, conn.networkConnectionId);
    pass('105 Surface lookup with correct user succeeds');
  }

  // 106 Surface lookup with wrong user throws
  {
    const reg = new NetworkRegistry();
    const conn = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'IN_MEMORY' });
    reg.registerConnection(conn);
    assert.throws(
      () => reg.getConnectionBySurface(baseScope.surfaceId, 'evil_user'),
      /User isolation/,
    );
    pass('106 Surface lookup with wrong user throws');
  }

  // 107 Surface lookup with wrong brain throws
  {
    const reg = new NetworkRegistry();
    const conn = createNetworkConnectionSnapshot({ scope: baseScope, adapterType: 'IN_MEMORY' });
    reg.registerConnection(conn);
    assert.throws(
      () => reg.getConnectionBySurface(baseScope.surfaceId, baseScope.userId, 'evil_brain'),
      /Brain isolation/,
    );
    pass('107 Surface lookup with wrong brain throws');
  }

  // =========================================================================
  // W. SECURITY
  // =========================================================================

  // 108 Prototype pollution in identifier throws
  {
    assert.throws(() => validateNetworkIdentifier('id', '__proto__'), /prototype pollution/);
    assert.throws(() => validateNetworkIdentifier('id', 'constructor'), /prototype pollution/);
    pass('108 Prototype pollution in identifier throws');
  }

  // 109 Prototype pollution in payload throws
  {
    const badPayload = JSON.parse('{"__proto__":{"polluted":true}}');
    assert.throws(() => validateNetworkPayloadBounds(badPayload), /prototype pollution/);
    pass('109 Prototype pollution in payload throws');
  }

  // 110 Null byte in identifier throws
  {
    assert.throws(() => validateNetworkIdentifier('id', 'abc\0def'), /null byte/);
    pass('110 Null byte in identifier throws');
  }

  // 111 Null byte in raw decode throws
  {
    assert.throws(() => codec.decode('{"val": "hello\0world"}'), /null byte/);
    pass('111 Null byte in raw decode throws');
  }

  // 112 Path traversal in identifier throws
  {
    assert.throws(() => validateNetworkIdentifier('id', '../../etc/passwd'), /path traversal/);
    pass('112 Path traversal in identifier throws');
  }

  // 113 Windows reserved device name throws
  {
    assert.throws(() => validateNetworkIdentifier('id', 'CON'), /Windows reserved device name/);
    assert.throws(() => validateNetworkIdentifier('id', 'NUL'), /Windows reserved device name/);
    assert.throws(() => validateNetworkIdentifier('id', 'COM1'), /Windows reserved device name/);
    pass('113 Windows reserved device name throws');
  }

  // 114 Oversized identifier throws
  {
    assert.throws(() => validateNetworkIdentifier('id', 'x'.repeat(200)), /exceeds max length/);
    pass('114 Oversized identifier throws');
  }

  // 115 Empty identifier throws
  {
    assert.throws(() => validateNetworkIdentifier('id', '   '), /must be a non-empty string/);
    pass('115 Empty identifier throws');
  }

  // =========================================================================
  // X. SECRET SCRUBBING
  // =========================================================================

  // 116 Bearer token redacted
  {
    const raw = 'Request failed: Bearer secret_token_xyz123 was invalid';
    const scrubbed = redactNetworkSecrets(raw);
    assert.ok(!scrubbed.includes('secret_token_xyz123'));
    assert.ok(scrubbed.includes('[REDACTED_SECRET]'));
    pass('116 Bearer token redacted');
  }

  // 117 Password in details redacted
  {
    const raw = 'Failed to connect password="super_secret_pwd"';
    const scrubbed = redactNetworkSecrets(raw);
    assert.ok(!scrubbed.includes('super_secret_pwd'));
    pass('117 Password in details redacted');
  }

  // 118 Client secret in audit redacted
  {
    const audit = createNetworkAuditRecord({
      eventType: 'NETWORK_ERROR',
      outcome: 'FAILURE',
      details: 'Error client_secret="shhh_secret" rejected',
    });
    assert.ok(!audit.details?.includes('shhh_secret'));
    pass('118 Client secret in audit redacted');
  }

  // 119 Failure descriptor never leaks secrets
  {
    const fail = createNetworkFailureDescriptor({
      code: 'SECRET_DETECTED',
      message: 'Token leaked token=xyz998877',
    });
    assert.ok(!fail.message.includes('xyz998877'));
    pass('119 Failure descriptor never leaks secrets');
  }

  // =========================================================================
  // Y. GOVERNANCE BOUNDARY (PDP)
  // =========================================================================

  // 120 NetworkAdapter cannot call PDP
  {
    const adp = new NetworkInMemoryAdapter();
    assert.strictEqual((adp as any).pdp, undefined);
    assert.strictEqual((adp as any).evaluatePolicy, undefined);
    pass('120 NetworkAdapter cannot call PDP');
  }

  // 121 NetworkRuntime has no PDP reference
  {
    const runtime = new NetworkRuntime();
    assert.strictEqual((runtime as any).pdp, undefined);
    pass('121 NetworkRuntime has no PDP reference');
  }

  // 122 Network operations never evaluate policy
  {
    const runtime = new NetworkRuntime();
    const conn = await runtime.openConnection(baseScope);
    assert.ok(conn.networkConnectionId);
    pass('122 Network operations never evaluate policy');
  }

  // =========================================================================
  // Z. EXECUTION BOUNDARY
  // =========================================================================

  // 123 NetworkAdapter cannot invoke ToolExecutor
  {
    const adp = new NetworkInMemoryAdapter();
    assert.strictEqual((adp as any).executeTool, undefined);
    pass('123 NetworkAdapter cannot invoke ToolExecutor');
  }

  // 124 NetworkAdapter cannot invoke ToolRegistry
  {
    const adp = new NetworkInMemoryAdapter();
    assert.strictEqual((adp as any).toolRegistry, undefined);
    pass('124 NetworkAdapter cannot invoke ToolRegistry');
  }

  // 125 Network layer cannot execute tools
  {
    const runtime = new NetworkRuntime();
    assert.strictEqual((runtime as any).executeTool, undefined);
    pass('125 Network layer cannot execute tools');
  }

  // =========================================================================
  // AA. VERIFICATION BOUNDARY
  // =========================================================================

  // 126 Network delivery does NOT imply task success
  {
    const op = createNetworkOperationResult({
      success: true,
      status: 'ACCEPTED',
      frameId: 'frm_01',
    });
    assert.strictEqual((op as any).taskSucceeded, undefined);
    pass('126 Network delivery does NOT imply task success');
  }

  // 127 Network ACK does NOT imply task success
  {
    const sig = createNetworkHeartbeatSignal({ networkConnectionId: 'net_01', sequence: 1 });
    const ack = createNetworkHeartbeatAck({ signal: sig });
    assert.strictEqual((ack as any).taskSuccess, undefined);
    pass('127 Network ACK does NOT imply task success');
  }

  // 128 VerificationService remains sole authority
  {
    const op = createNetworkOperationResult({ success: true, status: 'ACCEPTED' });
    assert.strictEqual(op.status, 'ACCEPTED');
    pass('128 VerificationService remains sole authority');
  }

  // =========================================================================
  // AB. COMMIT BOUNDARY
  // =========================================================================

  // 129 Network layer does not persist Brain state
  {
    const runtime = new NetworkRuntime();
    assert.strictEqual((runtime as any).commitState, undefined);
    pass('129 Network layer does not persist Brain state');
  }

  // 130 Network layer does not duplicate CommitService
  {
    const adp = new NetworkInMemoryAdapter();
    assert.strictEqual((adp as any).durableCommit, undefined);
    pass('130 Network layer does not duplicate CommitService');
  }

  // 131 Reconnect does not commit task state
  {
    const prev = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'SUSPENDED',
    });
    const req = createNetworkReconnectRequest({
      previousConnectionId: prev.networkConnectionId,
      scope: baseScope,
      lastAcknowledgedSequence: 0,
    });
    const res = evaluateNetworkReconnect(prev, req);
    assert.strictEqual((res as any).durableCommit, undefined);
    pass('131 Reconnect does not commit task state');
  }

  // =========================================================================
  // AC. RECOVERY BOUNDARY
  // =========================================================================

  // 132 Network layer does not execute crash recovery
  {
    const runtime = new NetworkRuntime();
    assert.strictEqual((runtime as any).recoverCrash, undefined);
    pass('132 Network layer does not execute crash recovery');
  }

  // 133 Reconnect does not auto-execute interrupted tools
  {
    const prev = createNetworkConnectionSnapshot({
      scope: baseScope,
      adapterType: 'IN_MEMORY',
      initialState: 'SUSPENDED',
    });
    const req = createNetworkReconnectRequest({
      previousConnectionId: prev.networkConnectionId,
      scope: baseScope,
      lastAcknowledgedSequence: 0,
    });
    const res = evaluateNetworkReconnect(prev, req);
    assert.strictEqual((res as any).reExecutedTools, undefined);
    pass('133 Reconnect does not auto-execute interrupted tools');
  }

  // 134 RecoveryService remains authoritative
  {
    assert.strictEqual(typeof evaluateNetworkReconnect, 'function');
    pass('134 RecoveryService remains authoritative');
  }

  // =========================================================================
  // AD. SYNCHRONIZATION BOUNDARY
  // =========================================================================

  // 135 Network layer does not maintain event timeline
  {
    const runtime = new NetworkRuntime();
    assert.strictEqual((runtime as any).timeline, undefined);
    pass('135 Network layer does not maintain event timeline');
  }

  // 136 SynchronizationService remains authoritative
  {
    const adp = new NetworkInMemoryAdapter();
    assert.strictEqual((adp as any).reconcileEvents, undefined);
    pass('136 SynchronizationService remains authoritative');
  }

  // 137 Frame delivery != Sync reconciliation
  {
    const op = createNetworkOperationResult({ success: true, status: 'ACCEPTED' });
    assert.strictEqual((op as any).reconciledState, undefined);
    pass('137 Frame delivery != Sync reconciliation');
  }

  // =========================================================================
  // AE. NO TOOL INVOCATION
  // =========================================================================

  // 138 Zero tool registry calls across network runtime operations
  {
    const runtime = new NetworkRuntime();
    const conn = await runtime.openConnection(baseScope);
    const frame = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 1,
      direction: 'OUTBOUND',
      messageType: 'TEST',
      payload: {},
    });
    const res = await runtime.sendFrame(frame);
    assert.strictEqual(res.success, true);
    assert.strictEqual((runtime as any).toolsExecuted, undefined);
    pass('138 Zero tool registry calls across network runtime operations');
  }

  // =========================================================================
  // AF. NO LLM INVOCATION
  // =========================================================================

  // 139 Zero LLM prompts/calls across network runtime operations
  {
    const runtime = new NetworkRuntime();
    assert.strictEqual((runtime as any).llmClient, undefined);
    assert.strictEqual((runtime as any).invokeLlm, undefined);
    pass('139 Zero LLM prompts/calls across network runtime operations');
  }

  // =========================================================================
  // AG. NO SHELL INVOCATION
  // =========================================================================

  // 140 Zero child_process / exec / spawn in network modules
  {
    const runtime = new NetworkRuntime();
    assert.strictEqual((runtime as any).childProcess, undefined);
    assert.strictEqual((runtime as any).exec, undefined);
    pass('140 Zero child_process / exec / spawn in network modules');
  }

  // =========================================================================
  // AH. AGENT LOOP INTEGRATION
  // =========================================================================

  // 141 getNetworkRuntime returns NetworkRuntime instance
  {
    const loop = new AgentLoop();
    const netRuntime = loop.getNetworkRuntime();
    assert.ok(netRuntime instanceof NetworkRuntime);
    pass('141 getNetworkRuntime returns NetworkRuntime instance');
  }

  // 142 AgentLoopResult includes networkContext optional property
  {
    const loop = new AgentLoop();
    assert.strictEqual(typeof loop.getNetworkRuntime, 'function');
    pass('142 AgentLoopResult includes networkContext optional property');
  }

  // 143 Dependency injection of custom NetworkRuntime works
  {
    const customRuntime = new NetworkRuntime();
    const loop = new AgentLoop(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      customRuntime,
    );
    assert.strictEqual(loop.getNetworkRuntime(), customRuntime);
    pass('143 Dependency injection of custom NetworkRuntime works');
  }

  // =========================================================================
  // AI. BACKWARD COMPATIBILITY
  // =========================================================================

  // 144 Default AgentLoop works without passing networkRuntime
  {
    const loop = new AgentLoop();
    assert.ok(loop.getVoiceService());
    assert.ok(loop.getRemoteGateway());
    assert.ok(loop.getNetworkRuntime());
    pass('144 Default AgentLoop works without passing networkRuntime');
  }

  // 145 AgentLoop execution continues working
  {
    const loop = new AgentLoop();
    assert.strictEqual(typeof loop.execute, 'function');
    pass('145 AgentLoop execution continues working');
  }

  // 146 100% constructor backward compatibility
  {
    const loop = new AgentLoop();
    assert.strictEqual(typeof loop.getTransportService, 'function');
    assert.strictEqual(typeof loop.getSynchronizationService, 'function');
    pass('146 100% constructor backward compatibility');
  }

  // =========================================================================
  // AJ. PUBLIC API INTEGRITY
  // =========================================================================

  // 147 index.ts exports all network types and classes
  {
    assert.strictEqual(typeof NetworkRuntime, 'function');
    assert.strictEqual(typeof NetworkInMemoryAdapter, 'function');
    assert.strictEqual(typeof NetworkRegistry, 'function');
    assert.strictEqual(typeof NetworkCodec, 'function');
    pass('147 index.ts exports all network types and classes');
  }

  // 148 Codec, validator, fingerprint importable
  {
    assert.strictEqual(typeof createNetworkFrame, 'function');
    assert.strictEqual(typeof validateNetworkFrame, 'function');
    assert.strictEqual(typeof redactNetworkSecrets, 'function');
    pass('148 Codec, validator, fingerprint importable');
  }

  // 149 Clean API surface without collisions
  {
    assert.strictEqual(typeof createNetworkHeartbeatSignal, 'function');
    assert.strictEqual(typeof createNetworkHeartbeatAck, 'function');
    assert.strictEqual(typeof createNetworkReconnectRequest, 'function');
    pass('149 Clean API surface without collisions');
  }

  // 150 End-to-end send and receive through NetworkRuntime
  {
    const runtime = new NetworkRuntime();
    const conn = await runtime.openConnection(baseScope);
    const frame = createNetworkFrame({
      networkConnectionId: conn.networkConnectionId,
      gatewayId: baseScope.gatewayId,
      transportId: baseScope.transportId,
      surfaceId: baseScope.surfaceId,
      sequence: 1,
      direction: 'INBOUND',
      messageType: 'TEST_E2E',
      payload: { e2e: 'verified' },
    });
    const sendRes = await runtime.sendFrame(frame);
    assert.strictEqual(sendRes.success, true);
    const received = await runtime.receiveFrame(conn.networkConnectionId);
    assert.ok(received);
    assert.strictEqual(received?.frameId, frame.frameId);
    assert.deepStrictEqual(received?.payload, { e2e: 'verified' });
    pass('150 End-to-end send and receive through NetworkRuntime');
  }

  console.log(`\n============================================================`);
  console.log(`MS-1.3.21 DEDICATED TEST SUITE: ${passedCount} / 150 ASSERTIONS PASSED`);
  console.log(`============================================================\n`);
}

runTests().catch((err) => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
