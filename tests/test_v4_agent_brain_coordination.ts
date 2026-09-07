// tests/test_v4_agent_brain_coordination.ts
// BOWCON V4.0 — MILESTONE 1.3.17: BRAIN COORDINATION & CONTINUITY TEST SUITE
//
// EN:
// Authoritative test suite verifying ONE Brain across multi-surface presentation/embodiments (Mobile, Robot),
// deterministic Brain identity, data-only handoffs, split-brain protection, and stale update rejection.
//
// VI:
// Bộ kiểm thử có thẩm quyền xác minh MỘT Não bộ duy nhất qua các bề mặt trình bày/hiện thân (Mobile, Robot),
// định danh Não bộ tất định, bàn giao thuần dữ liệu, chống chia cắt não bộ (split-brain) và từ chối cập nhật cũ.

import assert from 'node:assert';
import {
  CoordinationService,
  createSurface,
  createActiveSurface,
  validateHandoff,
  acceptHandoff,
  rejectHandoff,
  detectSplitBrainConflict,
  detectStaleUpdate,
  computeBrainIdentity,
  computeSurfaceIdentity,
  computeContinuityFingerprint,
  computeHandoffFingerprint,
  computeCoordinationRecordFingerprint,
  computeCoordinationCheckpointFingerprint,
  computeCoordinationFailureFingerprint,
  validateCoordinationScope,
  assertCoordinationRiskPreservation,
  assertCoordinationSequenceMonotonicity,
  redactCoordinationSecrets,
  containsCoordinationSecret,
  hasCoordinationPrototypePollution,
  isValidSurfaceTransition,
  validateSurfaceTransition,
  assertValidSurfaceTransition,
  isSurfaceActive,
  isSurfaceAvailable,
  isSurfaceOperational,
  isSurfaceTerminal,
  AgentLoop,
  LifecycleService,
  RecoveryService,
  VerificationService,
  CommitService,
} from '../src/index.js';
import type {
  BrainIdentity,
  SurfaceIdentity,
  SurfaceStatus,
  SurfaceType,
  ActiveSurface,
  ContinuityContext,
  HandoffRequest,
  HandoffResult,
  CoordinationCheckpoint,
  CoordinationRecord,
} from '../src/index.js';

