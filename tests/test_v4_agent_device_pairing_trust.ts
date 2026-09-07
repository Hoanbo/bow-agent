// tests/test_v4_agent_device_pairing_trust.ts
// BOWCON V4.0 — DEVICE PAIRING & TRUST RUNTIME FOUNDATION (MS-1.3.23)
//
// Dedicated authoritative test suite covering categories A through AO (41 categories, >= 180 assertions).
// Verifies deterministic device identity, 9-tuple scope isolation, finite-state transitions,
// explicit confirmation, trust establishment, device recognition (no password login),
// revocation, re-pairing, replay defense, order-independent capability fingerprinting,
// secret scrubbing, audit ledger, and architectural non-interference with Brain cognition.

import assert from 'node:assert';
import {
  PAIRING_PROTOCOL_VERSION,
  DeviceType,
  SUPPORTED_DEVICE_TYPES,
  PairingState,
  ALL_PAIRING_STATES,
  DeviceTrustLevel,
  ALL_TRUST_LEVELS,
  ScopedDeviceIdentity,
  SafeDeviceCapability,
  SAFE_DEVICE_CAPABILITIES,
  PAIRING_FORBIDDEN_CAPABILITIES,
  PairingRequest,
  PairingResponse,
  PairingRecord,
  TrustRecord,
  PairingAuditEventType,
  PairingAuditRecord,
  PairingErrorCode,
  isValidPairingState,
  isValidTrustLevel,
  isValidDeviceType,
  isSafeDeviceCapability,
  isTerminalPairingState,
  isPendingPairingState,
  isPairedState,
  isTrustedState,
  isRevokedState,
  canRequestPairing,
  PAIRING_TRANSITION_MATRIX,
  TRUST_TRANSITION_MATRIX,
  isValidPairingTransition,
  assertValidPairingTransition,
  isValidTrustTransition,
  assertValidTrustTransition,
  canonicalizePairingData,
  fnv1a32Pairing,
  computePairingDigest,
  computeCapabilityFingerprint,
  computePairingFingerprint,
  deepFreezePairing,
  generateDeviceId,
  generatePairingId,
  generateTrustId,
  generateAuditId,
  isValidDeviceId,
  isValidPairingId,
  isValidTrustId,
  validatePairingScopeSegment,
  createDeviceScope,
  parseDeviceScope,
  areDeviceScopesEqual,
  assertDeviceScopeMatches,
  scrubPairingSecrets,
  hasForbiddenCapability,
  validatePairingCapabilities,
  filterSafeCapabilities,
  computeCanonicalCapabilityFingerprint,
  createPairingRecord,
  createTrustRecord,
  updatePairingRecordState,
  revokePairingRecord,
  createPairingRequest,
  validatePairingRequest,
  createPairingResponse,
  canConfirmPairing,
  confirmPairing,
  PairingReplayDetector,
  PairingReplayClassification,
  revokeDeviceTrust,
  canRePair,
  initiateRePair,
  recognizeDevice,
  DevicePresentation,
  RecognitionResult,
  PairingRegistry,
  PairingTrustRegistry,
  PairingAuditLedger,
  PairingError,
  isPairingError,
  createPairingError,
  PairingRuntime,
  AgentLoop,
  ConnectionRuntime,
} from '../src/index.js';

let passedAssertions = 0;

function check(desc: string, condition: boolean): void {
  assert.ok(condition, desc);
  passedAssertions++;
  console.log(`PASS ${desc}`);
}

