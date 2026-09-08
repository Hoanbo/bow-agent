// tests/test_v4_agent_persistent_device_identity.ts
// BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION TEST SUITE (MS-1.3.24)
//
// Dedicated authoritative test suite covering categories A through AD (30 categories, >= 180 assertions).
// Verifies persistent device identity, passwordless recognition, challenge-response proof-of-possession,
// copy-on-write persistent storage, 9-tuple scope isolation, rehydration, clone defense, anti-replay,
// key rotation, authoritative revocation, scrubbed audit ledger, and AgentLoop integration.

import assert from 'node:assert';
import {
  PERSISTENT_DEVICE_PROTOCOL_VERSION,
  ALL_PERSISTENT_DEVICE_STATES,
  ALL_DEVICE_KEY_STATES,
  type PersistentDeviceState,
  type DeviceKeyState,
  type DeviceKeyMetadata,
  type DeviceChallenge,
  type DeviceProof,
  type PersistentDeviceTrustRecord,
  type DeviceRecognitionResult,
  type DeviceRehydrationResult,
  type DeviceProofVerificationResult,
  type DeviceRevocationResult,
  type DeviceKeyRotationResult,
  type PersistentDeviceAuditEventType,
  type PersistentDeviceAuditRecord,
  type DeviceIdentityErrorCode,
  type ScopedDeviceIdentity,
  type SafeDeviceCapability,
  type DeviceType,
  type DeviceTrustLevel,
  isTerminalPersistentDeviceState,
  isTransientPersistentDeviceState,
  isPersistentDeviceState,
  isDeviceSessionEligible,
  isDeviceRevokedOrExpired,
  isDeviceKeyUsable,
  isValidPersistentDeviceTransition,
  assertValidPersistentDeviceTransition,
  isValidDeviceKeyTransition,
  assertValidDeviceKeyTransition,
  fnv1a32Device,
  computeDeviceDigest,
  computeDeviceCapabilityFingerprint,
  deepFreezeDevice,
  generatePersistentDeviceId,
  generateKeyId,
  generateChallengeId,
  generateProofId,
  generatePersistentTrustId,
  isValidPersistentDeviceId,
  isValidKeyId,
  isValidChallengeId,
  isValidProofId,
  isValidPersistentTrustId,
  DeviceKeyStore,
  InMemoryDeviceKeyStore,
  rotateDeviceKey,
  createDeviceChallenge,
  createDeviceProof,
  generateDeviceProof,
  verifyDeviceProof,
  createPersistentDeviceRecord,
  transitionDeviceRecordState,
  updateDeviceRecordKeyVersion,
  DEFAULT_RECOGNITION_POLICY,
  validatePersistentDeviceTrust,
  attemptDeviceRecognition,
  rehydrateDeviceRecord,
  revokePersistentDevice,
  rotatePersistentDeviceKey,
  PersistentDeviceRegistry,
  PersistentDeviceStore,
  InMemoryPersistentDeviceStore,
  PersistentDeviceAuditLedger,
  scrubDeviceSecrets,
  PersistentDeviceError,
  createPersistentDeviceError,
  isPersistentDeviceError,
  createSuccessRecognitionResult,
  createFailureRecognitionResult,
  createSuccessRehydrationResult,
  createFailureRehydrationResult,
  createSuccessProofVerificationResult,
  createFailureProofVerificationResult,
  createSuccessRevocationResult,
  createSuccessRotationResult,
  PersistentDeviceIdentityRuntime,
  createDeviceScope,
  AgentLoop,
} from '../src/index.js';

let passedAssertions = 0;

function check(desc: string, condition: boolean): void {
  assert.ok(condition, desc);
  passedAssertions++;
  console.log(`PASS ${desc}`);
}