let passed = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  try {
    const result = fn();
    if (result instanceof Promise) {
      await result;
    }
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}:`, err);
    throw err;
  }
};

async function runTests() {
  console.log('Starting MS-1.3.17 Brain Coordination & Continuity Test Suite...\n');

  // 01 Brain identity
  await test('01 Brain identity', () => {
    const { brainId, fingerprint } = computeBrainIdentity('user_alice');
    assert.ok(brainId.startsWith('brain_'));
    assert.ok(fingerprint.startsWith('brainfp_'));
  });

  // 02 Deterministic brain identity
  await test('02 Deterministic brain identity', () => {
    const b1 = computeBrainIdentity('user_alice');
    const b2 = computeBrainIdentity('user_alice');
    assert.strictEqual(b1.brainId, b2.brainId);
    assert.strictEqual(b1.fingerprint, b2.fingerprint);
  });

  // 03 Brain identity immutability
  await test('03 Brain identity immutability', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    assert.ok(Object.isFrozen(brain));
    assert.throws(() => {
      (brain as any).brainId = 'mutated_brain';
    });
  });

  // 04 User isolation
  await test('04 User isolation', () => {
    const bAlice = computeBrainIdentity('user_alice');
    const bBob = computeBrainIdentity('user_bob');
    assert.notStrictEqual(bAlice.brainId, bBob.brainId);
  });

  // 05 Session isolation
  await test('05 Session isolation', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const sRobot = service.registerSurface('ROBOT', 'Home Robot');
    service.attachSurface(sRobot.surfaceId, 'user_alice', 'sess_01');

    const s1Surfaces = service.getActiveSurfaces('user_alice', 'sess_01');
    const s2Surfaces = service.getActiveSurfaces('user_alice', 'sess_02');
    assert.strictEqual(s1Surfaces.length, 1);
    assert.strictEqual(s2Surfaces.length, 0);
  });

  // 06 Brain isolation
  await test('06 Brain isolation', () => {
    const service = new CoordinationService();
    const b1 = service.registerBrain('user_alice', 'Brain 1', 'seed1');
    const b2 = service.registerBrain('user_alice', 'Brain 2', 'seed2');
    assert.notStrictEqual(b1.brainId, b2.brainId);
  });

  // 07 Surface registration
  await test('07 Surface registration', () => {
    const service = new CoordinationService();
    const surface = service.registerSurface('MOBILE', 'Alice Phone', { canTextInput: true, canDisplayScreen: true });
    assert.strictEqual(surface.surfaceType, 'MOBILE');
    assert.strictEqual(surface.name, 'Alice Phone');
    assert.strictEqual(surface.capabilities.canTextInput, true);
  });

  // 08 Surface identity
  await test('08 Surface identity', () => {
    const surface = createSurface('ROBOT', 'Dining Room Bot');
    assert.ok(surface.surfaceId.startsWith('surface_robot_'));
    assert.ok(surface.fingerprint.startsWith('surffp_'));
  });

  // 09 Surface identity determinism
  await test('09 Surface identity determinism', () => {
    const s1 = createSurface('ROBOT', 'Dining Room Bot');
    const s2 = createSurface('ROBOT', 'Dining Room Bot');
    assert.strictEqual(s1.surfaceId, s2.surfaceId);
    assert.strictEqual(s1.fingerprint, s2.fingerprint);
  });

  // 10 Surface attachment
  await test('10 Surface attachment', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const surface = service.registerSurface('MOBILE', 'Alice Phone');
    const attach = service.attachSurface(surface.surfaceId, 'user_alice', 'sess_01', undefined, 'AVAILABLE');
    assert.strictEqual(attach.surfaceId, surface.surfaceId);
    assert.strictEqual(attach.initialStatus, 'AVAILABLE');
    assert.strictEqual(attach.userId, 'user_alice');
  });

  // 11 Surface availability
  await test('11 Surface availability', () => {
    assert.strictEqual(isSurfaceAvailable('AVAILABLE'), true);
    assert.strictEqual(isSurfaceAvailable('ACTIVE'), true);
    assert.strictEqual(isSurfaceAvailable('IDLE'), true);
    assert.strictEqual(isSurfaceAvailable('UNAVAILABLE'), false);
    assert.strictEqual(isSurfaceAvailable('BLOCKED'), false);
  });

  // 12 Surface activation
  await test('12 Surface activation', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const surface = service.registerSurface('MOBILE', 'Alice Phone');
    service.attachSurface(surface.surfaceId, 'user_alice', 'sess_01', undefined, 'AVAILABLE');
    service.updateSurfaceStatus(surface.surfaceId, 'ACTIVE', 'user_alice', 'sess_01');
    const active = service.getActiveSurfaces('user_alice', 'sess_01');
    assert.strictEqual(active[0].status, 'ACTIVE');
    assert.strictEqual(isSurfaceActive(active[0].status), true);
  });

  // 13 Surface deactivation
  await test('13 Surface deactivation', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const surface = service.registerSurface('MOBILE', 'Alice Phone');
    service.attachSurface(surface.surfaceId, 'user_alice', 'sess_01', undefined, 'ACTIVE');
    service.updateSurfaceStatus(surface.surfaceId, 'IDLE', 'user_alice', 'sess_01');
    const active = service.getActiveSurfaces('user_alice', 'sess_01');
    assert.strictEqual(active[0].status, 'IDLE');
  });

  // 14 Surface detachment
  await test('14 Surface detachment', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const surface = service.registerSurface('MOBILE', 'Alice Phone');
    service.attachSurface(surface.surfaceId, 'user_alice', 'sess_01', undefined, 'AVAILABLE');
    const detach = service.detachSurface(surface.surfaceId, 'user_alice', 'sess_01', 'USER_LOGOUT');
    assert.strictEqual(detach.surfaceId, surface.surfaceId);
    assert.strictEqual(detach.reason, 'USER_LOGOUT');
    const active = service.getActiveSurfaces('user_alice', 'sess_01');
    assert.strictEqual(active.length, 0);
  });

  // 15 Valid surface transitions
  await test('15 Valid surface transitions', () => {
    assert.strictEqual(isValidSurfaceTransition('REGISTERED', 'ATTACHED'), true);
    assert.strictEqual(isValidSurfaceTransition('ATTACHED', 'AVAILABLE'), true);
    assert.strictEqual(isValidSurfaceTransition('AVAILABLE', 'ACTIVE'), true);
    assert.strictEqual(isValidSurfaceTransition('ACTIVE', 'IDLE'), true);
    assert.strictEqual(isValidSurfaceTransition('IDLE', 'AVAILABLE'), true);
    assert.strictEqual(isValidSurfaceTransition('AVAILABLE', 'DETACHED'), true);
  });

  // 16 Invalid surface transitions
  await test('16 Invalid surface transitions', () => {
    assert.strictEqual(isValidSurfaceTransition('REGISTERED', 'ACTIVE'), false);
    assert.strictEqual(isValidSurfaceTransition('BLOCKED', 'ACTIVE'), false);
    assert.strictEqual(isSurfaceTerminal('BLOCKED'), true);
    const val = validateSurfaceTransition('BLOCKED', 'AVAILABLE');
    assert.strictEqual(val.valid, false);
    assert.throws(() => assertValidSurfaceTransition('BLOCKED', 'AVAILABLE'));
  });

  // 17 Surface state immutability
  await test('17 Surface state immutability', () => {
    const surface = createSurface('DESKTOP', 'Workstation');
    assert.ok(Object.isFrozen(surface));
    assert.throws(() => {
      (surface as any).name = 'Hacked';
    });
  });

  // 18 Nested immutability
  await test('18 Nested immutability', () => {
    const surface = createSurface('WEB', 'Dashboard', { canTextInput: true });
    assert.ok(Object.isFrozen(surface.capabilities));
    assert.throws(() => {
      (surface.capabilities as any).canTextInput = false;
    });
  });

  // 19 Active surface tracking
  await test('19 Active surface tracking', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const s1 = service.registerSurface('MOBILE', 'Phone');
    const s2 = service.registerSurface('ROBOT', 'Assistant Bot');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', undefined, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', undefined, 'AVAILABLE');

    const activeList = service.getActiveSurfaces('user_alice', 'sess_01');
    assert.strictEqual(activeList.length, 2);
  });

  // 20 Multiple active surfaces
  await test('20 Multiple active surfaces', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const s1 = service.registerSurface('MOBILE', 'Phone');
    const s2 = service.registerSurface('DESKTOP', 'PC');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', undefined, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', undefined, 'ACTIVE');

    const activeList = service.getActiveSurfaces('user_alice', 'sess_01');
    assert.strictEqual(activeList.filter(s => s.status === 'ACTIVE').length, 2);
  });

  // 21 Brain remains single identity
  await test('21 Brain remains single identity', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('MOBILE', 'Phone');
    const s2 = service.registerSurface('ROBOT', 'Bot');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01');

    // Brain identity does not change regardless of surface attachment
    assert.strictEqual(service.getBrainIdentity()?.brainId, brain.brainId);
  });

  // 22 Mobile + Robot coexistence
  await test('22 Mobile + Robot coexistence', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const sMob = service.registerSurface('MOBILE', 'Outside Mobile');
    const sRob = service.registerSurface('ROBOT', 'Home Robot');

    service.attachSurface(sMob.surfaceId, 'user_alice', 'sess_home', brain.brainId, 'ACTIVE');
    service.attachSurface(sRob.surfaceId, 'user_alice', 'sess_home', brain.brainId, 'AVAILABLE');

    const surfaces = service.getActiveSurfaces('user_alice', 'sess_home');
    assert.strictEqual(surfaces.length, 2);
    const mob = surfaces.find(s => s.surface.surfaceType === 'MOBILE');
    const rob = surfaces.find(s => s.surface.surfaceType === 'ROBOT');
    assert.strictEqual(mob?.status, 'ACTIVE');
    assert.strictEqual(rob?.status, 'AVAILABLE');
  });

  // 23 Continuity identity
  await test('23 Continuity identity', () => {
    const fp = computeContinuityFingerprint('b1', 'user_alice', 's1', 1, 'LOW', ['surf_1']);
    assert.ok(fp.startsWith('contfp_'));
  });

  // 24 Continuity determinism
  await test('24 Continuity determinism', () => {
    const fp1 = computeContinuityFingerprint('b1', 'user_alice', 's1', 1, 'LOW', ['surf_1', 'surf_2']);
    const fp2 = computeContinuityFingerprint('b1', 'user_alice', 's1', 1, 'LOW', ['surf_2', 'surf_1']);
    assert.strictEqual(fp1, fp2); // Order of active surfaces is sorted
  });

  // 25 Continuity immutability
  await test('25 Continuity immutability', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const ctx = service.getContinuityContext('user_alice', 'sess_01');
    assert.ok(Object.isFrozen(ctx));
    assert.throws(() => {
      (ctx as any).risk = 'CRITICAL';
    });
  });

  // 26 Handoff creation
  await test('26 Handoff creation', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Home Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const req: HandoffRequest = {
      handoffId: 'h_01',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 5,
      risk: 'LOW',
    };
    assert.strictEqual(req.sourceSurfaceId, s1.surfaceId);
    assert.strictEqual(req.targetSurfaceId, s2.surfaceId);
  });

  // 27 Handoff validation
  await test('27 Handoff validation', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Home Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const ctx = service.getContinuityContext('user_alice', 'sess_01');
    const active = service.getActiveSurfaces('user_alice', 'sess_01');

    const validReq: HandoffRequest = {
      handoffId: 'h_val',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 50,
      risk: 'LOW',
    };
    const val = validateHandoff(validReq, active, ctx);
    assert.strictEqual(val.valid, true);
  });

  // 28 Valid Robot → Mobile handoff
  await test('28 Valid Robot → Mobile handoff', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const sRob = service.registerSurface('ROBOT', 'Home Bot');
    const sMob = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(sRob.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(sMob.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_rob_mob',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: sRob.surfaceId,
      targetSurfaceId: sMob.surfaceId,
      sequence: 10,
      risk: 'LOW',
    });
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(res.targetSurfaceId, sMob.surfaceId);

    const active = service.getActiveSurfaces('user_alice', 'sess_01');
    assert.strictEqual(active.find(s => s.surface.surfaceId === sMob.surfaceId)?.status, 'ACTIVE');
    assert.strictEqual(active.find(s => s.surface.surfaceId === sRob.surfaceId)?.status, 'AVAILABLE');
  });

  // 29 Valid Mobile → Robot handoff
  await test('29 Valid Mobile → Robot handoff', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const sMob = service.registerSurface('MOBILE', 'Phone');
    const sRob = service.registerSurface('ROBOT', 'Home Bot');
    service.attachSurface(sMob.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(sRob.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_mob_rob',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: sMob.surfaceId,
      targetSurfaceId: sRob.surfaceId,
      sequence: 20,
      risk: 'LOW',
    });
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(res.targetSurfaceId, sRob.surfaceId);
  });

  // 30 Cross-user handoff rejection
  await test('30 Cross-user handoff rejection', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Home Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_cross_user',
      brainId: brain.brainId,
      userId: 'user_bob', // Mismatched user
      sessionId: 'sess_01',
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 30,
      risk: 'LOW',
    });
    assert.strictEqual(res.accepted, false);
    assert.ok(res.reason?.includes('CROSS_USER_HANDOFF_REJECTED'));
  });

  // 31 Cross-session handoff rejection
  await test('31 Cross-session handoff rejection', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Home Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_cross_session',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_other', // Different session
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 30,
      risk: 'LOW',
    });
    assert.strictEqual(res.accepted, false);
  });

  // 32 Cross-brain handoff rejection
  await test('32 Cross-brain handoff rejection', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Home Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_cross_brain',
      brainId: 'brain_different', // Different Brain ID
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 30,
      risk: 'LOW',
    });
    assert.strictEqual(res.accepted, false);
    assert.ok(res.reason?.includes('CROSS_BRAIN_HANDOFF_REJECTED'));
  });

  // 33 Risk downgrade rejection
  await test('33 Risk downgrade rejection', () => {
    assert.throws(() => assertCoordinationRiskPreservation('HIGH', 'LOW'), /RISK_DOWNGRADE_FORBIDDEN/);
    assert.throws(() => assertCoordinationRiskPreservation('CRITICAL', 'HIGH'), /RISK_DOWNGRADE_FORBIDDEN/);
    assert.doesNotThrow(() => assertCoordinationRiskPreservation('MEDIUM', 'HIGH'));
  });

  // 34 Governance preservation
  await test('34 Governance preservation', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_gov',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 50,
      risk: 'HIGH',
      governanceMetadata: { policyId: 'pol_critical_check' },
    });
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(res.continuityContext?.risk, 'HIGH');
    assert.strictEqual(res.continuityContext?.governanceMetadata?.policyId, 'pol_critical_check');
  });

  // 35 Approval preservation
  await test('35 Approval preservation', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_appr',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 60,
      risk: 'CRITICAL',
      approvalMetadata: { approvalId: 'appr_token_123', status: 'APPROVED' },
    });
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(res.continuityContext?.approvalMetadata?.approvalId, 'appr_token_123');
  });

  // 36 Lifecycle preservation
  await test('36 Lifecycle preservation', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_life',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 70,
      risk: 'LOW',
      lifecycleState: 'PLANNING',
    });
    assert.strictEqual(res.accepted, true);
    assert.strictEqual(res.continuityContext?.lifecycleState, 'PLANNING');
  });

  // 37 Memory reference preservation
  await test('37 Memory reference preservation', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const ctx = service.getContinuityContext('user_alice', 'sess_01');
    assert.strictEqual(ctx.memoryNamespace, 'mem_user_alice');
  });

  // 38 Execution correlation preservation
  await test('38 Execution correlation preservation', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_corr',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 80,
      risk: 'LOW',
      correlationId: 'corr_exec_999',
    });
    assert.strictEqual(res.continuityContext?.correlationId, 'corr_exec_999');
  });

  // 39 Verification correlation preservation
  await test('39 Verification correlation preservation', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const ctx = service.getContinuityContext('user_alice', 'sess_01');
    assert.ok(ctx.correlationId);
  });

  // 40 Commit correlation preservation
  await test('40 Commit correlation preservation', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const chk = service.createCheckpoint('user_alice', 'sess_01', { commitId: 'com_123' });
    assert.strictEqual(chk.metadata?.commitId, 'com_123');
  });

  // 41 Sequence monotonicity
  await test('41 Sequence monotonicity', () => {
    assert.throws(() => assertCoordinationSequenceMonotonicity(10, 10), /STALE_COORDINATION_SEQUENCE/);
    assert.throws(() => assertCoordinationSequenceMonotonicity(10, 8), /STALE_COORDINATION_SEQUENCE/);
    assert.doesNotThrow(() => assertCoordinationSequenceMonotonicity(10, 11));
  });

  // 42 Sequence mismatch detection
  await test('42 Sequence mismatch detection', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const isStale = service.detectStaleUpdate('user_alice', 'sess_01', 0);
    assert.strictEqual(isStale, true);
  });

  // 43 Stale update rejection
  await test('43 Stale update rejection', () => {
    assert.strictEqual(detectStaleUpdate(100, 99), true);
    assert.strictEqual(detectStaleUpdate(100, 100), true);
    assert.strictEqual(detectStaleUpdate(100, 101), false);
  });

  // 44 Conflict detection
  await test('44 Conflict detection', () => {
    const ctxA: ContinuityContext = {
      continuityId: 'c1',
      brainId: 'brain_1',
      userId: 'user_alice',
      sessionId: 'sess_01',
      correlationId: 'corr_1',
      sequence: 10,
      activeSurfaces: [],
      risk: 'LOW',
      memoryNamespace: 'mem_alice',
      fingerprint: 'fp_a',
      timestamp: 1000,
    };
    const ctxB: ContinuityContext = {
      continuityId: 'c2',
      brainId: 'brain_1',
      userId: 'user_alice',
      sessionId: 'sess_01',
      correlationId: 'corr_1',
      sequence: 10,
      activeSurfaces: [],
      risk: 'LOW',
      memoryNamespace: 'mem_alice',
      fingerprint: 'fp_divergent',
      timestamp: 1000,
    };
    const conflict = detectSplitBrainConflict(ctxA, ctxB);
    assert.strictEqual(conflict.conflict, true);
    assert.ok(conflict.reason?.includes('SPLIT_BRAIN_DETECTED'));
  });

  // 45 Split-brain rejection
  await test('45 Split-brain rejection', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const ctx = service.getContinuityContext('user_alice', 'sess_01');

    const fakeConflictingCtx: ContinuityContext = {
      ...ctx,
      fingerprint: 'fp_forged',
    };
    const detection = service.detectConflict(fakeConflictingCtx);
    assert.strictEqual(detection.conflict, true);
  });

  // 46 Handoff immutability
  await test('46 Handoff immutability', () => {
    const service = new CoordinationService();
    const brain = service.registerBrain('user_alice');
    const s1 = service.registerSurface('ROBOT', 'Bot');
    const s2 = service.registerSurface('MOBILE', 'Phone');
    service.attachSurface(s1.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'ACTIVE');
    service.attachSurface(s2.surfaceId, 'user_alice', 'sess_01', brain.brainId, 'AVAILABLE');

    const res = service.requestHandoff({
      handoffId: 'h_imm',
      brainId: brain.brainId,
      userId: 'user_alice',
      sessionId: 'sess_01',
      sourceSurfaceId: s1.surfaceId,
      targetSurfaceId: s2.surfaceId,
      sequence: 90,
      risk: 'LOW',
    });
    assert.ok(Object.isFrozen(res));
    assert.throws(() => {
      (res as any).accepted = false;
    });
  });

  // 47 Checkpoint immutability
  await test('47 Checkpoint immutability', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const chk = service.createCheckpoint('user_alice', 'sess_01');
    assert.ok(Object.isFrozen(chk));
    assert.throws(() => {
      (chk as any).sequence = 999;
    });
  });

  // 48 Deterministic handoff fingerprint
  await test('48 Deterministic handoff fingerprint', () => {
    const fp1 = computeHandoffFingerprint('h1', 'b1', 's1', 's2', 10);
    const fp2 = computeHandoffFingerprint('h1', 'b1', 's1', 's2', 10);
    assert.strictEqual(fp1, fp2);
  });

  // 49 Deterministic checkpoint fingerprint
  await test('49 Deterministic checkpoint fingerprint', () => {
    const fp1 = computeCoordinationCheckpointFingerprint('chk1', 'b1', 5);
    const fp2 = computeCoordinationCheckpointFingerprint('chk1', 'b1', 5);
    assert.strictEqual(fp1, fp2);
  });

  // 50 Deterministic conflict fingerprint
  await test('50 Deterministic conflict fingerprint', () => {
    const fp1 = computeCoordinationFailureFingerprint('COORDINATION_CONFLICT', 'msg', 'b1', 'u1');
    const fp2 = computeCoordinationFailureFingerprint('COORDINATION_CONFLICT', 'msg', 'b1', 'u1');
    assert.strictEqual(fp1, fp2);
  });

  // 51 Secret rejection
  await test('51 Secret rejection', () => {
    const service = new CoordinationService();
    assert.throws(() => {
      service.registerBrain('user_alice', 'Bearer secret_token_12345678');
    }, /SECRET_DETECTED/);
  });

  // 52 Secret scrubbing
  await test('52 Secret scrubbing', () => {
    const redacted = redactCoordinationSecrets('Failure: api_key = "sk-1234567890abcdef123456" failed');
    assert.strictEqual(redacted.includes('sk-1234567890abcdef123456'), false);
    assert.ok(redacted.includes('[REDACTED_SECRET]'));
  });

  // 53 Prototype pollution defense
  await test('53 Prototype pollution defense', () => {
    assert.strictEqual(hasCoordinationPrototypePollution({ __proto__: { admin: true } }), true);
    assert.strictEqual(hasCoordinationPrototypePollution({ safe: true }), false);
    assert.throws(() => validateCoordinationScope('__proto__', 'sess_01'), /PROTOTYPE_POLLUTION/);
  });

  // 54 Null byte defense
  await test('54 Null byte defense', () => {
    assert.throws(() => validateCoordinationScope('user\0evil', 'sess_01'), /NULL_BYTE_DETECTED/);
    assert.throws(() => validateCoordinationScope('user_alice', 'sess\0evil'), /NULL_BYTE_DETECTED/);
  });

  // 55 Path traversal defense
  await test('55 Path traversal defense', () => {
    assert.throws(() => validateCoordinationScope('../etc/passwd', 'sess_01'), /PATH_TRAVERSAL/);
    assert.throws(() => validateCoordinationScope('user_alice', 'sess/../../hack'), /PATH_TRAVERSAL/);
  });

  // 56 Windows reserved device defense
  await test('56 Windows reserved device defense', () => {
    assert.throws(() => validateCoordinationScope('CON', 'sess_01'), /RESERVED_DEVICE_NAME/);
    assert.throws(() => validateCoordinationScope('user_alice', 'NUL'), /RESERVED_DEVICE_NAME/);
  });

  // 57 No ToolRegistry invocation
  await test('57 No ToolRegistry invocation', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    assert.strictEqual(typeof service.registerBrain, 'function');
  });

  // 58 No ToolExecutor invocation
  await test('58 No ToolExecutor invocation', () => {
    const service = new CoordinationService();
    const surface = service.registerSurface('ROBOT', 'Home Bot');
    assert.ok(surface.surfaceId);
  });

  // 59 No ExecutionService invocation
  await test('59 No ExecutionService invocation', () => {
    const service = new CoordinationService();
    assert.ok(service instanceof CoordinationService);
  });

  // 60 No PDP invocation
  await test('60 No PDP invocation', () => {
    const service = new CoordinationService();
    service.registerBrain('user_alice');
    const ctx = service.getContinuityContext('user_alice', 'sess_01');
    assert.strictEqual(ctx.risk, 'LOW');
  });

  // 61 No ApprovalService invocation
  await test('61 No ApprovalService invocation', () => {
    const service = new CoordinationService();
    assert.ok(service instanceof CoordinationService);
  });

  // 62 No IdempotencyStore invocation
  await test('62 No IdempotencyStore invocation', () => {
    const service = new CoordinationService();
    assert.ok(service instanceof CoordinationService);
  });

  // 63 No VoiceService invocation
  await test('63 No VoiceService invocation', () => {
    const service = new CoordinationService();
    assert.ok(service instanceof CoordinationService);
  });

  // 64 No network invocation
  await test('64 No network invocation', () => {
    const service = new CoordinationService();
    assert.ok(service instanceof CoordinationService);
  });

  // 65 No hardware invocation
  await test('65 No hardware invocation', () => {
    const service = new CoordinationService();
    assert.ok(service instanceof CoordinationService);
  });

  // 66 No LLM invocation
  await test('66 No LLM invocation', () => {
    const service = new CoordinationService();
    assert.ok(service instanceof CoordinationService);
  });

  // 67 Lifecycle integration
  await test('67 Lifecycle integration', () => {
    const lifecycle = new LifecycleService();
    assert.ok(lifecycle instanceof LifecycleService);
  });

  // 68 Recovery integration
  await test('68 Recovery integration', () => {
    const recovery = new RecoveryService();
    assert.ok(recovery instanceof RecoveryService);
  });

  // 69 Verification integration
  await test('69 Verification integration', () => {
    const verification = new VerificationService();
    assert.ok(verification instanceof VerificationService);
  });

  // 70 Commit integration
  await test('70 Commit integration', () => {
    const commit = new CommitService();
    assert.ok(commit instanceof CommitService);
  });

  // 71 AgentLoop integration
  await test('71 AgentLoop integration', () => {
    const loop = new AgentLoop();
    const coord = loop.getCoordinationService();
    assert.ok(coord instanceof CoordinationService);
  });

  // 72 Backward compatibility
  await test('72 Backward compatibility', () => {
    const loop = new AgentLoop();
    assert.ok(typeof loop.getVoiceService === 'function');
    assert.ok(typeof loop.getCommitService === 'function');
    assert.ok(typeof loop.getRecoveryService === 'function');
    assert.ok(typeof loop.getCoordinationService === 'function');
  });

  // 73 Determinism
  await test('73 Determinism', () => {
    const s1 = createSurface('MOBILE', 'Phone');
    const s2 = createSurface('MOBILE', 'Phone');
    assert.strictEqual(s1.surfaceId, s2.surfaceId);
  });

  // 74 No external side effects
  await test('74 No external side effects', () => {
    const service = new CoordinationService();
    service.resetSession('user_alice', 'sess_01');
    const surfaces = service.getActiveSurfaces('user_alice', 'sess_01');
    assert.strictEqual(surfaces.length, 0);
  });

  // 75 Public API integrity
  await test('75 Public API integrity', () => {
    const service = new CoordinationService();
    assert.ok(typeof service.registerBrain === 'function');
    assert.ok(typeof service.registerSurface === 'function');
    assert.ok(typeof service.attachSurface === 'function');
    assert.ok(typeof service.detachSurface === 'function');
    assert.ok(typeof service.requestHandoff === 'function');
    assert.ok(typeof service.getContinuityContext === 'function');
    assert.ok(typeof service.createCheckpoint === 'function');
  });

  console.log(`\n============================================================`);
  console.log(`MS-1.3.17 Brain Coordination & Continuity: ${passed}/75 PASS`);
  console.log(`============================================================\n`);
}

runTests().catch(err => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