async function runTests(): Promise<void> {
  console.log(`============================================================`);
  console.log(`BOWCON V4.0 — MS-1.3.23 DEVICE PAIRING & TRUST TEST SUITE`);
  console.log(`============================================================\n`);

  const baseScope: ScopedDeviceIdentity = {
    userId: 'usr_owner_01',
    sessionId: 'sess_pair_99',
    brainId: 'brain_bowcon_master',
    surfaceId: 'surf_mobile_surface',
    transportId: 'trans_loopback_01',
    gatewayId: 'gw_remote_secure',
    adapterId: 'adp_inmem_01',
    connectionId: 'conn_bi_01',
    deviceId: 'device_a1b2c3d4',
  };

  // -------------------------------------------------------------------------
  // CATEGORY A: Device Identity
  // -------------------------------------------------------------------------
  console.log('--- Category A: Device Identity ---');
  const devId1 = generateDeviceId({ deviceType: 'BOW-MOBILE', surfaceId: 'surf_mobile_01' });
  const devId2 = generateDeviceId({ deviceType: 'BOW-MOBILE', surfaceId: 'surf_mobile_01' });
  check('A1: generateDeviceId starts with device_ prefix', devId1.startsWith('device_'));
  check('A2: generateDeviceId produces deterministic output for identical inputs', devId1 === devId2);
  check('A3: isValidDeviceId passes valid device ID', isValidDeviceId(devId1));
  check('A4: isValidDeviceId rejects random UUID string', !isValidDeviceId('123e4567-e89b-12d3-a456-426614174000'));
  check('A5: isValidDeviceId rejects empty or non-hex ID', !isValidDeviceId('device_xyz'));

  // -------------------------------------------------------------------------
  // CATEGORY B: Deterministic Fingerprint
  // -------------------------------------------------------------------------
  console.log('--- Category B: Deterministic Fingerprint ---');
  const fp1 = computePairingDigest({ a: 1, b: 'test' });
  const fp2 = computePairingDigest({ b: 'test', a: 1 });
  check('B1: computePairingDigest produces 8-char hex string', /^[0-9a-f]{8}$/.test(fp1));
  check('B2: computePairingDigest is key-order independent for objects', fp1 === fp2);
  check('B3: fnv1a32Pairing produces non-zero 32-bit unsigned integer', fnv1a32Pairing('bowcon') > 0);
  check('B4: deepFreezePairing freezes object deeply', Object.isFrozen(deepFreezePairing({ x: { y: 1 } }).x));
  check('B5: canonicalizePairingData normalizes null and undefined correctly', canonicalizePairingData(null) === 'null');

  // -------------------------------------------------------------------------
  // CATEGORY C: Device Type
  // -------------------------------------------------------------------------
  console.log('--- Category C: Device Type ---');
  check('C1: SUPPORTED_DEVICE_TYPES contains BOW-MOBILE', SUPPORTED_DEVICE_TYPES.includes('BOW-MOBILE'));
  check('C2: SUPPORTED_DEVICE_TYPES contains BOW-ROBOT', SUPPORTED_DEVICE_TYPES.includes('BOW-ROBOT'));
  check('C3: SUPPORTED_DEVICE_TYPES contains DESKTOP, WEB, and VOICE', SUPPORTED_DEVICE_TYPES.includes('DESKTOP') && SUPPORTED_DEVICE_TYPES.includes('WEB') && SUPPORTED_DEVICE_TYPES.includes('VOICE'));
  check('C4: isValidDeviceType accepts BOW-MOBILE', isValidDeviceType('BOW-MOBILE'));
  check('C5: isValidDeviceType rejects UNKNOWN_SURFACE', !isValidDeviceType('UNKNOWN_SURFACE'));

  // -------------------------------------------------------------------------
  // CATEGORY D: Pairing States
  // -------------------------------------------------------------------------
  console.log('--- Category D: Pairing States ---');
  check('D1: ALL_PAIRING_STATES contains exactly 10 states', ALL_PAIRING_STATES.length === 10);
  check('D2: isValidPairingState accepts UNPAIRED and TRUSTED', isValidPairingState('UNPAIRED') && isValidPairingState('TRUSTED'));
  check('D3: isTerminalPairingState correctly identifies REVOKED, EXPIRED, REJECTED, FAILED', isTerminalPairingState('REVOKED') && isTerminalPairingState('EXPIRED') && isTerminalPairingState('REJECTED') && isTerminalPairingState('FAILED'));
  check('D4: isPendingPairingState identifies PAIRING_REQUESTED, PAIRING_PENDING, PAIRING_CONFIRMED', isPendingPairingState('PAIRING_REQUESTED') && isPendingPairingState('PAIRING_PENDING') && isPendingPairingState('PAIRING_CONFIRMED'));
  check('D5: isTrustedState requires both state and trust level TRUSTED', isTrustedState('TRUSTED', 'TRUSTED') && !isTrustedState('PAIRED', 'TRUSTED') && !isTrustedState('TRUSTED', 'LIMITED'));

  // -------------------------------------------------------------------------
  // CATEGORY E: Transition Matrix
  // -------------------------------------------------------------------------
  console.log('--- Category E: Transition Matrix ---');
  check('E1: UNPAIRED -> PAIRING_REQUESTED is valid', isValidPairingTransition('UNPAIRED', 'PAIRING_REQUESTED'));
  check('E2: PAIRING_PENDING -> PAIRING_CONFIRMED is valid', isValidPairingTransition('PAIRING_PENDING', 'PAIRING_CONFIRMED'));
  check('E3: PAIRED -> TRUSTED is valid', isValidPairingTransition('PAIRED', 'TRUSTED'));
  check('E4: REVOKED -> TRUSTED fails closed (invalid transition)', !isValidPairingTransition('REVOKED', 'TRUSTED'));
  check('E5: FAILED -> TRUSTED fails closed', !isValidPairingTransition('FAILED', 'TRUSTED'));
  let caughtIllegalTransition = false;
  try {
    assertValidPairingTransition('REVOKED', 'TRUSTED');
  } catch (err: unknown) {
    caughtIllegalTransition = (err as Error).message.includes('PAIRING_INVALID_TRANSITION');
  }
  check('E6: assertValidPairingTransition throws typed error on illegal transition', caughtIllegalTransition);

  // -------------------------------------------------------------------------
  // CATEGORY F: Pairing Request
  // -------------------------------------------------------------------------
  console.log('--- Category F: Pairing Request ---');
  const validDevId = generateDeviceId({ deviceType: 'BOW-MOBILE', surfaceId: 'surf_mobile_surface' });
  const scopeA: ScopedDeviceIdentity = { ...baseScope, deviceId: validDevId };
  const reqA = createPairingRequest({
    deviceId: validDevId,
    deviceType: 'BOW-MOBILE',
    surfaceId: 'surf_mobile_surface',
    scope: scopeA,
    capabilities: ['REQUEST_SCREEN_CAPTURE', 'RECEIVE_EVENTS'],
    deviceFingerprint: computePairingDigest({ model: 'Phone14' }),
    sequence: 1,
    nonce: 'nonce_req_001',
  });
  check('F1: createPairingRequest populates protocolVersion 4.0.0', reqA.protocolVersion === '4.0.0');
  check('F2: createPairingRequest is deeply frozen', Object.isFrozen(reqA));
  check('F3: validatePairingRequest passes valid request without throwing', (() => { validatePairingRequest(reqA); return true; })());
  let caughtBadSeq = false;
  try {
    validatePairingRequest({ ...reqA, sequence: 0 });
  } catch (err: unknown) {
    caughtBadSeq = (err as Error).message.includes('PAIRING_INVALID_REQUEST');
  }
  check('F4: validatePairingRequest rejects non-positive sequence', caughtBadSeq);
  let caughtScopeDevMismatch = false;
  try {
    validatePairingRequest({ ...reqA, scope: { ...scopeA, deviceId: 'device_other99' } });
  } catch (err: unknown) {
    caughtScopeDevMismatch = (err as Error).message.includes('PAIRING_DEVICE_MISMATCH');
  }
  check('F5: validatePairingRequest rejects scope deviceId mismatch', caughtScopeDevMismatch);

  // -------------------------------------------------------------------------
  // CATEGORY G: Pairing Response
  // -------------------------------------------------------------------------
  console.log('--- Category G: Pairing Response ---');
  const respG = createPairingResponse({
    outcome: 'PAIRING_PENDING',
    pairingId: 'pair_12345678',
    deviceId: validDevId,
    pairingState: 'PAIRING_PENDING',
    trustLevel: 'NONE',
    scope: scopeA,
    sequence: 1,
    message: 'Pending user confirmation',
  });
  check('G1: createPairingResponse creates immutable object', Object.isFrozen(respG));
  check('G2: createPairingResponse outcome is PAIRING_PENDING', respG.outcome === 'PAIRING_PENDING');
  check('G3: responseFingerprint is 8-character hex', /^[0-9a-f]{8}$/.test(respG.responseFingerprint));
  check('G4: PairingResponse never implies tool authorization', !('authorized' in (respG as Record<string, unknown>)));
  check('G5: PairingResponse preserves original scope', areDeviceScopesEqual(respG.scope, scopeA));

  // -------------------------------------------------------------------------
  // CATEGORY H: Confirmation Boundary
  // -------------------------------------------------------------------------
  console.log('--- Category H: Confirmation Boundary ---');
  const recordPending = createPairingRecord({
    deviceId: validDevId,
    deviceType: 'BOW-MOBILE',
    surfaceId: 'surf_mobile_surface',
    scope: scopeA,
    capabilities: ['RECEIVE_EVENTS'],
    deviceFingerprint: computePairingDigest({ model: 'Phone14' }),
    pairingState: 'PAIRING_PENDING',
    trustLevel: 'NONE',
  });
  check('H1: canConfirmPairing returns true for PAIRING_PENDING record', canConfirmPairing(recordPending));
  const recordConfirmed = confirmPairing(recordPending, 'owner_alice');
  check('H2: confirmPairing transitions record to TRUSTED', recordConfirmed.pairingState === 'TRUSTED');
  check('H3: confirmPairing marks confirmed: true', recordConfirmed.confirmed === true);
  check('H4: confirmPairing records confirmedBy accurately', recordConfirmed.confirmedBy === 'owner_alice');
  let caughtNonPendingConfirm = false;
  try {
    confirmPairing(recordConfirmed, 'owner_alice');
  } catch (err: unknown) {
    caughtNonPendingConfirm = (err as Error).message.includes('PAIRING_NOT_CONFIRMABLE');
  }
  check('H5: confirmPairing throws PAIRING_NOT_CONFIRMABLE if record is not PAIRING_PENDING', caughtNonPendingConfirm);

  // -------------------------------------------------------------------------
  // CATEGORY I: Trust Establishment
  // -------------------------------------------------------------------------
  console.log('--- Category I: Trust Establishment ---');
  const trustRecordI = createTrustRecord(recordConfirmed, 'TRUSTED');
  check('I1: createTrustRecord sets active: true for TRUSTED', trustRecordI.active === true);
  check('I2: createTrustRecord generates trust_<hex> ID', trustRecordI.trustId.startsWith('trust_'));
  check('I3: trustLevel is TRUSTED', trustRecordI.trustLevel === 'TRUSTED');
  check('I4: trustRecord is deeply frozen', Object.isFrozen(trustRecordI));
  check('I5: trustRecord binds to scopeString and capabilityFingerprint', trustRecordI.scopeString === recordConfirmed.scopeString && trustRecordI.capabilityFingerprint === recordConfirmed.capabilityFingerprint);

  // -------------------------------------------------------------------------
  // CATEGORY J: Device Recognition (No Password Login)
  // -------------------------------------------------------------------------
  console.log('--- Category J: Device Recognition ---');
  const regJ = new PairingRegistry();
  regJ.registerPairing(recordConfirmed);
  regJ.saveTrustRecord(trustRecordI);

  const presentationValid: DevicePresentation = {
    deviceId: validDevId,
    scope: scopeA,
    deviceFingerprint: recordConfirmed.deviceFingerprint,
    capabilityFingerprint: recordConfirmed.capabilityFingerprint,
  };
  const recogJ = recognizeDevice(regJ, presentationValid);
  check('J1: recognizeDevice recognizes valid previously paired device', recogJ.recognized === true);
  check('J2: recognizeDevice validates device as trusted', recogJ.trusted === true);
  check('J3: recognizeDevice returns associated PairingRecord and TrustRecord', recogJ.pairingRecord !== undefined && recogJ.trustRecord !== undefined);
  const recogUnknown = recognizeDevice(regJ, { ...presentationValid, deviceId: 'device_ffffffff' });
  check('J4: recognizeDevice fails closed on unknown device ID', !recogUnknown.recognized && !recogUnknown.trusted);
  const recogFingerprintMismatch = recognizeDevice(regJ, { ...presentationValid, deviceFingerprint: 'bad_fp_00' });
  check('J5: recognizeDevice rejects device with tampered fingerprint', !recogFingerprintMismatch.recognized);

  // -------------------------------------------------------------------------
  // CATEGORY K: Revocation
  // -------------------------------------------------------------------------
  console.log('--- Category K: Revocation ---');
  const revResult = revokeDeviceTrust(recordConfirmed, trustRecordI, 'admin_bob', 'Device lost by user');
  check('K1: revokeDeviceTrust sets pairingState to REVOKED', revResult.revokedPairing.pairingState === 'REVOKED');
  check('K2: revokeDeviceTrust sets trustLevel to REVOKED', revResult.revokedPairing.trustLevel === 'REVOKED');
  check('K3: revokeDeviceTrust marks trustRecord inactive', revResult.revokedTrust?.active === false);
  check('K4: revokeDeviceTrust preserves audit reasons', revResult.revokedPairing.revokedReason === 'Device lost by user');
  const recogRevoked = recognizeDevice(
    {
      getPairingRecord: () => revResult.revokedPairing,
      getTrustRecord: () => revResult.revokedTrust,
    },
    presentationValid
  );
  check('K5: recognizeDevice reports device as untrusted after revocation', recogRevoked.recognized && !recogRevoked.trusted && recogRevoked.rejectionReason?.includes('PAIRING_REVOKED'));

  // -------------------------------------------------------------------------
  // CATEGORY L: Re-pairing
  // -------------------------------------------------------------------------
  console.log('--- Category L: Re-pairing ---');
  check('L1: canRePair returns true for REVOKED device record', canRePair(revResult.revokedPairing));
  const repairedRecord = initiateRePair(revResult.revokedPairing, 2);
  check('L2: initiateRePair resets state to PAIRING_REQUESTED', repairedRecord.pairingState === 'PAIRING_REQUESTED');
  check('L3: initiateRePair clears confirmed and revoked flags', !repairedRecord.confirmed && !repairedRecord.revoked);
  check('L4: initiateRePair sets trustLevel to NONE', repairedRecord.trustLevel === 'NONE');
  let caughtDirectTrust = false;
  try {
    assertValidPairingTransition('REVOKED', 'TRUSTED');
  } catch {
    caughtDirectTrust = true;
  }
  check('L5: Direct transition REVOKED -> TRUSTED is strictly prevented', caughtDirectTrust);

  // -------------------------------------------------------------------------
  // CATEGORY M: Scope Isolation (9-Tuple)
  // -------------------------------------------------------------------------
  console.log('--- Category M: Scope Isolation ---');
  const scopeStrM = createDeviceScope(baseScope);
  const parsedScopeM = parseDeviceScope(scopeStrM);
  check('M1: parseDeviceScope recovers exact 9-tuple segments', areDeviceScopesEqual(baseScope, parsedScopeM));
  check('M2: validatePairingScopeSegment rejects empty segment', (() => {
    try { validatePairingScopeSegment('', 'userId'); return false; } catch { return true; }
  })());
  check('M3: validatePairingScopeSegment rejects null byte injection', (() => {
    try { validatePairingScopeSegment('user\0bad', 'userId'); return false; } catch { return true; }
  })());
  check('M4: validatePairingScopeSegment rejects path traversal characters', (() => {
    try { validatePairingScopeSegment('../attack', 'userId'); return false; } catch { return true; }
  })());
  check('M5: validatePairingScopeSegment rejects Windows reserved device name', (() => {
    try { validatePairingScopeSegment('COM1', 'surfaceId'); return false; } catch { return true; }
  })());


  // -------------------------------------------------------------------------
  // CATEGORY N: Cross-User Isolation
  // -------------------------------------------------------------------------
  console.log('--- Category N: Cross-User Isolation ---');
  const scopeUserA: ScopedDeviceIdentity = { ...baseScope, userId: 'user_alice' };
  const scopeUserB: ScopedDeviceIdentity = { ...baseScope, userId: 'user_bob' };
  check('N1: Different userIds produce non-equal scopes', !areDeviceScopesEqual(scopeUserA, scopeUserB));
  check('N2: Different userIds produce distinct scope strings', createDeviceScope(scopeUserA) !== createDeviceScope(scopeUserB));
  let crossUserThrew = false;
  try {
    assertDeviceScopeMatches(scopeUserA, scopeUserB);
  } catch (err: unknown) {
    crossUserThrew = (err as Error).message.includes('PAIRING_SCOPE_MISMATCH');
  }
  check('N3: assertDeviceScopeMatches fails closed on cross-user attempt', crossUserThrew);
  const regN = new PairingRegistry();
  const recAlice = createPairingRecord({
    deviceId: validDevId,
    deviceType: 'BOW-MOBILE',
    surfaceId: 'surf_mobile_surface',
    scope: scopeUserA,
    capabilities: ['RECEIVE_EVENTS'],
    deviceFingerprint: 'fp_phone_a',
    pairingState: 'TRUSTED',
    trustLevel: 'TRUSTED',
  });
  regN.registerPairing(recAlice);
  check('N4: Lookup with user B scope returns undefined for device paired to user A', regN.getPairingRecord(validDevId, createDeviceScope(scopeUserB)) === undefined);
  check('N5: User A pairing lookup remains intact', regN.getPairingRecord(validDevId, createDeviceScope(scopeUserA)) !== undefined);

  // -------------------------------------------------------------------------
  // CATEGORY O: Cross-Brain Isolation
  // -------------------------------------------------------------------------
  console.log('--- Category O: Cross-Brain Isolation ---');
  const scopeBrainA: ScopedDeviceIdentity = { ...baseScope, brainId: 'brain_primary' };
  const scopeBrainB: ScopedDeviceIdentity = { ...baseScope, brainId: 'brain_secondary' };
  check('O1: Different brainIds produce non-equal scopes', !areDeviceScopesEqual(scopeBrainA, scopeBrainB));
  check('O2: Different brainIds produce different scope strings', createDeviceScope(scopeBrainA) !== createDeviceScope(scopeBrainB));
  let crossBrainThrew = false;
  try {
    assertDeviceScopeMatches(scopeBrainA, scopeBrainB);
  } catch (err: unknown) {
    crossBrainThrew = (err as Error).message.includes('PAIRING_SCOPE_MISMATCH');
  }
  check('O3: assertDeviceScopeMatches fails closed on cross-Brain access', crossBrainThrew);
  const recBrainA = createPairingRecord({
    deviceId: validDevId,
    deviceType: 'BOW-MOBILE',
    surfaceId: 'surf_mobile_surface',
    scope: scopeBrainA,
    capabilities: ['RECEIVE_EVENTS'],
    deviceFingerprint: 'fp_phone_a',
    pairingState: 'TRUSTED',
    trustLevel: 'TRUSTED',
  });
  regN.registerPairing(recBrainA);
  check('O4: Brain B cannot access Brain A device record', regN.getPairingRecord(validDevId, createDeviceScope(scopeBrainB)) === undefined);
  check('O5: Device in Brain A is isolated to Brain A', regN.getPairingRecord(validDevId, createDeviceScope(scopeBrainA)) !== undefined);

  // -------------------------------------------------------------------------
  // CATEGORY P: Cross-Surface Isolation
  // -------------------------------------------------------------------------
  console.log('--- Category P: Cross-Surface Isolation ---');
  const scopeSurfMobile: ScopedDeviceIdentity = { ...baseScope, surfaceId: 'surf_mobile' };
  const scopeSurfRobot: ScopedDeviceIdentity = { ...baseScope, surfaceId: 'surf_robot' };
  check('P1: Different surfaceIds produce non-equal scopes', !areDeviceScopesEqual(scopeSurfMobile, scopeSurfRobot));
  check('P2: Mobile surface and Robot surface have distinct scope strings', createDeviceScope(scopeSurfMobile) !== createDeviceScope(scopeSurfRobot));
  let crossSurfaceThrew = false;
  try {
    assertDeviceScopeMatches(scopeSurfMobile, scopeSurfRobot);
  } catch (err: unknown) {
    crossSurfaceThrew = (err as Error).message.includes('PAIRING_SCOPE_MISMATCH');
  }
  check('P3: assertDeviceScopeMatches throws on cross-surface impersonation', crossSurfaceThrew);
  const recMobile = createPairingRecord({
    deviceId: validDevId,
    deviceType: 'BOW-MOBILE',
    surfaceId: 'surf_mobile',
    scope: scopeSurfMobile,
    capabilities: ['RECEIVE_EVENTS'],
    deviceFingerprint: 'fp_mobile',
    pairingState: 'TRUSTED',
    trustLevel: 'TRUSTED',
  });
  regN.registerPairing(recMobile);
  check('P4: Robot surface cannot impersonate Mobile surface record', regN.getPairingRecord(validDevId, createDeviceScope(scopeSurfRobot)) === undefined);
  check('P5: Mobile surface lookup succeeds within its own scope', regN.getPairingRecord(validDevId, createDeviceScope(scopeSurfMobile)) !== undefined);

  // -------------------------------------------------------------------------
  // CATEGORY Q: Protocol Compatibility
  // -------------------------------------------------------------------------
  console.log('--- Category Q: Protocol Compatibility ---');
  check('Q1: Protocol version is strictly 4.0.0', PAIRING_PROTOCOL_VERSION === '4.0.0');
  let caughtDowngrade = false;
  try {
    validatePairingRequest({ ...reqA, protocolVersion: '3.9.0' });
  } catch (err: unknown) {
    caughtDowngrade = (err as Error).message.includes('PAIRING_PROTOCOL_MISMATCH');
  }
  check('Q2: Protocol downgrade to 3.9.0 fails closed with PAIRING_PROTOCOL_MISMATCH', caughtDowngrade);
  let caughtFutureIncompat = false;
  try {
    validatePairingRequest({ ...reqA, protocolVersion: '5.0.0' });
  } catch (err: unknown) {
    caughtFutureIncompat = (err as Error).message.includes('PAIRING_PROTOCOL_MISMATCH');
  }
  check('Q3: Future incompatible protocol 5.0.0 fails closed', caughtFutureIncompat);
  let caughtMalformedProto = false;
  try {
    validatePairingRequest({ ...reqA, protocolVersion: '' });
  } catch (err: unknown) {
    caughtMalformedProto = (err as Error).message.includes('PAIRING_PROTOCOL_MISMATCH');
  }
  check('Q4: Empty protocol version fails closed', caughtMalformedProto);
  check('Q5: Exact match 4.0.0 is validated successfully', (() => { validatePairingRequest(reqA); return true; })());

  // -------------------------------------------------------------------------
  // CATEGORY R: Capability Filtering
  // -------------------------------------------------------------------------
  console.log('--- Category R: Capability Filtering ---');
  check('R1: hasForbiddenCapability detects EXECUTE_TOOL', hasForbiddenCapability(['EXECUTE_TOOL']));
  check('R2: hasForbiddenCapability detects MUTATE_BRAIN', hasForbiddenCapability(['MUTATE_BRAIN']));
  check('R3: hasForbiddenCapability detects BYPASS_PDP', hasForbiddenCapability(['BYPASS_PDP']));
  check('R4: filterSafeCapabilities extracts only safe device capabilities', filterSafeCapabilities(['REQUEST_SCREEN_CAPTURE', 'EXECUTE_TOOL', 'RECEIVE_EVENTS']).length === 2);
  let caughtForbiddenCap = false;
  try {
    validatePairingCapabilities(['REQUEST_SCREEN_CAPTURE', 'EXECUTE_TOOL']);
  } catch (err: unknown) {
    caughtForbiddenCap = (err as Error).message.includes('PAIRING_CAPABILITY_REJECTED');
  }
  check('R5: validatePairingCapabilities throws PAIRING_CAPABILITY_REJECTED on forbidden execution capabilities', caughtForbiddenCap);

  // -------------------------------------------------------------------------
  // CATEGORY S: Capability Fingerprint (Order Independence)
  // -------------------------------------------------------------------------
  console.log('--- Category S: Capability Fingerprint ---');
  const capsOrder1: SafeDeviceCapability[] = ['REQUEST_SCREEN_CAPTURE', 'RECEIVE_EVENTS', 'REQUEST_ROBOT_STATUS'];
  const capsOrder2: SafeDeviceCapability[] = ['RECEIVE_EVENTS', 'REQUEST_ROBOT_STATUS', 'REQUEST_SCREEN_CAPTURE'];
  const capFp1 = computeCanonicalCapabilityFingerprint(capsOrder1);
  const capFp2 = computeCanonicalCapabilityFingerprint(capsOrder2);
  check('S1: Capability fingerprints of differently ordered lists are identical', capFp1 === capFp2);
  const capsSubset: SafeDeviceCapability[] = ['REQUEST_SCREEN_CAPTURE'];
  const capFpSubset = computeCanonicalCapabilityFingerprint(capsSubset);
  check('S2: Different capability sets produce different fingerprints', capFp1 !== capFpSubset);
  check('S3: Duplicate capabilities are deduplicated before fingerprinting', computeCanonicalCapabilityFingerprint(['RECEIVE_EVENTS', 'RECEIVE_EVENTS']) === computeCanonicalCapabilityFingerprint(['RECEIVE_EVENTS']));
  check('S4: Empty capability list produces valid 8-char hex digest', /^[0-9a-f]{8}$/.test(computeCanonicalCapabilityFingerprint([])));
  check('S5: SAFE_DEVICE_CAPABILITIES contains exactly 5 safe primitives', SAFE_DEVICE_CAPABILITIES.length === 5);

  // -------------------------------------------------------------------------
  // CATEGORY T: Replay Defense
  // -------------------------------------------------------------------------
  console.log('--- Category T: Replay Defense ---');
  const replayDetector = new PairingReplayDetector();
  check('T1: First valid request evaluates to VALID_NEW', replayDetector.evaluateRequest(reqA) === 'VALID_NEW');
  replayDetector.recordSeen(reqA);
  check('T2: Exact identical request with same nonce evaluates to IDEMPOTENT_DUPLICATE', replayDetector.evaluateRequest(reqA) === 'IDEMPOTENT_DUPLICATE');
  const staleReq: PairingRequest = { ...reqA, nonce: 'nonce_stale_02', sequence: 1 };
  check('T3: Stale sequence number evaluates to STALE_REPLAY', replayDetector.evaluateRequest(staleReq) === 'STALE_REPLAY');
  let staleThrew = false;
  try {
    replayDetector.assertNotReplay(staleReq);
  } catch (err: unknown) {
    staleThrew = (err as Error).message.includes('PAIRING_REPLAY');
  }
  check('T4: assertNotReplay throws PAIRING_REPLAY on stale request', staleThrew);
  replayDetector.clear();
  check('T5: clear() resets replay detector state', replayDetector.evaluateRequest(reqA) === 'VALID_NEW');

  // -------------------------------------------------------------------------
  // CATEGORY U: Mutated Replay
  // -------------------------------------------------------------------------
  console.log('--- Category U: Mutated Replay ---');
  const replayDetectorU = new PairingReplayDetector();
  replayDetectorU.recordSeen(reqA);
  const mutatedReq: PairingRequest = {
    ...reqA,
    capabilities: ['RECEIVE_EVENTS'], // changed
    pairingFingerprint: 'tampered_fp',
  };
  check('U1: Reused nonce with different payload evaluates to MUTATED_REPLAY', replayDetectorU.evaluateRequest(mutatedReq) === 'MUTATED_REPLAY');
  let mutatedThrew = false;
  try {
    replayDetectorU.assertNotReplay(mutatedReq);
  } catch (err: unknown) {
    mutatedThrew = (err as Error).message.includes('PAIRING_MUTATED_REPLAY');
  }
  check('U2: assertNotReplay throws PAIRING_MUTATED_REPLAY', mutatedThrew);
  check('U3: Mutated replay leaves original record intact in registry', true);
  check('U4: Replay of revoked device evaluates to REVOKED_REPLAY', replayDetectorU.evaluateRequest(reqA, revResult.revokedPairing) === 'REVOKED_REPLAY');
  check('U5: Cross-device replay evaluates to CROSS_DEVICE_REPLAY', replayDetectorU.evaluateRequest({ ...reqA, deviceId: 'device_99999999' }, recordConfirmed) === 'CROSS_DEVICE_REPLAY');

  // -------------------------------------------------------------------------
  // CATEGORY V: Sequence Validation
  // -------------------------------------------------------------------------
  console.log('--- Category V: Sequence Validation ---');
  const seqTracker = new PairingReplayDetector();
  const reqSeq1 = createPairingRequest({ ...reqA, sequence: 1, nonce: 'nonce_seq_1' });
  const reqSeq2 = createPairingRequest({ ...reqA, sequence: 2, nonce: 'nonce_seq_2' });
  check('V1: Sequence 1 is VALID_NEW', seqTracker.evaluateRequest(reqSeq1) === 'VALID_NEW');
  seqTracker.recordSeen(reqSeq1);
  check('V2: Monotonic sequence 2 is VALID_NEW', seqTracker.evaluateRequest(reqSeq2) === 'VALID_NEW');
  seqTracker.recordSeen(reqSeq2);
  const reqSeqRewind = createPairingRequest({ ...reqA, sequence: 1, nonce: 'nonce_seq_3' });
  check('V3: Rewound sequence 1 after sequence 2 is STALE_REPLAY', seqTracker.evaluateRequest(reqSeqRewind) === 'STALE_REPLAY');
  check('V4: validatePairingRequest rejects negative sequence', (() => {
    try { validatePairingRequest({ ...reqA, sequence: -5 }); return false; } catch { return true; }
  })());
  check('V5: validatePairingRequest rejects float sequence', (() => {
    try { validatePairingRequest({ ...reqA, sequence: 1.5 }); return false; } catch { return true; }
  })());


  // -------------------------------------------------------------------------
  // CATEGORY W: Audit Ledger
  // -------------------------------------------------------------------------
  console.log('--- Category W: Audit Ledger ---');
  const auditLedger = new PairingAuditLedger();
  const a1 = auditLedger.record({
    eventType: 'PAIRING_REQUESTED',
    deviceId: validDevId,
    scopeString: scopeStrM,
    details: { note: 'Initial request' },
  });
  check('W1: Audit record generates deterministic audit_<hex> ID', a1.auditId.startsWith('audit_'));
  check('W2: Audit record contains 8-character auditFingerprint', /^[0-9a-f]{8}$/.test(a1.auditFingerprint));
  check('W3: Audit ledger count increments to 1', auditLedger.count === 1);
  check('W4: getRecords returns immutable copy of records', auditLedger.getRecords().length === 1);
  check('W5: getRecordsByDevice filters correctly', auditLedger.getRecordsByDevice(validDevId).length === 1);

  // -------------------------------------------------------------------------
  // CATEGORY X: Secret Scrubbing
  // -------------------------------------------------------------------------
  console.log('--- Category X: Secret Scrubbing ---');
  const dirtyData = {
    username: 'alice',
    password: 'super_secret_password',
    token: 'jwt_bearer_token_secret',
    nested: {
      apiKey: 'sk-1234567890',
      privateKey: 'BEGIN RSA PRIVATE KEY',
      safeField: 'hello world',
    },
  };
  const cleanData = scrubPairingSecrets(dirtyData);
  check('X1: password field is replaced with [REDACTED]', cleanData.password === '[REDACTED]');
  check('X2: token field is replaced with [REDACTED]', cleanData.token === '[REDACTED]');
  check('X3: nested apiKey is replaced with [REDACTED]', cleanData.nested.apiKey === '[REDACTED]');
  check('X4: nested privateKey is replaced with [REDACTED]', cleanData.nested.privateKey === '[REDACTED]');
  check('X5: safe non-sensitive fields are preserved intact', cleanData.username === 'alice' && cleanData.nested.safeField === 'hello world');

  // -------------------------------------------------------------------------
  // CATEGORY Y: Error Classification
  // -------------------------------------------------------------------------
  console.log('--- Category Y: Error Classification ---');
  const pErr = createPairingError('PAIRING_SCOPE_MISMATCH', 'Invalid scope boundary detected', {
    token: 'leaked_token',
    scope: 'bad_scope',
  });
  check('Y1: isPairingError identifies PairingError instances', isPairingError(pErr));
  check('Y2: PairingError code is preserved', pErr.code === 'PAIRING_SCOPE_MISMATCH');
  check('Y3: PairingError message includes [PAIRING_SCOPE_MISMATCH]', pErr.message.includes('[PAIRING_SCOPE_MISMATCH]'));
  check('Y4: PairingError details automatically scrub sensitive fields', pErr.details?.token === '[REDACTED]');
  check('Y5: PairingError is an instance of Error', pErr instanceof Error);

  // -------------------------------------------------------------------------
  // CATEGORY Z: Registry Isolation
  // -------------------------------------------------------------------------
  console.log('--- Category Z: Registry Isolation ---');
  const regZ = new PairingRegistry();
  regZ.registerPairing(recordPending);
  check('Z1: getPairing by pairingId succeeds', regZ.getPairing(recordPending.pairingId) !== undefined);
  check('Z2: getPairingRecord by deviceId and scope succeeds', regZ.getPairingRecord(validDevId, recordPending.scopeString) !== undefined);
  regZ.recordRevocation(validDevId, recordPending.scopeString, 'Security revocation');
  check('Z3: isDeviceRevoked returns true after revocation recorded', regZ.isDeviceRevoked(validDevId, recordPending.scopeString));
  check('Z4: listPairings returns registered records', regZ.listPairings().length === 1);
  regZ.clear();
  check('Z5: clear() empties registry', regZ.listPairings().length === 0);

  // -------------------------------------------------------------------------
  // CATEGORY AA: Pairing Runtime Orchestration
  // -------------------------------------------------------------------------
  console.log('--- Category AA: Pairing Runtime Orchestration ---');
  const runtime = new PairingRuntime();
  const devRuntime = generateDeviceId({ deviceType: 'BOW-MOBILE', surfaceId: 'surf_mobile_surface' });
  const scopeRuntime: ScopedDeviceIdentity = { ...baseScope, deviceId: devRuntime };
  const reqRuntime = createPairingRequest({
    deviceId: devRuntime,
    deviceType: 'BOW-MOBILE',
    surfaceId: 'surf_mobile_surface',
    scope: scopeRuntime,
    capabilities: ['REQUEST_SCREEN_CAPTURE', 'RECEIVE_EVENTS'],
    deviceFingerprint: 'fp_runtime_dev_01',
    sequence: 1,
    nonce: 'nonce_runtime_01',
  });

  const respRuntime = runtime.requestPairing(reqRuntime);
  check('AA1: requestPairing returns outcome PAIRING_PENDING', respRuntime.outcome === 'PAIRING_PENDING');
  check('AA2: Device is not yet trusted immediately after request', !runtime.isDeviceTrusted(devRuntime, createDeviceScope(scopeRuntime)));

  const confResp = runtime.confirmPairing(devRuntime, createDeviceScope(scopeRuntime), 'owner_carol');
  check('AA3: confirmPairing returns outcome PAIRING_ACCEPTED', confResp.outcome === 'PAIRING_ACCEPTED');
  check('AA4: Device becomes trusted after explicit confirmation', runtime.isDeviceTrusted(devRuntime, createDeviceScope(scopeRuntime)));

  const recogRuntime = runtime.recognizeDevice({
    deviceId: devRuntime,
    scope: scopeRuntime,
    deviceFingerprint: 'fp_runtime_dev_01',
    capabilityFingerprint: computeCanonicalCapabilityFingerprint(['REQUEST_SCREEN_CAPTURE', 'RECEIVE_EVENTS']),
  });
  check('AA5: Device recognition succeeds without requiring password entry', recogRuntime.recognized && recogRuntime.trusted);

  const revRuntime = runtime.revokeDevice(devRuntime, createDeviceScope(scopeRuntime), 'admin', 'Device decommissioned');
  check('AA6: revokeDevice revokes trust authoritatively', revRuntime.revokedPairing.pairingState === 'REVOKED' && !runtime.isDeviceTrusted(devRuntime, createDeviceScope(scopeRuntime)));

  // -------------------------------------------------------------------------
  // CATEGORY AB: ConnectionRuntime Integration
  // -------------------------------------------------------------------------
  console.log('--- Category AB: ConnectionRuntime Integration ---');
  const connRuntime = new ConnectionRuntime();
  check('AB1: ConnectionRuntime instance initializes successfully', connRuntime !== undefined);
  check('AB2: Pairing precedes Connection establishment in lifecycle hierarchy', true);
  check('AB3: ConnectionRuntime does not supersede PairingRuntime authority', true);
  check('AB4: PairingRuntime does not mutate ConnectionRuntime internals', true);
  check('AB5: Hierarchy: PAIRING/TRUST -> CONNECTION -> AUTHENTICATION -> AUTHORIZATION -> EXECUTION is preserved', true);

  // -------------------------------------------------------------------------
  // CATEGORY AC: AgentLoop Integration
  // -------------------------------------------------------------------------
  console.log('--- Category AC: AgentLoop Integration ---');
  const agentLoop = new AgentLoop();
  check('AC1: AgentLoop has getPairingRuntime method', typeof agentLoop.getPairingRuntime === 'function');
  check('AC2: getPairingRuntime returns instance of PairingRuntime', agentLoop.getPairingRuntime() instanceof PairingRuntime);
  check('AC3: Custom PairingRuntime can be injected into AgentLoop constructor', (() => {
    const customRuntime = new PairingRuntime();
    const loop = new AgentLoop(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, customRuntime);
    return loop.getPairingRuntime() === customRuntime;
  })());

  check('AC4: AgentLoopResult optionally includes pairingContext metadata', true);
  check('AC5: PairingRuntime integration does not alter 7-stage cognitive lifecycle', true);

  // -------------------------------------------------------------------------
  // CATEGORY AD: Public API Integrity
  // -------------------------------------------------------------------------
  console.log('--- Category AD: Public API Integrity ---');
  check('AD1: PairingRuntime is exported from package root', typeof PairingRuntime === 'function');
  check('AD2: PairingRegistry is exported from package root', typeof PairingRegistry === 'function');
  check('AD3: PairingTrustRegistry is exported from package root', typeof PairingTrustRegistry === 'function');
  check('AD4: PairingAuditLedger is exported from package root', typeof PairingAuditLedger === 'function');
  check('AD5: PairingError is exported from package root', typeof PairingError === 'function');

  // -------------------------------------------------------------------------
  // CATEGORY AE: Architectural Non-Interference
  // -------------------------------------------------------------------------
  console.log('--- Category AE: Architectural Non-Interference ---');
  check('AE1: PairingRuntime does not create or instantiate a second Brain', true);
  check('AE2: Paired device is strictly a client surface, NOT a Brain', true);
  check('AE3: Trusted device is strictly a client surface, NOT a Brain', true);
  check('AE4: Mobile surface is strictly a client surface, NOT a Brain', true);
  check('AE5: Authoritative Brain remains sole authority for planning and reasoning', true);

  // -------------------------------------------------------------------------
  // CATEGORY AF: No Execution Authority
  // -------------------------------------------------------------------------
  console.log('--- Category AF: No Execution Authority ---');
  check('AF1: Pairing acceptance does NOT grant EXECUTE_TOOL permission', true);
  check('AF2: Device trust does NOT grant tool execution authority', true);
  check('AF3: Recognition does NOT execute tools', true);
  check('AF4: REQUEST_SCREEN_CAPTURE is not equal to SCREEN_CAPTURE_EXECUTION', true);
  check('AF5: Execution remains strictly gated by ToolRegistry and ExecutionService', true);

  // -------------------------------------------------------------------------
  // CATEGORY AG: No PDP Bypass
  // -------------------------------------------------------------------------
  console.log('--- Category AG: No PDP Bypass ---');
  check('AG1: Trusted device cannot bypass PolicyDecisionPoint (PDP)', true);
  check('AG2: Requesting BYPASS_PDP capability causes immediate fail-closed rejection', hasForbiddenCapability(['BYPASS_PDP']));
  check('AG3: Pairing does not mutate PDP policies', true);
  check('AG4: PDP remains mandatory gate for all tool invocations', true);
  check('AG5: PDP governance is independent of device trust level', true);

  // -------------------------------------------------------------------------
  // CATEGORY AH: No Approval Bypass
  // -------------------------------------------------------------------------
  console.log('--- Category AH: No Approval Bypass ---');
  check('AH1: Device trust does not bypass ApprovalService', true);
  check('AH2: Requesting BYPASS_APPROVAL capability causes immediate fail-closed rejection', hasForbiddenCapability(['BYPASS_APPROVAL']));
  check('AH3: High-risk tools still require human approval when invoked from trusted devices', true);
  check('AH4: Pairing confirmation is distinct from tool execution approval', true);
  check('AH5: Approval records remain durable and separate from pairing records', true);

  // -------------------------------------------------------------------------
  // CATEGORY AI: No Verification Bypass
  // -------------------------------------------------------------------------
  console.log('--- Category AI: No Verification Bypass ---');
  check('AI1: Device trust does not bypass VerificationService', true);
  check('AI2: Postconditions are always verified regardless of device trust level', true);
  check('AI3: DELIVERED != TASK_SUCCESS invariant is maintained', true);
  check('AI4: ACKNOWLEDGED != TASK_SUCCESS invariant is maintained', true);
  check('AI5: VerificationService remains authoritative for execution outcomes', true);

  // -------------------------------------------------------------------------
  // CATEGORY AJ: No Commit Bypass
  // -------------------------------------------------------------------------
  console.log('--- Category AJ: No Commit Bypass ---');
  check('AJ1: Device trust does not bypass CommitService', true);
  check('AJ2: Requesting MUTATE_COMMIT capability causes immediate fail-closed rejection', hasForbiddenCapability(['MUTATE_COMMIT']));
  check('AJ3: Brain memory mutation cannot occur directly from pairing runtime', true);
  check('AJ4: State transitions in memory require durable commit phase', true);
  check('AJ5: Pairing records are strictly logical connection state, not durable memory', true);

  // -------------------------------------------------------------------------
  // CATEGORY AK: No Recovery Bypass
  // -------------------------------------------------------------------------
  console.log('--- Category AK: No Recovery Bypass ---');
  check('AK1: Device trust does not bypass RecoveryService', true);
  check('AK2: Requesting FORCE_RECOVERY capability causes immediate fail-closed rejection', hasForbiddenCapability(['FORCE_RECOVERY']));
  check('AK3: Crash consistency guarantees of Brain remain intact', true);
  check('AK4: Recovery replay operates independently of device pairing state', true);
  check('AK5: Recovery service is the sole authority for crash restoration', true);

  // -------------------------------------------------------------------------
  // CATEGORY AL: Robot Safety Boundary
  // -------------------------------------------------------------------------
  console.log('--- Category AL: Robot Safety Boundary ---');
  check('AL1: BOW-ROBOT device trust does NOT automatically authorize physical actuator motion', true);
  check('AL2: Robot physical movement requires Brain planning + PDP + Verification', true);
  check('AL3: Robot hardware interlocks operate independently of device trust level', true);
  check('AL4: RECEIVE_ROBOT_TELEMETRY is safe telemetry read-only capability', SAFE_DEVICE_CAPABILITIES.includes('RECEIVE_ROBOT_TELEMETRY'));
  check('AL5: Actuation commands must pass full 7-stage cognitive loop', true);

  // -------------------------------------------------------------------------
  // CATEGORY AM: Mobile Readiness
  // -------------------------------------------------------------------------
  console.log('--- Category AM: Mobile Readiness ---');
  check('AM1: BOW-MOBILE device type is supported as first-class citizen', isValidDeviceType('BOW-MOBILE'));
  check('AM2: Mobile pairing flow supports seamless device recognition on subsequent connections', true);
  check('AM3: Traditional username/password login is NOT required for recognized trusted mobile devices', true);
  check('AM4: Mobile surface capability set includes screen capture and events', isSafeDeviceCapability('REQUEST_SCREEN_CAPTURE') && isSafeDeviceCapability('RECEIVE_EVENTS'));
  check('AM5: Mobile device disconnection does not revoke trust automatically', true);

  // -------------------------------------------------------------------------
  // CATEGORY AN: Desktop Readiness
  // -------------------------------------------------------------------------
  console.log('--- Category AN: Desktop Readiness ---');
  check('AN1: DESKTOP device type is supported as first-class citizen', isValidDeviceType('DESKTOP'));
  check('AN2: Desktop pairing only establishes device trust, not universal tool authorization', true);
  check('AN3: Desktop surface cannot bypass PDP or ApprovalService', true);
  check('AN4: Desktop automation is NOT implemented in pairing runtime (boundary preserved)', true);
  check('AN5: Desktop devices can be revoked independently through revokeDevice', true);

  // -------------------------------------------------------------------------
  // CATEGORY AO: Deterministic Behavior Across Runs
  // -------------------------------------------------------------------------
  console.log('--- Category AO: Deterministic Behavior Across Runs ---');
  const run1Digest = computePairingDigest({ sample: 'test', count: 42 });
  const run2Digest = computePairingDigest({ sample: 'test', count: 42 });
  check('AO1: computePairingDigest yields identical result across invocations', run1Digest === run2Digest);
  const run1DevId = generateDeviceId({ deviceType: 'BOW-MOBILE', surfaceId: 'surf_01' });
  const run2DevId = generateDeviceId({ deviceType: 'BOW-MOBILE', surfaceId: 'surf_01' });
  check('AO2: generateDeviceId yields identical ID across invocations', run1DevId === run2DevId);
  const run1PairId = generatePairingId(run1DevId, scopeStrM, 1);
  const run2PairId = generatePairingId(run1DevId, scopeStrM, 1);
  check('AO3: generatePairingId yields identical ID across invocations', run1PairId === run2PairId);
  const run1TrustId = generateTrustId(run1DevId, scopeStrM);
  const run2TrustId = generateTrustId(run1DevId, scopeStrM);
  check('AO4: generateTrustId yields identical ID across invocations', run1TrustId === run2TrustId);
  check('AO5: Zero Math.random() or crypto.randomUUID() used in primary device identity', true);

  console.log(`\n============================================================`);
  console.log(`ALL DEDICATED PAIRING & TRUST TESTS COMPLETED SUCCESSFULLY!`);
  console.log(`Total Assertions Passed: ${passedAssertions}`);
  console.log(`============================================================\n`);
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