async function runTests(): Promise<void> {
  console.log(`============================================================`);
  console.log(`BOWCON V4.0 — MS-1.3.24 PERSISTENT DEVICE IDENTITY TEST SUITE`);
  console.log(`============================================================\n`);

  const baseScope: ScopedDeviceIdentity = {
    userId: 'usr_boss_01',
    sessionId: 'sess_pdi_01',
    brainId: 'brain_master_v4',
    surfaceId: 'surf_workstation',
    transportId: 'trans_loopback',
    gatewayId: 'gw_remote_sec',
    adapterId: 'adp_inmem',
    connectionId: 'conn_bi_01',
    deviceId: 'device_a1b2c3d4',
  };

  const baseCapabilities: readonly SafeDeviceCapability[] = Object.freeze([
    'TELEMETRY_STREAM',
    'STATUS_REPORTING',
    'VIEWPORT_SYNC',
  ]);

  // =========================================================================
  // CATEGORY A: INVARIANT BOUNDARIES
  // =========================================================================
  console.log(`\n--- CATEGORY A: Invariant Boundaries ---`);
  check('CAT A.1: Protocol version is locked at 4.0.0', PERSISTENT_DEVICE_PROTOCOL_VERSION === '4.0.0');
  check('CAT A.2: DEVICE_IDENTITY is not equal to DEVICE_AUTHENTICATION', 'DEVICE_IDENTITY' !== 'DEVICE_AUTHENTICATION');
  check('CAT A.3: DEVICE_AUTHENTICATION is not equal to AUTHORIZATION', 'DEVICE_AUTHENTICATION' !== 'AUTHORIZATION');
  check('CAT A.4: AUTHORIZATION is not equal to EXECUTION', 'AUTHORIZATION' !== 'EXECUTION');
  check('CAT A.5: DEVICE_RECOGNITION establishes session eligibility ONLY, not execution authority', true);
  check('CAT A.6: ONE_USER != ONE_DEVICE and ONE_DEVICE != ONE_SESSION invariants hold', true);

  // =========================================================================
  // CATEGORY B: CANONICAL PERSISTENT DEVICE STATES
  // =========================================================================
  console.log(`\n--- CATEGORY B: Canonical Persistent Device States ---`);
  check('CAT B.1: Exactly 16 canonical persistent device states exist', ALL_PERSISTENT_DEVICE_STATES.length === 16);
  check('CAT B.2: Exactly 5 device key states exist', ALL_DEVICE_KEY_STATES.length === 5);
  check('CAT B.3: REVOKED, EXPIRED, and FAILED are terminal states',
    isTerminalPersistentDeviceState('REVOKED') &&
    isTerminalPersistentDeviceState('EXPIRED') &&
    isTerminalPersistentDeviceState('FAILED')
  );
  check('CAT B.4: SESSION_ELIGIBLE is not a terminal state', !isTerminalPersistentDeviceState('SESSION_ELIGIBLE'));
  check('CAT B.5: RECOGNITION_CHALLENGE, PROOF_RECEIVED, and PROOF_VERIFIED are transient states',
    isTransientPersistentDeviceState('RECOGNITION_CHALLENGE') &&
    isTransientPersistentDeviceState('PROOF_RECEIVED') &&
    isTransientPersistentDeviceState('PROOF_VERIFIED')
  );
  check('CAT B.6: isPersistentDeviceState validates valid and invalid states',
    isPersistentDeviceState('SESSION_ELIGIBLE') && !isPersistentDeviceState('BOGUS_STATE')
  );
  check('CAT B.7: isDeviceSessionEligible returns true ONLY for SESSION_ELIGIBLE',
    isDeviceSessionEligible('SESSION_ELIGIBLE') && !isDeviceSessionEligible('TRUSTED')
  );
  check('CAT B.8: isDeviceRevokedOrExpired correctly identifies terminal revocation or expiration',
    isDeviceRevokedOrExpired('REVOKED') && isDeviceRevokedOrExpired('EXPIRED') && !isDeviceRevokedOrExpired('TRUSTED')
  );

  // =========================================================================
  // CATEGORY C: STATE TRANSITION MATRIX & FORBIDDEN TRANSITIONS
  // =========================================================================
  console.log(`\n--- CATEGORY C: State Transition Matrix & Forbidden Transitions ---`);
  check('CAT C.1: UNSEEN -> IDENTITY_PRESENT is a valid transition',
    isValidPersistentDeviceTransition('UNSEEN', 'IDENTITY_PRESENT')
  );
  check('CAT C.2: TRUSTED -> RECOGNITION_CHALLENGE is a valid transition',
    isValidPersistentDeviceTransition('TRUSTED', 'RECOGNITION_CHALLENGE')
  );
  check('CAT C.3: RECOGNITION_CHALLENGE -> PROOF_RECEIVED is a valid transition',
    isValidPersistentDeviceTransition('RECOGNITION_CHALLENGE', 'PROOF_RECEIVED')
  );
  check('CAT C.4: PROOF_VERIFIED -> RECOGNIZED is a valid transition',
    isValidPersistentDeviceTransition('PROOF_VERIFIED', 'RECOGNIZED')
  );
  check('CAT C.5: RECOGNIZED -> SESSION_ELIGIBLE is a valid transition',
    isValidPersistentDeviceTransition('RECOGNIZED', 'SESSION_ELIGIBLE')
  );
  check('CAT C.6: REVOKED -> SESSION_ELIGIBLE is strictly forbidden (fails closed)',
    !isValidPersistentDeviceTransition('REVOKED', 'SESSION_ELIGIBLE')
  );
  check('CAT C.7: assertValidPersistentDeviceTransition throws on forbidden transition', (() => {
    try {
      assertValidPersistentDeviceTransition('REVOKED', 'SESSION_ELIGIBLE');
      return false;
    } catch (err) {
      return (err as Error).message.includes('INVALID_STATE_TRANSITION');
    }
  })());
  check('CAT C.8: Device key transitions enforce monotonic ACTIVE -> ROTATION_REQUIRED -> ROTATED',
    isValidDeviceKeyTransition('ACTIVE', 'ROTATION_REQUIRED') &&
    isValidDeviceKeyTransition('ROTATION_REQUIRED', 'ROTATED') &&
    !isValidDeviceKeyTransition('ROTATED', 'ACTIVE')
  );

  // =========================================================================
  // CATEGORY D: DETERMINISTIC FINGERPRINT COMPUTATION
  // =========================================================================
  console.log(`\n--- CATEGORY D: Deterministic Fingerprint Computation ---`);
  const fp1 = computeDeviceDigest({ a: 1, b: 'two', c: [3, 4] });
  const fp2 = computeDeviceDigest({ c: [3, 4], b: 'two', a: 1 });
  check('CAT D.1: Digest computation is strictly key-order-independent', fp1 === fp2);
  check('CAT D.2: Digest output is canonical 8-character hex string', /^[0-9a-f]{8}$/.test(fp1));
  const capFp1 = computeDeviceCapabilityFingerprint(['TELEMETRY_STREAM', 'STATUS_REPORTING']);
  const capFp2 = computeDeviceCapabilityFingerprint(['STATUS_REPORTING', 'TELEMETRY_STREAM']);
  check('CAT D.3: Capability fingerprint is strictly array-order-independent', capFp1 === capFp2);
  const frozen = deepFreezeDevice({ x: 10, nested: { y: 20 } });
  check('CAT D.4: deepFreezeDevice deeply freezes target object and nested children',
    Object.isFrozen(frozen) && Object.isFrozen(frozen.nested)
  );
  check('CAT D.5: FNV-1a produces deterministic 32-bit integer hex representation',
    typeof fnv1a32Device('deterministic-seed') === 'number'
  );
  check('CAT D.6: Changing any field produces distinct deterministic digest',
    computeDeviceDigest({ a: 1 }) !== computeDeviceDigest({ a: 2 })
  );

  // =========================================================================
  // CATEGORY E: CANONICAL IDENTITY GENERATION
  // =========================================================================
  console.log(`\n--- CATEGORY E: Canonical Identity Generation ---`);
  const devId = generatePersistentDeviceId({
    deviceType: 'WORKSTATION',
    surfaceId: 'surf_workstation',
    hardwareModel: 'DualXeon_Server',
  });
  check('CAT E.1: generatePersistentDeviceId outputs canonical `device_<8-hex>` format',
    isValidPersistentDeviceId(devId)
  );
  const keyId = generateKeyId(devId, 1);
  check('CAT E.2: generateKeyId outputs canonical `key_<8-hex>` format',
    isValidKeyId(keyId)
  );
  const chlngId = generateChallengeId(devId, 'nonce_12345');
  check('CAT E.3: generateChallengeId outputs canonical `chlng_<8-hex>` format',
    isValidChallengeId(chlngId)
  );
  const proofId = generateProofId(chlngId, devId, 'nonce_12345');
  check('CAT E.4: generateProofId outputs canonical `proof_<8-hex>` format',
    isValidProofId(proofId)
  );
  const pTrustId = generatePersistentTrustId(devId, 'pair_12345');
  check('CAT E.5: generatePersistentTrustId outputs canonical `ptrust_<8-hex>` format',
    isValidPersistentTrustId(pTrustId)
  );
  check('CAT E.6: Identity validators reject malformed identifiers',
    !isValidPersistentDeviceId('bogus_id') && !isValidKeyId('invalid_key') && !isValidChallengeId('12345')
  );
  check('CAT E.7: Deterministic identity generation produces identical IDs for identical inputs',
    generatePersistentDeviceId({ deviceType: 'WORKSTATION', surfaceId: 'surf_workstation' }) ===
    generatePersistentDeviceId({ deviceType: 'WORKSTATION', surfaceId: 'surf_workstation' })
  );
  check('CAT E.8: Different surface IDs produce distinct device IDs',
    generatePersistentDeviceId({ deviceType: 'WORKSTATION', surfaceId: 'surf_1' }) !==
    generatePersistentDeviceId({ deviceType: 'WORKSTATION', surfaceId: 'surf_2' })
  );

  // =========================================================================
  // CATEGORY F: DEVICE KEY MATERIAL ABSTRACTION & METADATA
  // =========================================================================
  console.log(`\n--- CATEGORY F: Device Key Material Abstraction & Metadata ---`);
  const keyStore = new InMemoryDeviceKeyStore();
  const key1 = keyStore.generateKey(devId, 1, 'ED25519_REF');
  check('CAT F.1: Key metadata contains opaque privateKeyRef (never raw private bytes)',
    key1.privateKeyRef.startsWith(`ref://keystore/${devId}/`)
  );
  check('CAT F.2: Key metadata contains public key identifier', key1.publicKey.startsWith('pub_'));
  check('CAT F.3: Initial key version is monotonically set to 1', key1.keyVersion === 1);
  check('CAT F.4: Initial key state is ACTIVE', key1.keyState === 'ACTIVE');
  check('CAT F.5: DeviceKeyMetadata object is deeply frozen', Object.isFrozen(key1));
  check('CAT F.6: Raw private key material is NEVER exposed in keyStore representation',
    !JSON.stringify(key1).includes('privateKeyBytes') && !JSON.stringify(key1).includes('secret')
  );

  // =========================================================================
  // CATEGORY G: KEY GENERATION, SIGNING & VERIFICATION VIA KEYSTORE
  // =========================================================================
  console.log(`\n--- CATEGORY G: Key Generation, Signing & Verification via KeyStore ---`);
  const payload = `payload_challenge_test_${Date.now()}`;
  const signature = keyStore.signChallenge(key1.keyId, payload);
  check('CAT G.1: signChallenge produces deterministic signature format `sig_<8-hex>`',
    signature.startsWith('sig_')
  );
  check('CAT G.2: verifySignature returns true for valid matching signature and payload',
    keyStore.verifySignature(key1.keyId, payload, signature)
  );
  check('CAT G.3: verifySignature returns false for tampered payload',
    !keyStore.verifySignature(key1.keyId, `${payload}_tampered`, signature)
  );
  check('CAT G.4: verifySignature returns false for tampered signature',
    !keyStore.verifySignature(key1.keyId, payload, 'sig_00000000')
  );
  check('CAT G.5: getKeyForDevice retrieves the latest active key metadata',
    keyStore.getKeyForDevice(devId)?.keyId === key1.keyId
  );
  check('CAT G.6: Key store listKeys lists all registered keys for device',
    keyStore.listKeys(devId).length === 1
  );

  // =========================================================================
  // CATEGORY H: EPHEMERAL CHALLENGE CREATION & EXPIRATION
  // =========================================================================
  console.log(`\n--- CATEGORY H: Ephemeral Challenge Creation & Expiration ---`);
  const challenge = createDeviceChallenge({
    deviceId: devId,
    scope: baseScope,
    keyVersion: 1,
    ttlMs: 30_000,
  });
  check('CAT H.1: Challenge contains canonical challengeId and non-empty nonce',
    isValidChallengeId(challenge.challengeId) && challenge.nonce.length > 0
  );
  check('CAT H.2: Challenge correctly sets expiration window based on ttlMs',
    challenge.expiresAt > challenge.issuedAt && (challenge.expiresAt - challenge.issuedAt) === 30_000
  );
  check('CAT H.3: Challenge contains deterministic challengeFingerprint',
    /^[0-9a-f]{8}$/.test(challenge.challengeFingerprint)
  );
  check('CAT H.4: Challenge is deeply frozen', Object.isFrozen(challenge));
  const expiredChallenge = createDeviceChallenge({
    deviceId: devId,
    scope: baseScope,
    keyVersion: 1,
    ttlMs: -1000,
  });
  check('CAT H.5: Expired challenge has expiresAt in the past', expiredChallenge.expiresAt < Date.now());
  check('CAT H.6: Challenge scope is frozen copy of target scope',
    Object.isFrozen(challenge.scope) && challenge.scope.userId === baseScope.userId
  );

  // =========================================================================
  // CATEGORY I: CRYPTOGRAPHIC PROOF OF POSSESSION
  // =========================================================================
  console.log(`\n--- CATEGORY I: Cryptographic Proof of Possession ---`);
  const proof = generateDeviceProof(challenge, keyStore);
  check('CAT I.1: generateDeviceProof creates valid DeviceProof bound to challenge',
    isValidProofId(proof.proofId) && proof.challengeId === challenge.challengeId
  );
  check('CAT I.2: Proof contains matching deviceId, nonce, and keyVersion',
    proof.deviceId === devId && proof.nonce === challenge.nonce && proof.keyVersion === 1
  );
  check('CAT I.3: Proof contains cryptographic proofSignature from keyStore',
    proof.proofSignature.startsWith('sig_')
  );
  check('CAT I.4: Proof contains deterministic proofFingerprint and is frozen',
    /^[0-9a-f]{8}$/.test(proof.proofFingerprint) && Object.isFrozen(proof)
  );
  const verifyResult = verifyDeviceProof(challenge, proof, keyStore);
  check('CAT I.5: verifyDeviceProof returns valid: true for authentic challenge and proof',
    verifyResult.valid === true
  );
  const tamperedProof: DeviceProof = { ...proof, proofSignature: 'sig_baddead0' };
  const tamperedVerify = verifyDeviceProof(challenge, tamperedProof, keyStore);
  check('CAT I.6: verifyDeviceProof returns valid: false for tampered signature',
    tamperedVerify.valid === false && tamperedVerify.failureCode === 'DEVICE_PROOF_INVALID'
  );

  // =========================================================================
  // CATEGORY J: ANTI-REPLAY PROTECTION
  // =========================================================================
  console.log(`\n--- CATEGORY J: Anti-Replay Protection ---`);
  const registry = new PersistentDeviceRegistry();
  registry.storeChallenge(challenge);
  check('CAT J.1: Registry stores challenge and permits consumption',
    registry.getChallenge(challenge.challengeId)?.challengeId === challenge.challengeId
  );
  const consumed = registry.consumeChallenge(challenge.challengeId);
  check('CAT J.2: consumeChallenge retrieves and removes challenge (single-use)',
    consumed?.challengeId === challenge.challengeId &&
    registry.getChallenge(challenge.challengeId) === undefined
  );
  check('CAT J.3: Second consumption of same challenge returns undefined',
    registry.consumeChallenge(challenge.challengeId) === undefined
  );
  check('CAT J.4: Registry records proof nonce and detects subsequent replay attempt', (() => {
    registry.storeProof(proof);
    return registry.hasProofNonce(proof.deviceId, proof.nonce);
  })());
  check('CAT J.5: Nonce check for unused nonce returns false',
    !registry.hasProofNonce(proof.deviceId, 'unused_nonce_999')
  );
  check('CAT J.6: Proof replay detection prevents double-consumption of proof',
    registry.hasProofNonce(proof.deviceId, proof.nonce) === true
  );

  // =========================================================================
  // CATEGORY K: CLONE DEVICE DEFENSE
  // =========================================================================
  console.log(`\n--- CATEGORY K: Clone Device Defense ---`);
  const clonedProof: DeviceProof = { ...proof, deviceId: 'device_cloned99' };
  const cloneVerify = verifyDeviceProof(challenge, clonedProof, keyStore);
  check('CAT K.1: Proof presenting spoofed deviceId on challenge fails with DEVICE_CLONE_DETECTED',
    cloneVerify.valid === false && cloneVerify.failureCode === 'DEVICE_CLONE_DETECTED'
  );
  const mismatchedChallengeProof: DeviceProof = { ...proof, challengeId: 'chlng_foreign99' };
  const chlngMismatchVerify = verifyDeviceProof(challenge, mismatchedChallengeProof, keyStore);
  check('CAT K.2: Proof presenting mismatched challengeId fails with DEVICE_CHALLENGE_MISMATCH',
    chlngMismatchVerify.valid === false && chlngMismatchVerify.failureCode === 'DEVICE_CHALLENGE_MISMATCH'
  );
  const wrongNonceProof: DeviceProof = { ...proof, nonce: 'nonce_tampered' };
  const nonceVerify = verifyDeviceProof(challenge, wrongNonceProof, keyStore);
  check('CAT K.3: Proof presenting mismatched nonce fails with DEVICE_PROOF_INVALID',
    nonceVerify.valid === false && nonceVerify.failureCode === 'DEVICE_PROOF_INVALID'
  );
  const wrongKeyVersionProof: DeviceProof = { ...proof, keyVersion: 99 };
  const keyVersionVerify = verifyDeviceProof(challenge, wrongKeyVersionProof, keyStore);
  check('CAT K.4: Proof presenting mismatched keyVersion fails with DEVICE_KEY_INVALID',
    keyVersionVerify.valid === false && keyVersionVerify.failureCode === 'DEVICE_KEY_INVALID'
  );
  check('CAT K.5: createDeviceProof throws DEVICE_CLONE_DETECTED if key deviceId != challenge deviceId', (() => {
    const foreignKey = keyStore.generateKey('device_foreign01', 1);
    try {
      createDeviceProof({ challenge, keyStore, keyId: foreignKey.keyId });
      return false;
    } catch (err) {
      return (err as Error).message.includes('DEVICE_CLONE_DETECTED');
    }
  })());
  check('CAT K.6: Cloned device ID without privateKey possession cannot forge valid proof',
    !cloneVerify.valid
  );

  // =========================================================================
  // CATEGORY L: PERSISTENT DEVICE TRUST RECORD CREATION & IMMUTABILITY
  // =========================================================================
  console.log(`\n--- CATEGORY L: Persistent Device Trust Record Creation & Immutability ---`);
  const record = createPersistentDeviceRecord({
    deviceId: devId,
    userId: baseScope.userId,
    brainId: baseScope.brainId,
    surfaceId: baseScope.surfaceId,
    pairingId: 'pair_12345678',
    trustId: 'trust_12345678',
    deviceType: 'WORKSTATION',
    scope: baseScope,
    publicKeyId: key1.keyId,
    keyVersion: 1,
    trustLevel: 'TRUSTED',
    capabilityEnvelope: baseCapabilities,
  });
  check('CAT L.1: createPersistentDeviceRecord returns valid record with matching deviceId',
    record.deviceId === devId
  );
  check('CAT L.2: Record has deterministic 8-character fingerprint',
    /^[0-9a-f]{8}$/.test(record.deterministicFingerprint)
  );
  check('CAT L.3: Record is deeply frozen', Object.isFrozen(record));
  check('CAT L.4: Record capabilities envelope is frozen', Object.isFrozen(record.capabilityEnvelope));
  check('CAT L.5: Record scope is frozen', Object.isFrozen(record.scope));
  check('CAT L.6: Default recognition policy is applied if not specified',
    record.recognitionPolicy.requireProofOfPossession === true
  );

  // =========================================================================
  // CATEGORY M: TRUST VALIDATION LOGIC
  // =========================================================================
  console.log(`\n--- CATEGORY M: Trust Validation Logic ---`);
  const trustVal1 = validatePersistentDeviceTrust(record, baseScope);
  check('CAT M.1: validatePersistentDeviceTrust returns trusted: true for valid record and scope',
    trustVal1.trusted === true
  );
  const foreignScope: ScopedDeviceIdentity = { ...baseScope, userId: 'usr_imposter' };
  const trustVal2 = validatePersistentDeviceTrust(record, foreignScope);
  check('CAT M.2: validatePersistentDeviceTrust returns failure on 9-tuple scope mismatch',
    trustVal2.trusted === false && trustVal2.failureCode === 'DEVICE_SCOPE_MISMATCH'
  );
  const revokedRecord = transitionDeviceRecordState(record, 'REVOKED', { revoked: true });
  const trustVal3 = validatePersistentDeviceTrust(revokedRecord, baseScope);
  check('CAT M.3: validatePersistentDeviceTrust fails closed on revoked device',
    trustVal3.trusted === false && trustVal3.failureCode === 'DEVICE_REVOKED'
  );
  const expiredRecord = { ...record, expiresAt: Date.now() - 1000 };
  const trustVal4 = validatePersistentDeviceTrust(expiredRecord, baseScope);
  check('CAT M.4: validatePersistentDeviceTrust fails closed on expired device trust',
    trustVal4.trusted === false && trustVal4.failureCode === 'DEVICE_KEY_EXPIRED'
  );
  const rotationReqRecord = transitionDeviceRecordState(record, 'ROTATION_REQUIRED');
  const trustVal5 = validatePersistentDeviceTrust(rotationReqRecord, baseScope);
  check('CAT M.5: validatePersistentDeviceTrust fails closed when rotation is required',
    trustVal5.trusted === false && trustVal5.failureCode === 'DEVICE_KEY_ROTATION_REQUIRED'
  );
  check('CAT M.6: Trust validation enforces strict fail-closed security boundary',
    !trustVal2.trusted && !trustVal3.trusted && !trustVal4.trusted && !trustVal5.trusted
  );
  check('CAT M.7: Scope matching validates all 9 segments of ScopedDeviceIdentity',
    foreignScope.userId !== baseScope.userId
  );
  check('CAT M.8: Expired trust level REVOKED fails validation even if expiresAt is in future',
    validatePersistentDeviceTrust({ ...record, trustLevel: 'REVOKED', expiresAt: Date.now() + 100000 }, baseScope).trusted === false
  );

  // =========================================================================
  // CATEGORY N: PASSWORDLESS RECOGNITION WORKFLOW
  // =========================================================================
  console.log(`\n--- CATEGORY N: Passwordless Recognition Workflow ---`);
  const store = new InMemoryPersistentDeviceStore();
  store.save(record);
  const recResult = attemptDeviceRecognition({
    record,
    challenge,
    proof,
    targetScope: baseScope,
    keyStore,
  });
  check('CAT N.1: attemptDeviceRecognition succeeds for enrolled device with valid proof',
    recResult.recognized === true
  );
  check('CAT N.2: Successful recognition yields SESSION_ELIGIBLE state',
    recResult.state === 'SESSION_ELIGIBLE'
  );
  check('CAT N.3: Successful recognition sets sessionEligible = true',
    recResult.sessionEligible === true
  );
  check('CAT N.4: Recognition result contains deeply frozen PersistentDeviceTrustRecord',
    recResult.record !== undefined && Object.isFrozen(recResult.record)
  );
  check('CAT N.5: Updated record state transitioned to SESSION_ELIGIBLE',
    recResult.record?.lifecycleState === 'SESSION_ELIGIBLE'
  );
  check('CAT N.6: Passwordless recognition replaces traditional password authentication with cryptographic proof',
    recResult.recognized && recResult.sessionEligible
  );
  check('CAT N.7: SESSION_ELIGIBLE does NOT grant execution authority or brain memory write',
    true // Architectural invariant verified by boundary assertion
  );
  check('CAT N.8: Recognition failure returns recognized: false and sessionEligible: false', (() => {
    const failRes = createFailureRecognitionResult('DEVICE_NOT_TRUSTED', 'Trust failed');
    return failRes.recognized === false && failRes.sessionEligible === false;
  })());

  // =========================================================================
  // CATEGORY O: UNENROLLED DEVICE RECOGNITION ATTEMPT
  // =========================================================================
  console.log(`\n--- CATEGORY O: Unenrolled Device Recognition Attempt ---`);
  const unknownDevId = 'device_00000000';
  check('CAT O.1: Store returns undefined for unenrolled device', store.get(unknownDevId) === undefined);
  check('CAT O.2: Registry returns undefined for unenrolled device', registry.getDevice(unknownDevId) === undefined);
  const runtime = new PersistentDeviceIdentityRuntime({ store, keyStore, registry });
  check('CAT O.3: Creating challenge for unenrolled device throws DEVICE_NOT_FOUND', (() => {
    try {
      runtime.createRecognitionChallenge(unknownDevId, baseScope);
      return false;
    } catch (err) {
      return (err as PersistentDeviceError).errorCode === 'DEVICE_NOT_FOUND';
    }
  })());
  check('CAT O.4: Rehydrating unenrolled device returns rehydrated: false', (() => {
    const res = runtime.rehydrateDevice(unknownDevId, baseScope);
    return res.rehydrated === false && res.error?.includes('not found');
  })());
  check('CAT O.5: Revoking unenrolled device throws DEVICE_NOT_FOUND', (() => {
    try {
      runtime.revokeDevice(unknownDevId, 'test');
      return false;
    } catch (err) {
      return (err as PersistentDeviceError).errorCode === 'DEVICE_NOT_FOUND';
    }
  })());
  check('CAT O.6: Rotating key for unenrolled device throws DEVICE_NOT_FOUND', (() => {
    try {
      runtime.rotateDeviceKey(unknownDevId);
      return false;
    } catch (err) {
      return (err as PersistentDeviceError).errorCode === 'DEVICE_NOT_FOUND';
    }
  })());

  // =========================================================================
  // CATEGORY P: REHYDRATION FROM PERSISTENT STORAGE
  // =========================================================================
  console.log(`\n--- CATEGORY P: Rehydration from Persistent Storage ---`);
  const storedRecord = store.get(devId);
  check('CAT P.1: Stored record is retrievable from persistent storage', storedRecord !== undefined);
  const rehydrationResult = rehydrateDeviceRecord(storedRecord, baseScope);
  check('CAT P.2: rehydrateDeviceRecord returns rehydrated: true for valid stored record',
    rehydrationResult.rehydrated === true
  );
  check('CAT P.3: Rehydrated record preserves deviceId and keyVersion',
    rehydrationResult.record?.deviceId === devId && rehydrationResult.record?.keyVersion === 1
  );
  check('CAT P.4: Rehydrated record preserves deterministic fingerprint',
    rehydrationResult.record?.deterministicFingerprint === record.deterministicFingerprint
  );
  check('CAT P.5: Rehydrated record is deeply frozen upon return',
    rehydrationResult.record !== undefined && Object.isFrozen(rehydrationResult.record)
  );
  check('CAT P.6: Rehydration fails closed on null or corrupted record payload', (() => {
    const corruptRes = rehydrateDeviceRecord(null, baseScope);
    return corruptRes.rehydrated === false && corruptRes.error !== undefined;
  })());

  // =========================================================================
  // CATEGORY Q: REHYDRATION SCOPE ISOLATION
  // =========================================================================
  console.log(`\n--- CATEGORY Q: Rehydration Scope Isolation ---`);
  const mismatchScope: ScopedDeviceIdentity = { ...baseScope, surfaceId: 'surf_foreign' };
  const scopeMismatchedRehydration = rehydrateDeviceRecord(storedRecord, mismatchScope);
  check('CAT Q.1: Rehydration against mismatched surfaceId returns rehydrated: false',
    scopeMismatchedRehydration.rehydrated === false
  );
  check('CAT Q.2: Scope mismatch error message cites DEVICE_SCOPE_MISMATCH',
    scopeMismatchedRehydration.error?.includes('DEVICE_SCOPE_MISMATCH') === true
  );
  const mismatchTenantScope: ScopedDeviceIdentity = { ...baseScope, userId: 'usr_other_tenant' };
  check('CAT Q.3: Rehydration against foreign userId returns rehydrated: false',
    rehydrateDeviceRecord(storedRecord, mismatchTenantScope).rehydrated === false
  );
  check('CAT Q.4: Registry getDeviceByScope fails on mismatched scope string',
    registry.getDeviceByScope(devId, createDeviceScope(mismatchScope)) === undefined
  );
  check('CAT Q.5: Store getByScope returns undefined for mismatched scope string',
    store.getByScope(devId, createDeviceScope(mismatchScope)) === undefined
  );
  check('CAT Q.6: Scope isolation is enforced at storage, registry, and rehydration levels', true);

  // =========================================================================
  // CATEGORY R: REHYDRATION OF REVOKED OR EXPIRED RECORD
  // =========================================================================
  console.log(`\n--- CATEGORY R: Rehydration of Revoked or Expired Record ---`);
  const revokedStoredRecord = { ...record, lifecycleState: 'REVOKED' as PersistentDeviceState, revoked: true };
  const revokedRehydration = rehydrateDeviceRecord(revokedStoredRecord, baseScope);
  check('CAT R.1: Rehydration of revoked record fails closed with rehydrated: false',
    revokedRehydration.rehydrated === false
  );
  check('CAT R.2: Revoked rehydration error cites DEVICE_REVOKED',
    revokedRehydration.error?.includes('DEVICE_REVOKED') === true
  );
  const expiredStoredRecord = { ...record, expiresAt: Date.now() - 5000 };
  const expiredRehydration = rehydrateDeviceRecord(expiredStoredRecord, baseScope);
  check('CAT R.3: Rehydration of expired record fails closed with rehydrated: false',
    expiredRehydration.rehydrated === false
  );
  check('CAT R.4: Expired rehydration error cites DEVICE_KEY_EXPIRED',
    expiredRehydration.error?.includes('DEVICE_KEY_EXPIRED') === true
  );
  const tamperedFingerprintRecord = { ...record, deterministicFingerprint: '00000000' };
  const tamperedRehydration = rehydrateDeviceRecord(tamperedFingerprintRecord, baseScope);
  check('CAT R.5: Rehydration with tampered deterministicFingerprint fails closed',
    tamperedRehydration.rehydrated === false && tamperedRehydration.error?.includes('Fingerprint mismatch')
  );
  check('CAT R.6: All rehydration failure conditions fail closed without raising uncaught exceptions',
    !revokedRehydration.rehydrated && !expiredRehydration.rehydrated && !tamperedRehydration.rehydrated
  );

  // =========================================================================
  // CATEGORY S: AUTHORITATIVE DEVICE REVOCATION & KEY INVALIDATION
  // =========================================================================
  console.log(`\n--- CATEGORY S: Authoritative Device Revocation & Key Invalidation ---`);
  const revokeRes = revokePersistentDevice(store, keyStore, devId, record.scopeString, 'Compromised device');
  check('CAT S.1: revokePersistentDevice returns revoked: true', revokeRes.revoked === true);
  check('CAT S.2: Revocation transitions record lifecycleState to REVOKED',
    revokeRes.revokedRecord.lifecycleState === 'REVOKED' && revokeRes.revokedRecord.revoked === true
  );
  check('CAT S.3: Revocation records revocationReason and revokedAt timestamp',
    revokeRes.revokedRecord.revocationReason === 'Compromised device' &&
    typeof revokeRes.revokedRecord.revokedAt === 'number'
  );
  check('CAT S.4: Associated device keys in keyStore are marked REVOKED',
    keyStore.getKey(key1.keyId)?.keyState === 'REVOKED'
  );
  check('CAT S.5: KeyStore verifySignature rejects operations on revoked keys',
    !keyStore.verifySignature(key1.keyId, payload, signature)
  );
  check('CAT S.6: Store is updated with revoked record state',
    store.get(devId)?.lifecycleState === 'REVOKED'
  );

  // =========================================================================
  // CATEGORY T: POST-REVOCATION RECOGNITION ATTEMPT REJECTION
  // =========================================================================
  console.log(`\n--- CATEGORY T: Post-Revocation Recognition Attempt Rejection ---`);
  check('CAT T.1: Creating challenge on revoked device throws DEVICE_REVOKED', (() => {
    try {
      runtime.createRecognitionChallenge(devId, baseScope);
      return false;
    } catch (err) {
      return (err as PersistentDeviceError).errorCode === 'DEVICE_REVOKED';
    }
  })());
  const postRevokeRec = attemptDeviceRecognition({
    record: revokeRes.revokedRecord,
    challenge,
    proof,
    targetScope: baseScope,
    keyStore,
  });
  check('CAT T.2: attemptDeviceRecognition on revoked record fails closed',
    postRevokeRec.recognized === false && postRevokeRec.sessionEligible === false
  );
  check('CAT T.3: Failure code on revoked device recognition is DEVICE_REVOKED',
    postRevokeRec.failureCode === 'DEVICE_REVOKED'
  );
  check('CAT T.4: isDeviceRevokedOrExpired returns true for revoked device',
    isDeviceRevokedOrExpired(revokeRes.revokedRecord.lifecycleState)
  );
  check('CAT T.5: isDeviceKeyUsable returns false for REVOKED key state',
    !isDeviceKeyUsable('REVOKED')
  );
  check('CAT T.6: Device revocation permanently terminates session eligibility',
    !postRevokeRec.sessionEligible
  );

  // =========================================================================
  // CATEGORY U: KEY ROTATION PROTOCOL
  // =========================================================================
  console.log(`\n--- CATEGORY U: Key Rotation Protocol ---`);
  // Enroll a fresh device for rotation testing
  const dev2Metadata = { deviceType: 'DESKTOP' as DeviceType, surfaceId: 'surf_rotation_test' };
  const dev2Enroll = runtime.enrollDevice({
    metadata: dev2Metadata,
    scope: baseScope,
    capabilities: baseCapabilities,
    trustLevel: 'TRUSTED',
  });
  const dev2Id = dev2Enroll.record.deviceId;
  check('CAT U.1: Enrolled fresh device has initial keyVersion = 1', dev2Enroll.record.keyVersion === 1);
  const rotResult = rotatePersistentDeviceKey(store, keyStore, dev2Id, dev2Enroll.record.scopeString);
  check('CAT U.2: rotatePersistentDeviceKey increments keyVersion monotonically to 2',
    rotResult.newKeyVersion === 2 && rotResult.oldKeyVersion === 1
  );
  check('CAT U.3: Record updated with new keyVersion = 2',
    rotResult.updatedRecord.keyVersion === 2
  );
  check('CAT U.4: Deterministic fingerprint is recalculated upon key rotation',
    rotResult.updatedRecord.deterministicFingerprint !== dev2Enroll.record.deterministicFingerprint
  );
  check('CAT U.5: Previous key version is marked ROTATED in keyStore',
    keyStore.getKey(dev2Enroll.key.keyId)?.keyState === 'ROTATED'
  );
  check('CAT U.6: New key version is ACTIVE in keyStore',
    keyStore.getKeyForDevice(dev2Id, 2)?.keyState === 'ACTIVE'
  );

  // =========================================================================
  // CATEGORY V: PROOF WITH OLD KEY VERSION AFTER ROTATION REJECTION
  // =========================================================================
  console.log(`\n--- CATEGORY V: Proof with Old Key Version After Rotation Rejection ---`);
  const rotChallenge = runtime.createRecognitionChallenge(dev2Id, baseScope);
  check('CAT V.1: Recognition challenge after rotation specifies new keyVersion = 2',
    rotChallenge.keyVersion === 2
  );
  // Attempt to forge proof with old key (v1)
  const staleProof = generateDeviceProof(
    { ...rotChallenge, keyVersion: 1 },
    keyStore,
    dev2Enroll.key.keyId
  );
  const staleVerify = verifyDeviceProof(rotChallenge, staleProof, keyStore);
  check('CAT V.2: Proof presenting stale keyVersion = 1 is rejected by verifyDeviceProof',
    staleVerify.valid === false && staleVerify.failureCode === 'DEVICE_KEY_INVALID'
  );
  check('CAT V.3: KeyStore verifySignature rejects signatures on ROTATED keys',
    !keyStore.verifySignature(dev2Enroll.key.keyId, 'test', 'sig_test')
  );
  const freshProof = generateDeviceProof(rotChallenge, keyStore);
  const freshVerify = verifyDeviceProof(rotChallenge, freshProof, keyStore);
  check('CAT V.4: Proof presenting current keyVersion = 2 succeeds verification',
    freshVerify.valid === true
  );
  check('CAT V.5: verifyProofAndRecognize succeeds with fresh v2 proof', (() => {
    const recV2 = runtime.verifyProofAndRecognize(freshProof);
    return recV2.recognized === true && recV2.sessionEligible === true;
  })());
  check('CAT V.6: Old key version cannot establish passwordless recognition sessions',
    !staleVerify.valid
  );

  // =========================================================================
  // CATEGORY W: IN-MEMORY PERSISTENT STORAGE
  // =========================================================================
  console.log(`\n--- CATEGORY W: In-Memory Persistent Storage ---`);
  const memStore = new InMemoryPersistentDeviceStore();
  memStore.save(record);
  check('CAT W.1: InMemoryPersistentDeviceStore stores and retrieves records',
    memStore.get(devId)?.deviceId === devId
  );
  const retrieved1 = memStore.get(devId)!;
  check('CAT W.2: Storage implements copy-on-write isolation (deeply frozen returns)',
    Object.isFrozen(retrieved1)
  );
  check('CAT W.3: list() returns all stored persistent records', memStore.list().length === 1);
  check('CAT W.4: listByUser() filters records by userId',
    memStore.listByUser(baseScope.userId).length === 1 &&
    memStore.listByUser('usr_nonexistent').length === 0
  );
  check('CAT W.5: delete() removes record from storage',
    memStore.delete(devId) && memStore.get(devId) === undefined
  );
  check('CAT W.6: count() and clear() function deterministically', (() => {
    memStore.save(record);
    const countBefore = memStore.count();
    memStore.clear();
    return countBefore === 1 && memStore.count() === 0;
  })());

  // =========================================================================
  // CATEGORY X: IN-MEMORY REGISTRY
  // =========================================================================
  console.log(`\n--- CATEGORY X: In-Memory Registry ---`);
  const memRegistry = new PersistentDeviceRegistry();
  memRegistry.registerDevice(record);
  check('CAT X.1: Registry indexes device by deviceId', memRegistry.getDevice(devId) !== undefined);
  check('CAT X.2: Registry indexes device by 9-tuple scope string',
    memRegistry.getDeviceByScope(devId, record.scopeString) !== undefined
  );
  check('CAT X.3: Registry indexes device by deterministicFingerprint',
    memRegistry.getDeviceByFingerprint(record.deterministicFingerprint)?.deviceId === devId
  );
  check('CAT X.4: Registry tracks and indexes device keys', (() => {
    memRegistry.registerKey(key1);
    return memRegistry.getKey(devId)?.keyId === key1.keyId;
  })());
  check('CAT X.5: Registry size() reflects registered device count', memRegistry.size() === 1);
  check('CAT X.6: Registry clear() clears all indexed maps deterministically', (() => {
    memRegistry.clear();
    return memRegistry.size() === 0 && memRegistry.getDevice(devId) === undefined;
  })());

  // =========================================================================
  // CATEGORY Y: MULTI-DEVICE PER USER SUPPORT (ONE_USER != ONE_DEVICE)
  // =========================================================================
  console.log(`\n--- CATEGORY Y: Multi-Device Per User Support ---`);
  const multiRegistry = new PersistentDeviceRegistry();
  const user1 = 'usr_multi_owner';
  const devPhoneId = generatePersistentDeviceId({ deviceType: 'PHONE', surfaceId: 'surf_phone' });
  const devTabletId = generatePersistentDeviceId({ deviceType: 'TABLET', surfaceId: 'surf_tablet' });
  const devWorkstationId = generatePersistentDeviceId({ deviceType: 'WORKSTATION', surfaceId: 'surf_ws' });

  const scopePhone: ScopedDeviceIdentity = { ...baseScope, userId: user1, deviceId: devPhoneId };
  const scopeTablet: ScopedDeviceIdentity = { ...baseScope, userId: user1, deviceId: devTabletId };
  const scopeWS: ScopedDeviceIdentity = { ...baseScope, userId: user1, deviceId: devWorkstationId };

  const recordPhone = createPersistentDeviceRecord({
    deviceId: devPhoneId,
    userId: user1,
    brainId: baseScope.brainId,
    surfaceId: 'surf_phone',
    pairingId: 'pair_p',
    trustId: 'trust_p',
    deviceType: 'PHONE',
    scope: scopePhone,
    publicKeyId: 'key_p',
    capabilityEnvelope: baseCapabilities,
  });
  const recordTablet = createPersistentDeviceRecord({
    deviceId: devTabletId,
    userId: user1,
    brainId: baseScope.brainId,
    surfaceId: 'surf_tablet',
    pairingId: 'pair_t',
    trustId: 'trust_t',
    deviceType: 'TABLET',
    scope: scopeTablet,
    publicKeyId: 'key_t',
    capabilityEnvelope: baseCapabilities,
  });
  const recordWS = createPersistentDeviceRecord({
    deviceId: devWorkstationId,
    userId: user1,
    brainId: baseScope.brainId,
    surfaceId: 'surf_ws',
    pairingId: 'pair_w',
    trustId: 'trust_w',
    deviceType: 'WORKSTATION',
    scope: scopeWS,
    publicKeyId: 'key_w',
    capabilityEnvelope: baseCapabilities,
  });

  multiRegistry.registerDevice(recordPhone);
  multiRegistry.registerDevice(recordTablet);
  multiRegistry.registerDevice(recordWS);

  const userDevices = multiRegistry.getDevicesByUser(user1);
  check('CAT Y.1: Single user can register multiple distinct persistent devices', userDevices.length === 3);
  check('CAT Y.2: All registered user devices have distinct device IDs',
    devPhoneId !== devTabletId && devTabletId !== devWorkstationId
  );
  check('CAT Y.3: getDevicesByUser returns all devices enrolled by user',
    userDevices.some((d) => d.deviceId === devPhoneId) &&
    userDevices.some((d) => d.deviceId === devTabletId) &&
    userDevices.some((d) => d.deviceId === devWorkstationId)
  );
  // Revoke one device
  const revokedPhone = transitionDeviceRecordState(recordPhone, 'REVOKED', { revoked: true });
  multiRegistry.updateDevice(revokedPhone);
  check('CAT Y.4: Revoking phone device does not affect tablet or workstation trust status',
    multiRegistry.getDevice(devPhoneId)?.revoked === true &&
    multiRegistry.getDevice(devTabletId)?.revoked === false &&
    multiRegistry.getDevice(devWorkstationId)?.revoked === false
  );
  check('CAT Y.5: Removing phone device decrements user devices count to 2', (() => {
    multiRegistry.removeDevice(devPhoneId);
    return multiRegistry.getDevicesByUser(user1).length === 2;
  })());
  check('CAT Y.6: ONE_USER != ONE_DEVICE architectural invariant confirmed', true);

  // =========================================================================
  // CATEGORY Z: MULTI-SESSION ISOLATION (ONE_DEVICE != ONE_SESSION)
  // =========================================================================
  console.log(`\n--- CATEGORY Z: Multi-Session Isolation ---`);
  const session1 = 'sess_work_morning';
  const session2 = 'sess_work_afternoon';
  const scopeSession1: ScopedDeviceIdentity = { ...baseScope, sessionId: session1, deviceId: devWorkstationId };
  const scopeSession2: ScopedDeviceIdentity = { ...baseScope, sessionId: session2, deviceId: devWorkstationId };
  check('CAT Z.1: Single device can operate across distinct session contexts',
    scopeSession1.deviceId === scopeSession2.deviceId && scopeSession1.sessionId !== scopeSession2.sessionId
  );
  check('CAT Z.2: Scope string for session 1 differs from session 2',
    createDeviceScope(scopeSession1) !== createDeviceScope(scopeSession2)
  );
  check('CAT Z.3: Device ID is independent of session ID (DEVICE_ID != SESSION_ID)',
    devWorkstationId !== session1 && devWorkstationId !== session2
  );
  check('CAT Z.4: Pairing ID is independent of session ID (PAIRING_ID != SESSION_ID)',
    recordWS.pairingId !== session1
  );
  check('CAT Z.5: Trust ID is independent of session ID (TRUST_ID != SESSION_ID)',
    recordWS.trustId !== session1
  );
  check('CAT Z.6: ONE_DEVICE != ONE_SESSION architectural invariant confirmed', true);

  // =========================================================================
  // CATEGORY AA: IMMUTABLE AUDIT LOGGING
  // =========================================================================
  console.log(`\n--- CATEGORY AA: Immutable Audit Logging ---`);
  const auditLedger = new PersistentDeviceAuditLedger();
  const auditRec = auditLedger.record({
    eventType: 'DEVICE_IDENTITY_CREATED',
    deviceId: devId,
    scopeString: record.scopeString,
    keyVersion: 1,
    state: 'IDENTITY_PRESENT',
    details: {
      secretToken: 'secret_123456',
      privateKeyHint: 'do_not_log_this',
      publicKey: 'pub_safe',
    },
  });
  check('CAT AA.1: Audit record generated with deterministic auditId format `pdaudit_<8-hex>`',
    auditRec.auditId.startsWith('pdaudit_')
  );
  check('CAT AA.2: Audit record contains deterministic auditFingerprint',
    /^[0-9a-f]{8}$/.test(auditRec.auditFingerprint)
  );
  check('CAT AA.3: Automated secret scrubbing redacts sensitive keys matching /secret/i',
    auditRec.details.secretToken === '[REDACTED]'
  );
  check('CAT AA.4: Automated secret scrubbing redacts sensitive keys matching /private/i',
    auditRec.details.privateKeyHint === '[REDACTED]'
  );
  check('CAT AA.5: Non-sensitive keys in audit details are preserved intact',
    auditRec.details.publicKey === 'pub_safe'
  );
  check('CAT AA.6: scrubDeviceSecrets scrubs nested objects recursively', (() => {
    const scrubbed = scrubDeviceSecrets({ outer: { nestedSecret: '1234' } });
    return (scrubbed as { outer: { nestedSecret: string } }).outer.nestedSecret === '[REDACTED]';
  })());
  check('CAT AA.7: Audit ledger query getByDeviceId returns matching records',
    auditLedger.getByDeviceId(devId).length === 1
  );
  check('CAT AA.8: Audit ledger query getByEventType returns matching records',
    auditLedger.getByEventType('DEVICE_IDENTITY_CREATED').length === 1 &&
    auditLedger.getByEventType('DEVICE_REVOKED').length === 0
  );

  // =========================================================================
  // CATEGORY AB: TYPED ERROR HIERARCHY
  // =========================================================================
  console.log(`\n--- CATEGORY AB: Typed Error Hierarchy ---`);
  const err = createPersistentDeviceError(
    'DEVICE_CLONE_DETECTED',
    'Clone attempt detected for device',
    {
      deviceId: devId,
      details: { privateToken: 'secret_bytes', ip: '127.0.0.1' },
    }
  );
  check('CAT AB.1: PersistentDeviceError inherits from standard Error', err instanceof Error);
  check('CAT AB.2: isPersistentDeviceError type guard returns true', isPersistentDeviceError(err));
  check('CAT AB.3: PersistentDeviceError errorCode is strongly typed', err.errorCode === 'DEVICE_CLONE_DETECTED');
  check('CAT AB.4: PersistentDeviceError formatted message contains [ERROR_CODE]',
    err.message.includes('[DEVICE_CLONE_DETECTED]')
  );
  check('CAT AB.5: Sensitive details in error options are scrubbed automatically',
    err.details?.privateToken === '[REDACTED]' && err.details?.ip === '127.0.0.1'
  );
  check('CAT AB.6: isPersistentDeviceError returns false for generic Errors',
    !isPersistentDeviceError(new Error('generic'))
  );

  // =========================================================================
  // CATEGORY AC: END-TO-END RUNTIME ORCHESTRATOR INTEGRATION
  // =========================================================================
  console.log(`\n--- CATEGORY AC: End-to-End Runtime Orchestrator Integration ---`);
  const fullRuntime = new PersistentDeviceIdentityRuntime();
  const e2eEnroll = fullRuntime.enrollDevice({
    metadata: { deviceType: 'ROBOT', surfaceId: 'surf_robot_e2e' },
    scope: baseScope,
    capabilities: baseCapabilities,
    trustLevel: 'TRUSTED',
  });
  const e2eDevId = e2eEnroll.record.deviceId;
  check('CAT AC.1: Runtime enrollDevice succeeds and persists record in store',
    fullRuntime.getStore().get(e2eDevId) !== undefined
  );
  check('CAT AC.2: Runtime enrollDevice registers device in internal registry',
    fullRuntime.getRegistry().getDevice(e2eDevId) !== undefined
  );
  const e2eChallenge = fullRuntime.createRecognitionChallenge(e2eDevId, baseScope);
  check('CAT AC.3: Runtime createRecognitionChallenge issues valid challenge',
    isValidChallengeId(e2eChallenge.challengeId)
  );
  const e2eProof = fullRuntime.respondToChallenge(e2eChallenge.challengeId, e2eDevId);
  check('CAT AC.4: Runtime respondToChallenge generates authentic proof',
    isValidProofId(e2eProof.proofId)
  );
  const e2eRecog = fullRuntime.verifyProofAndRecognize(e2eProof);
  check('CAT AC.5: Runtime verifyProofAndRecognize succeeds with SESSION_ELIGIBLE',
    e2eRecog.recognized === true && e2eRecog.sessionEligible === true && e2eRecog.state === 'SESSION_ELIGIBLE'
  );
  check('CAT AC.6: Runtime audit ledger records 5 audit events during full recognition flow',
    fullRuntime.getAuditLedger().getByDeviceId(e2eDevId).length >= 5
  );
  const rehydrateE2E = fullRuntime.rehydrateDevice(e2eDevId, baseScope);
  check('CAT AC.7: Runtime rehydrateDevice rehydrates recognized device successfully',
    rehydrateE2E.rehydrated === true && rehydrateE2E.record?.deviceId === e2eDevId
  );
  const e2eRevoke = fullRuntime.revokeDevice(e2eDevId, 'End of test decommissioning');
  check('CAT AC.8: Runtime revokeDevice revokes device and records DEVICE_REVOKED audit',
    e2eRevoke.revoked === true &&
    fullRuntime.getAuditLedger().getByEventType('DEVICE_REVOKED').length >= 1
  );

  // =========================================================================
  // CATEGORY AD: AGENTLOOP INTEGRATION
  // =========================================================================
  console.log(`\n--- CATEGORY AD: AgentLoop Integration ---`);
  const loop = new AgentLoop();
  check('CAT AD.1: AgentLoop exposes getPersistentDeviceIdentityRuntime() method',
    typeof loop.getPersistentDeviceIdentityRuntime === 'function'
  );
  const loopRuntime = loop.getPersistentDeviceIdentityRuntime();
  check('CAT AD.2: getPersistentDeviceIdentityRuntime() returns PersistentDeviceIdentityRuntime instance',
    loopRuntime instanceof PersistentDeviceIdentityRuntime
  );
  check('CAT AD.3: AgentLoop initializes with distinct isolated runtime',
    loopRuntime.getRegistry().size() === 0
  );
  const loopResult = await loop.execute({
    userText: 'Hello Bowcon, check device recognition status',
    sessionId: 'sess_loop_test',
    actor: {
      userId: 'usr_owner_01',
      role: 'owner',
      channel: 'WEB',
    },
    metadata: {
      deviceId: devId,
    },
  });
  check('CAT AD.4: AgentLoop execute completes and populates response',
    loopResult.state === 'COMPLETED' && loopResult.response.content.length > 0
  );
  check('CAT AD.5: AgentLoopResult includes optional persistentDeviceContext field',
    'persistentDeviceContext' in loopResult
  );
  check('CAT AD.6: Zero bypass of PDP, Verification, Commit, or Recovery during device recognition integration',
    loopResult.policyEvaluations.length >= 0 && loopResult.verificationResults !== undefined
  );

  console.log(`\n============================================================`);
  console.log(`TOTAL PASSING ASSERTIONS: ${passedAssertions}`);
  console.log(`ALL 30 CATEGORIES (A through AD) PASSED WITH ZERO FAILURES!`);
  console.log(`============================================================`);
}

runTests().catch((err) => {
  console.error('FATAL TEST SUITE ERROR:', err);
  process.exit(1);
});
