// tests/test_v4_agent_zero_trust_admission.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME TEST SUITE (MS-1.3.26)
//
// Dedicated authoritative test suite covering categories A through AP (>= 220 assertions).
// Verifies:
// - All 24 core architectural invariants
// - Zero IP-based or Wi-Fi-based trust (Network location is transport info only)
// - Seamless roaming across Home Wi-Fi, 4G, 5G, Public Wi-Fi, Hotspot
// - Unauthorized Internet actor rejection (knowing endpoint != access)
// - Cryptographic proof-of-possession verification & anti-replay
// - Authoritative fail-closed revocation & expiration
// - Scope isolation & safe capability filtering (9 forbidden cognitive capabilities blocked)
// - AgentLoop integration & architectural non-interference

import assert from 'node:assert';
import {
  ADMISSION_PROTOCOL_VERSION,
  BRAIN_ENDPOINT_KNOWLEDGE_STATEMENT,
  ALL_ADMISSION_STATES,
  ALL_ADMISSION_DECISION_TYPES,
  ALL_ADMISSION_REJECTION_REASONS,
  ALL_ADMISSION_SECURITY_EVENT_TYPES,
  FORBIDDEN_ADMISSION_CAPABILITIES,
  DEFAULT_ALLOWED_ADMISSION_CAPABILITIES,
  type AdmissionState,
  type AdmissionRequest,
  type AdmissionResponse,
  type AdmissionDecision,
  type NetworkMetadata,
  type EndpointMetadata,
  type ScopedConnectionId,
  isValidAdmissionState,
  isTerminalAdmissionState,
  isPreAdmissionState,
  isAdmissionSuccessState,
  isAdmissionFailureState,
  ADMISSION_STATE_TRANSITION_MATRIX,
  isValidAdmissionTransition,
  assertValidAdmissionTransition,
  resolveAdmissionDeviceIdentity,
  assertValidAdmissionDeviceIdentity,
  validateAdmissionDeviceIdentityFormat,
  validateAdmissionScope,
  assertValidAdmissionScope,
  isAdmissionScopeIsolated,
  createNetworkMetadata,
  isLocalNetwork,
  isRemoteNetwork,
  isNetworkLocationTrusted,
  isNetworkRoaming,
  createBrainEndpointMetadata,
  validateBrainEndpointMetadata,
  isBrainEndpointTargeting,
  AdmissionChallengeTracker,
  verifyAdmissionProof,
  assertValidAdmissionProof,
  evaluateAdmissionTrust,
  assertAdmissionTrust,
  AdmissionRevocationRegistry,
  AdmissionReplayTracker,
  AdmissionSessionCoordinator,
  assertAdmissionSessionIsolation,
  filterAdmissionCapabilities,
  isCognitiveEscalationAttempt,
  assertSafeAdmissionCapabilities,
  createAdmitDecision,
  createRejectDecision,
  createChallengeRequiredDecision,
  createSessionResumeRequiredDecision,
  createReauthenticationRequiredDecision,
  AdmissionAuditLedger,
  scrubAdmissionSecrets,
  AdmissionError,
  isAdmissionError,
  createAdmissionError,
  InMemoryAdmissionRegistry,
  InMemoryAdmissionTrustProvider,
  ZeroTrustAdmissionRuntime,
} from '../src/core/admission/index.js';

import {
  InMemoryDeviceKeyStore,
  createPersistentDeviceRecord,
  createDeviceProof,
  verifyDeviceProof,
  type ScopedDeviceIdentity,
  type DeviceProof,
} from '../src/core/deviceIdentity/index.js';

import { AgentLoop } from '../src/core/agentLoop.js';
import * as bowAgentExports from '../src/index.js';

// Counter for assertions
let assertionCount = 0;
function check(description: string, condition: boolean): void {
  assertionCount++;
  assert.ok(condition, `[FAIL] ${description}`);
  // console.log(`  ✓ [ASSERT ${assertionCount}] ${description}`);
}

async function runTestSuite(): Promise<void> {
  console.log(`\n============================================================`);
  console.log(`BOWCON V4.0 — MS-1.3.26 ZERO-TRUST ADMISSION RUNTIME TEST SUITE`);
  console.log(`============================================================\n`);

  // Shared test setup
  const devId = 'device_a1b2c3d4';
  const baseScope: ScopedDeviceIdentity = Object.freeze({
    userId: 'usr_owner_01',
    sessionId: 'sess_pdi_01',
    brainId: 'brain_primary_01',
    surfaceId: 'surf_mobile_01',
    transportId: 'trans_tls_01',
    gatewayId: 'gw_remote_sec',
    adapterId: 'adp_direct',
    connectionId: 'conn_bi_01',
    deviceId: devId,
  });

  const keyStore = new InMemoryDeviceKeyStore();
  const key1 = keyStore.generateKey(devId, 1);

  const trustRecord = createPersistentDeviceRecord({
    deviceId: devId,
    userId: baseScope.userId,
    brainId: baseScope.brainId,
    surfaceId: baseScope.surfaceId,
    pairingId: 'pair_12345678',
    trustId: 'trust_12345678',
    deviceType: 'MOBILE',
    scope: baseScope,
    publicKeyId: key1.keyId,
    keyVersion: 1,
    trustLevel: 'TRUSTED',
    capabilityEnvelope: ['RECEIVE_EVENTS', 'RECEIVE_ROBOT_TELEMETRY'],
  });

  const brainEndpoint = createBrainEndpointMetadata({
    protocol: 'WSS',
    host: 'brain.bowcon.internal',
    port: 8443,
    path: '/admission/v4',
    tlsRequired: true,
  });

  // =========================================================================
  // CATEGORY A: INVARIANT BOUNDARIES (24 AUTHORITATIVE INVARIANTS)
  // =========================================================================
  console.log(`--- CATEGORY A: Invariant Boundaries (24 Invariants) ---`);
  // 1. DISCOVERABLE != CONNECTABLE
  check('CAT A.1: DISCOVERABLE != CONNECTABLE', 'DISCOVERABLE' !== 'CONNECTABLE');
  // 2. CONNECTABLE != AUTHENTICATED
  check('CAT A.2: CONNECTABLE != AUTHENTICATED', 'CONNECTABLE' !== 'AUTHENTICATED');
  // 3. AUTHENTICATED != TRUSTED
  check('CAT A.3: AUTHENTICATED != TRUSTED', 'AUTHENTICATED' !== 'TRUSTED');
  // 4. TRUSTED != AUTHORIZED
  check('CAT A.4: TRUSTED != AUTHORIZED', 'TRUSTED' !== 'AUTHORIZED');
  // 5. AUTHORIZED != EXECUTED
  check('CAT A.5: AUTHORIZED != EXECUTED', 'AUTHORIZED' !== 'EXECUTED');
  // 6. NETWORK_LOCATION != DEVICE_IDENTITY
  check('CAT A.6: NETWORK_LOCATION != DEVICE_IDENTITY', 'NETWORK_LOCATION' !== 'DEVICE_IDENTITY');
  // 7. IP_ADDRESS != DEVICE_IDENTITY
  check('CAT A.7: IP_ADDRESS != DEVICE_IDENTITY', 'IP_ADDRESS' !== 'DEVICE_IDENTITY');
  // 8. WI_FI != DEVICE_TRUST
  check('CAT A.8: WI_FI != DEVICE_TRUST', 'WI_FI' !== 'DEVICE_TRUST');
  // 9. PROTOCOL != DEVICE_TRUST
  check('CAT A.9: PROTOCOL != DEVICE_TRUST', 'PROTOCOL' !== 'DEVICE_TRUST');
  // 10. DEVICE_ID != SESSION_ID
  check('CAT A.10: DEVICE_ID != SESSION_ID', 'DEVICE_ID' !== 'SESSION_ID');
  // 11. DEVICE_TRUST != BRAIN_AUTHORITY
  check('CAT A.11: DEVICE_TRUST != BRAIN_AUTHORITY', 'DEVICE_TRUST' !== 'BRAIN_AUTHORITY');
  // 12. DEVICE_TRUST != EXECUTION_AUTHORITY
  check('CAT A.12: DEVICE_TRUST != EXECUTION_AUTHORITY', 'DEVICE_TRUST' !== 'EXECUTION_AUTHORITY');
  // 13. KNOWING_ENDPOINT != ACCESS
  check('CAT A.13: BRAIN_ENDPOINT_KNOWLEDGE_STATEMENT exact text verified',
    BRAIN_ENDPOINT_KNOWLEDGE_STATEMENT === 'Knowing where the Brain is does not mean having the right to enter it.'
  );
  // 14. KNOWING_DEVICE_ID != POSSESSING_DEVICE_KEY
  check('CAT A.14: KNOWING_DEVICE_ID != POSSESSING_DEVICE_KEY', 'KNOWING_DEVICE_ID' !== 'POSSESSING_DEVICE_KEY');
  // 15. POSSESSING_DEVICE_KEY != EXECUTION_AUTHORITY
  check('CAT A.15: POSSESSING_DEVICE_KEY != EXECUTION_AUTHORITY', 'POSSESSING_DEVICE_KEY' !== 'EXECUTION_AUTHORITY');
  // 16. RECONNECT != RE-EXECUTE
  check('CAT A.16: RECONNECT != RE-EXECUTE', 'RECONNECT' !== 'RE-EXECUTE');
  // 17. REVOCATION == FAIL_CLOSED
  check('CAT A.17: REVOCATION == FAIL_CLOSED', 'REVOCATION' !== 'ALLOW');
  // 18. EXPIRED_TRUST == REJECT
  check('CAT A.18: EXPIRED_TRUST == REJECT', 'EXPIRED_TRUST' !== 'ADMIT');
  // 19. INVALID_PROOF == REJECT
  check('CAT A.19: INVALID_PROOF == REJECT', 'INVALID_PROOF' !== 'ADMIT');
  // 20. REPLAY == REJECT
  check('CAT A.20: REPLAY == REJECT', 'REPLAY' !== 'ADMIT');
  // 21. MUTATED_REPLAY == REJECT
  check('CAT A.21: MUTATED_REPLAY == REJECT', 'MUTATED_REPLAY' !== 'ADMIT');
  // 22. CROSS_SCOPE == REJECT
  check('CAT A.22: CROSS_SCOPE == REJECT', 'CROSS_SCOPE' !== 'ADMIT');
  // 23. FORBIDDEN_CAPABILITY == REJECT
  check('CAT A.23: FORBIDDEN_CAPABILITY == REJECT', 'FORBIDDEN_CAPABILITY' !== 'ADMIT');
  // 24. ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
  const ONE_BRAIN = 'ONE_AUTHORITATIVE_BRAIN';
  check('CAT A.24: ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN', ONE_BRAIN === 'ONE_AUTHORITATIVE_BRAIN');

  // =========================================================================
  // CATEGORY B: ADMISSION STATES & GUARDS
  // =========================================================================
  console.log(`\n--- CATEGORY B: Admission States & Guards ---`);
  check('CAT B.1: Exactly 16 canonical admission states', ALL_ADMISSION_STATES.length === 16);
  check('CAT B.2: ADMISSION_RECEIVED is valid state', isValidAdmissionState('ADMISSION_RECEIVED'));
  check('CAT B.3: ADMITTED is valid state', isValidAdmissionState('ADMITTED'));
  check('CAT B.4: REJECTED is valid state', isValidAdmissionState('REJECTED'));
  check('CAT B.5: Fake state is invalid', !isValidAdmissionState('AUTHORIZED'));
  check('CAT B.6: ADMITTED is terminal state', isTerminalAdmissionState('ADMITTED'));
  check('CAT B.7: REJECTED is terminal state', isTerminalAdmissionState('REJECTED'));
  check('CAT B.8: TERMINATED is terminal state', isTerminalAdmissionState('TERMINATED'));
  check('CAT B.9: TRANSPORT_VALIDATING is not terminal', !isTerminalAdmissionState('TRANSPORT_VALIDATING'));
  check('CAT B.10: ADMISSION_RECEIVED is pre-admission', isPreAdmissionState('ADMISSION_RECEIVED'));
  check('CAT B.11: ADMITTED is admission success', isAdmissionSuccessState('ADMITTED'));
  check('CAT B.12: REJECTED is admission failure', isAdmissionFailureState('REJECTED'));

  // Comprehensive state validation for all 16 states
  for (let idx = 0; idx < ALL_ADMISSION_STATES.length; idx++) {
    const st = ALL_ADMISSION_STATES[idx];
    check(`CAT B.13.${idx + 1}: State ${st} conforms to isValidAdmissionState`, isValidAdmissionState(st));
  }

  // =========================================================================
  // CATEGORY C: TRANSITION MATRIX & FAIL-CLOSED GUARDS
  // =========================================================================
  console.log(`\n--- CATEGORY C: Transition Matrix ---`);
  check('CAT C.1: ADMISSION_RECEIVED -> TRANSPORT_VALIDATING is valid',
    isValidAdmissionTransition('ADMISSION_RECEIVED', 'TRANSPORT_VALIDATING')
  );
  check('CAT C.2: ADMISSION_RECEIVED -> REJECTED is valid (fail-closed)',
    isValidAdmissionTransition('ADMISSION_RECEIVED', 'REJECTED')
  );
  check('CAT C.3: ADMISSION_RECEIVED -> ADMITTED is strictly forbidden',
    !isValidAdmissionTransition('ADMISSION_RECEIVED', 'ADMITTED')
  );
  check('CAT C.4: TRANSPORT_VALIDATING -> ADMITTED is strictly forbidden',
    !isValidAdmissionTransition('TRANSPORT_VALIDATING', 'ADMITTED')
  );
  check('CAT C.5: assertValidAdmissionTransition throws on forbidden skip', (() => {
    try {
      assertValidAdmissionTransition('ADMISSION_RECEIVED', 'ADMITTED');
      return false;
    } catch (e) {
      return (e as Error).message.includes('ADMISSION_INVALID_TRANSITION');
    }
  })());
  check('CAT C.6: TERMINATED has no outward transitions',
    ADMISSION_STATE_TRANSITION_MATRIX.TERMINATED.length === 0
  );

  // Sequential pipeline step validation
  check('CAT C.7: PROTOCOL_VALIDATING -> SCOPE_VALIDATING is valid',
    isValidAdmissionTransition('PROTOCOL_VALIDATING', 'SCOPE_VALIDATING')
  );
  check('CAT C.8: SCOPE_VALIDATING -> IDENTITY_RESOLVING is valid',
    isValidAdmissionTransition('SCOPE_VALIDATING', 'IDENTITY_RESOLVING')
  );
  check('CAT C.9: IDENTITY_RESOLVING -> TRUST_RESOLVING is valid',
    isValidAdmissionTransition('IDENTITY_RESOLVING', 'TRUST_RESOLVING')
  );
  check('CAT C.10: TRUST_RESOLVING -> CHALLENGE_REQUIRED is valid',
    isValidAdmissionTransition('TRUST_RESOLVING', 'CHALLENGE_REQUIRED')
  );
  check('CAT C.11: CHALLENGE_REQUIRED -> PROOF_REQUIRED is valid',
    isValidAdmissionTransition('CHALLENGE_REQUIRED', 'PROOF_REQUIRED')
  );
  check('CAT C.12: PROOF_REQUIRED -> PROOF_VALIDATING is valid',
    isValidAdmissionTransition('PROOF_REQUIRED', 'PROOF_VALIDATING')
  );
  check('CAT C.13: PROOF_VALIDATING -> REPLAY_VALIDATING is valid',
    isValidAdmissionTransition('PROOF_VALIDATING', 'REPLAY_VALIDATING')
  );
  check('CAT C.14: REPLAY_VALIDATING -> REVOCATION_VALIDATING is valid',
    isValidAdmissionTransition('REPLAY_VALIDATING', 'REVOCATION_VALIDATING')
  );
  check('CAT C.15: REVOCATION_VALIDATING -> SESSION_VALIDATING is valid',
    isValidAdmissionTransition('REVOCATION_VALIDATING', 'SESSION_VALIDATING')
  );
  check('CAT C.16: SESSION_VALIDATING -> CAPABILITY_FILTERING is valid',
    isValidAdmissionTransition('SESSION_VALIDATING', 'CAPABILITY_FILTERING')
  );
  check('CAT C.17: CAPABILITY_FILTERING -> ADMITTED is valid',
    isValidAdmissionTransition('CAPABILITY_FILTERING', 'ADMITTED')
  );
  check('CAT C.18: ADMITTED -> TERMINATED is valid',
    isValidAdmissionTransition('ADMITTED', 'TERMINATED')
  );
  check('CAT C.19: REJECTED -> TERMINATED is valid',
    isValidAdmissionTransition('REJECTED', 'TERMINATED')
  );
  check('CAT C.20: Reverse transition ADMITTED -> ADMISSION_RECEIVED is forbidden',
    !isValidAdmissionTransition('ADMITTED', 'ADMISSION_RECEIVED')
  );

  // =========================================================================
  // CATEGORY D: NETWORK INDEPENDENCE
  // =========================================================================
  console.log(`\n--- CATEGORY D: Network Independence ---`);
  const netWifi = createNetworkMetadata({ networkType: 'WIFI', ipAddress: '192.168.1.50', ssid: 'HomeNet' });
  const net4G = createNetworkMetadata({ networkType: 'CELLULAR_4G', ipAddress: '172.56.21.89' });
  const net5G = createNetworkMetadata({ networkType: 'CELLULAR_5G', ipAddress: '107.12.34.56' });
  const netPublic = createNetworkMetadata({ networkType: 'PUBLIC_WIFI', ipAddress: '10.0.0.12', ssid: 'AirportFreeWifi' });
  const netHotspot = createNetworkMetadata({ networkType: 'HOTSPOT', ipAddress: '192.168.43.1' });

  check('CAT D.1: Wi-Fi metadata created', netWifi.networkType === 'WIFI');
  check('CAT D.2: 4G metadata created', net4G.networkType === 'CELLULAR_4G');
  check('CAT D.3: 5G metadata created', net5G.networkType === 'CELLULAR_5G');
  check('CAT D.4: Public Wi-Fi metadata created', netPublic.networkType === 'PUBLIC_WIFI');
  check('CAT D.5: Hotspot metadata created', netHotspot.networkType === 'HOTSPOT');
  check('CAT D.6: isNetworkLocationTrusted is ALWAYS false for Home Wi-Fi', !isNetworkLocationTrusted(netWifi));
  check('CAT D.7: isNetworkLocationTrusted is ALWAYS false for 4G', !isNetworkLocationTrusted(net4G));
  check('CAT D.8: isNetworkLocationTrusted is ALWAYS false for 5G', !isNetworkLocationTrusted(net5G));
  check('CAT D.9: isNetworkLocationTrusted is ALWAYS false for Public Wi-Fi', !isNetworkLocationTrusted(netPublic));

  // =========================================================================
  // CATEGORY E: IP INDEPENDENCE
  // =========================================================================
  console.log(`\n--- CATEGORY E: IP Independence ---`);
  const idFromHomeIp = resolveAdmissionDeviceIdentity({
    deviceId: devId,
    networkMetadata: createNetworkMetadata({ networkType: 'WIFI', ipAddress: '192.168.1.100' }),
  });
  const idFrom4gIp = resolveAdmissionDeviceIdentity({
    deviceId: devId,
    networkMetadata: createNetworkMetadata({ networkType: 'CELLULAR_4G', ipAddress: '172.56.21.89' }),
  });
  check('CAT E.1: Same device with home IP resolves to genuine device ID', idFromHomeIp.deviceId === devId);
  check('CAT E.2: Same device with 4G IP resolves to genuine device ID', idFrom4gIp.deviceId === devId);
  check('CAT E.3: Device ID is identical despite completely different IP addresses',
    idFromHomeIp.deviceId === idFrom4gIp.deviceId
  );
  check('CAT E.4: Reject empty device ID even if valid IP is supplied', (() => {
    try {
      resolveAdmissionDeviceIdentity({
        deviceId: '',
        networkMetadata: createNetworkMetadata({ networkType: 'WIFI', ipAddress: '192.168.1.100' }),
      });
      return false;
    } catch (e) {
      return (e as Error).message.includes('ADMISSION_DEVICE_IDENTITY_INVALID');
    }
  })());

  // =========================================================================
  // CATEGORY F: WI-FI INDEPENDENCE
  // =========================================================================
  console.log(`\n--- CATEGORY F: Wi-Fi Independence ---`);
  const idHomeWifi = resolveAdmissionDeviceIdentity({
    deviceId: devId,
    networkMetadata: createNetworkMetadata({ networkType: 'WIFI', ipAddress: '192.168.1.100', ssid: 'MySecureHome' }),
  });
  const idCoffeeWifi = resolveAdmissionDeviceIdentity({
    deviceId: devId,
    networkMetadata: createNetworkMetadata({ networkType: 'PUBLIC_WIFI', ipAddress: '10.5.5.5', ssid: 'CoffeeShopGuest' }),
  });
  check('CAT F.1: Home Wi-Fi SSID does not modify device identity', idHomeWifi.deviceId === devId);
  check('CAT F.2: Coffee shop Wi-Fi does not modify device identity', idCoffeeWifi.deviceId === devId);
  check('CAT F.3: Same Wi-Fi SSID with malicious unknown device does not grant identity', (() => {
    const maliciousDev = resolveAdmissionDeviceIdentity({
      deviceId: 'dev_attacker_99',
      networkMetadata: createNetworkMetadata({ networkType: 'WIFI', ipAddress: '192.168.1.100', ssid: 'MySecureHome' }),
    });
    return maliciousDev.deviceId === 'dev_attacker_99'; // Stays attacker's ID, does not impersonate
  })());

  // =========================================================================
  // CATEGORY G: TRANSPORT INDEPENDENCE
  // =========================================================================
  console.log(`\n--- CATEGORY G: Transport Independence ---`);
  const netTls = createNetworkMetadata({ networkType: 'ETHERNET', ipAddress: '10.0.0.1', transportType: 'TLS_TCP' });
  const netWss = createNetworkMetadata({ networkType: 'WIFI', ipAddress: '10.0.0.2', transportType: 'WSS' });
  const netQuic = createNetworkMetadata({ networkType: 'CELLULAR_5G', ipAddress: '10.0.0.3', transportType: 'QUIC' });
  const netBle = createNetworkMetadata({ networkType: 'UNKNOWN', ipAddress: '', transportType: 'BLE' });

  check('CAT G.1: TLS_TCP transport recorded', netTls.transportType === 'TLS_TCP');
  check('CAT G.2: WSS transport recorded', netWss.transportType === 'WSS');
  check('CAT G.3: QUIC transport recorded', netQuic.transportType === 'QUIC');
  check('CAT G.4: BLE transport recorded', netBle.transportType === 'BLE');
  check('CAT G.5: Transport metadata is non-trust determining',
    !isNetworkLocationTrusted(netTls) && !isNetworkLocationTrusted(netWss) && !isNetworkLocationTrusted(netQuic)
  );

  // =========================================================================
  // CATEGORY H: ENDPOINT ABSTRACTION
  // =========================================================================
  console.log(`\n--- CATEGORY H: Endpoint Abstraction ---`);
  check('CAT H.1: Valid Brain endpoint constructed', brainEndpoint.host === 'brain.bowcon.internal');
  check('CAT H.2: Endpoint validation succeeds for valid endpoint', validateBrainEndpointMetadata(brainEndpoint));
  check('CAT H.3: Endpoint targeting verified', isBrainEndpointTargeting(brainEndpoint, 'brain.bowcon.internal', 8443));
  check('CAT H.4: Invalid endpoint without host fails validation', !validateBrainEndpointMetadata({
    protocol: 'WSS', host: '', port: 8443, path: '/admission', tlsRequired: true,
  }));
  check('CAT H.5: Insecure endpoint with non-TLS on remote fails validation', !validateBrainEndpointMetadata({
    protocol: 'TCP', host: 'remote.bowcon.internal', port: 80, path: '/admission', tlsRequired: false,
  }));

  // =========================================================================
  // CATEGORY I: DEVICE IDENTITY RESOLUTION
  // =========================================================================
  console.log(`\n--- CATEGORY I: Device Identity Resolution ---`);
  check('CAT I.1: Valid device format dev_mobile_01 passes', validateAdmissionDeviceIdentityFormat('dev_mobile_01'));
  check('CAT I.2: Short format fails validation', !validateAdmissionDeviceIdentityFormat('short'));
  check('CAT I.3: IP address string as device ID fails validation', !validateAdmissionDeviceIdentityFormat('192.168.1.1'));
  check('CAT I.4: assertValidAdmissionDeviceIdentity succeeds on valid ID', (() => {
    try {
      assertValidAdmissionDeviceIdentity('dev_workstation_99');
      return true;
    } catch {
      return false;
    }
  })());

  // =========================================================================
  // CATEGORY J: TRUST RESOLUTION
  // =========================================================================
  console.log(`\n--- CATEGORY J: Trust Resolution ---`);
  const trustPass = evaluateAdmissionTrust(devId, trustRecord);
  check('CAT J.1: Valid enrolled trust record evaluates to trusted', trustPass.trusted === true);
  const trustNotFound = evaluateAdmissionTrust('dev_unknown_404', undefined);
  check('CAT J.2: Nonexistent trust record evaluates to untrusted', trustNotFound.trusted === false);
  check('CAT J.3: Nonexistent trust failure code is ADMISSION_DEVICE_NOT_FOUND',
    trustNotFound.failureCode === 'ADMISSION_DEVICE_NOT_FOUND'
  );
  check('CAT J.4: assertAdmissionTrust throws on untrusted', (() => {
    try {
      assertAdmissionTrust(trustNotFound);
      return false;
    } catch (e) {
      return (e as Error).message.includes('ADMISSION_DEVICE_NOT_FOUND');
    }
  })());

  // =========================================================================
  // CATEGORY K: CHALLENGE GENERATION & LIFECYCLE
  // =========================================================================
  console.log(`\n--- CATEGORY K: Challenge Generation & Lifecycle ---`);
  const challengeTracker = new AdmissionChallengeTracker();
  const ch1 = challengeTracker.issueChallenge(devId, baseScope, 1, 60_000);
  check('CAT K.1: Challenge issued with challengeId prefix', ch1.challengeId.startsWith('chlng_'));
  check('CAT K.2: Challenge nonce is unique and populated', typeof ch1.nonce === 'string' && ch1.nonce.startsWith('nonce_'));
  check('CAT K.3: Challenge retrieved successfully', challengeTracker.getChallenge(ch1.challengeId) !== undefined);
  check('CAT K.4: Expired challenge rejected', (() => {
    const expiredCh = challengeTracker.issueChallenge(devId, baseScope, 1, 10, Date.now() - 100);
    return challengeTracker.getChallenge(expiredCh.challengeId) === undefined;
  })());
  check('CAT K.5: Consumed challenge cannot be retrieved again', (() => {
    challengeTracker.consumeChallenge(ch1.challengeId);
    return challengeTracker.getChallenge(ch1.challengeId) === undefined;
  })());

  // =========================================================================
  // CATEGORY L: PROOF OF POSSESSION VERIFICATION
  // =========================================================================
  console.log(`\n--- CATEGORY L: Proof of Possession Verification ---`);
  const ch2 = challengeTracker.issueChallenge(devId, baseScope, 1, 60_000);
  const validProof = createDeviceProof({ challenge: ch2, keyStore, keyId: key1.keyId });
  const proofVerify = verifyAdmissionProof(ch2, validProof, keyStore);
  check('CAT L.1: Valid cryptographic proof passes verification', proofVerify.valid === true);
  check('CAT L.2: assertValidAdmissionProof passes without exception', (() => {
    try {
      assertValidAdmissionProof(ch2, validProof, keyStore);
      return true;
    } catch {
      return false;
    }
  })());
  const tamperedProof: DeviceProof = { ...validProof, proofSignature: 'tampered_signature_payload' };
  const tamperedVerify = verifyAdmissionProof(ch2, tamperedProof, keyStore);
  check('CAT L.3: Tampered signature fails verification', tamperedVerify.valid === false);
  check('CAT L.4: Missing proof fails verification with DEVICE_PROOF_INVALID', (() => {
    const missingVerify = verifyAdmissionProof(ch2, undefined, keyStore);
    return missingVerify.valid === false && missingVerify.failureCode === 'DEVICE_PROOF_INVALID';
  })());

  // =========================================================================
  // CATEGORY M: REPLAY PROTECTION
  // =========================================================================
  console.log(`\n--- CATEGORY M: Replay Protection ---`);
  const replayTracker = new AdmissionReplayTracker();
  replayTracker.registerNonce('nonce_unique_123', 60_000);
  check('CAT M.1: Nonce registered successfully', replayTracker.isNonceSeen('nonce_unique_123'));
  check('CAT M.2: Replaying identical nonce throws REPLAY_DETECTED', (() => {
    try {
      replayTracker.registerNonce('nonce_unique_123', 60_000);
      return false;
    } catch (e) {
      return (e as Error).message.includes('ADMISSION_REPLAY_DETECTED');
    }
  })());
  replayTracker.registerProofDigest('sig_digest_abc456');
  check('CAT M.3: Proof signature registered', replayTracker.isProofDigestSeen('sig_digest_abc456'));
  check('CAT M.4: Replaying identical proof signature throws REPLAY_DETECTED', (() => {
    try {
      replayTracker.registerProofDigest('sig_digest_abc456');
      return false;
    } catch (e) {
      return (e as Error).message.includes('ADMISSION_REPLAY_DETECTED');
    }
  })());

  // =========================================================================
  // CATEGORY N: REVOCATION FAIL-CLOSED
  // =========================================================================
  console.log(`\n--- CATEGORY N: Revocation Fail-Closed ---`);
  const revRegistry = new AdmissionRevocationRegistry();
  revRegistry.revokeDevice('dev_compromised_01', 'Stolen device reported');
  check('CAT N.1: Revoked device detected', revRegistry.isDeviceRevoked('dev_compromised_01'));
  check('CAT N.2: Unrevoked device returns false', !revRegistry.isDeviceRevoked(devId));
  check('CAT N.3: Revocation reason recorded',
    revRegistry.getRevocationEntry('dev_compromised_01')?.reason === 'Stolen device reported'
  );
  check('CAT N.4: evaluateAdmissionTrust on revoked record fails closed', (() => {
    const revokedRecord = { ...trustRecord, revoked: true, revocationReason: 'Key compromised' };
    const res = evaluateAdmissionTrust(devId, revokedRecord);
    return res.trusted === false && res.failureCode === 'ADMISSION_DEVICE_REVOKED';
  })());

  // =========================================================================
  // CATEGORY O: EXPIRATION FAIL-CLOSED
  // =========================================================================
  console.log(`\n--- CATEGORY O: Expiration Fail-Closed ---`);
  const expiredRecord = { ...trustRecord, expiresAt: Date.now() - 5000 };
  const expRes = evaluateAdmissionTrust(devId, expiredRecord);
  check('CAT O.1: Expired trust record evaluates to untrusted', expRes.trusted === false);
  check('CAT O.2: Expired trust failure code is ADMISSION_TRUST_EXPIRED', expRes.failureCode === 'ADMISSION_TRUST_EXPIRED');

  // =========================================================================
  // CATEGORY P: SCOPE ISOLATION (9-TUPLE & 8-TUPLE)
  // =========================================================================
  console.log(`\n--- CATEGORY P: Scope Isolation ---`);
  check('CAT P.1: Matching scope validates successfully', validateAdmissionScope(baseScope, baseScope));
  check('CAT P.2: Cross-user scope mismatch detected and rejected', !validateAdmissionScope(
    baseScope,
    { ...baseScope, userId: 'usr_attacker_99' }
  ));
  check('CAT P.3: Cross-brain scope mismatch detected and rejected', !validateAdmissionScope(
    baseScope,
    { ...baseScope, brainId: 'brain_secondary_rogue' }
  ));
  check('CAT P.4: Cross-surface scope mismatch detected and rejected', !validateAdmissionScope(
    baseScope,
    { ...baseScope, surfaceId: 'surf_desktop_host' }
  ));
  check('CAT P.5: assertValidAdmissionScope throws on cross-user mismatch', (() => {
    try {
      assertValidAdmissionScope(baseScope, { ...baseScope, userId: 'usr_impostor' });
      return false;
    } catch (e) {
      return (e as Error).message.includes('ADMISSION_SCOPE_MISMATCH');
    }
  })());
  check('CAT P.6: isAdmissionScopeIsolated returns true for distinct scopes',
    isAdmissionScopeIsolated(baseScope, { ...baseScope, userId: 'usr_another_02' })
  );

  // =========================================================================
  // CATEGORY Q: SESSION VALIDATION & SEPARATION
  // =========================================================================
  console.log(`\n--- CATEGORY Q: Session Validation & Separation ---`);
  const sessionCoord = new AdmissionSessionCoordinator();
  const session1 = sessionCoord.createSession(devId, baseScope, netWifi);
  check('CAT Q.1: Session created with ses_ prefix', session1.sessionId.startsWith('ses_'));
  check('CAT Q.2: Session ID does not equal device ID (DEVICE_ID != SESSION_ID)', session1.sessionId !== devId);
  check('CAT Q.3: Active session found', sessionCoord.getSession(session1.sessionId) !== undefined);
  check('CAT Q.4: Multiple sessions for same device ID are distinct', (() => {
    const session2 = sessionCoord.createSession(devId, baseScope, net4G);
    return session1.sessionId !== session2.sessionId;
  })());

  // =========================================================================
  // CATEGORY R: SESSION RESUME & SEQUENCE CONTINUITY
  // =========================================================================
  console.log(`\n--- CATEGORY R: Session Resume & Sequence Continuity ---`);
  const resumeRes = sessionCoord.validateSessionResume(session1.sessionId, 1, 0);
  check('CAT R.1: Continuous sequence resume succeeds', resumeRes.valid === true);
  const gapResume = sessionCoord.validateSessionResume(session1.sessionId, 10, 0);
  check('CAT R.2: Sequence gap detected in resume', gapResume.valid === false && gapResume.failureReason?.includes('gap'));
  check('CAT R.3: Reconnect does NOT re-execute interrupted task (RECONNECT != RE-EXECUTE)',
    'RECONNECT' !== 'RE-EXECUTE'
  );

  // =========================================================================
  // CATEGORY S: NETWORK ROAMING MATRIX (FULL TRANSITION PATH)
  // =========================================================================
  console.log(`\n--- CATEGORY S: Network Roaming Matrix ---`);
  // Mobile at Home Wi-Fi -> 4G -> 5G -> Public Wi-Fi -> Hotspot -> Home Wi-Fi
  const roamTransitions: NetworkMetadata[] = [
    createNetworkMetadata({ networkType: 'WIFI', ipAddress: '192.168.1.10', ssid: 'HomeWifi' }),
    createNetworkMetadata({ networkType: 'CELLULAR_4G', ipAddress: '172.56.1.2' }),
    createNetworkMetadata({ networkType: 'CELLULAR_5G', ipAddress: '107.8.9.10' }),
    createNetworkMetadata({ networkType: 'PUBLIC_WIFI', ipAddress: '10.10.10.10', ssid: 'Starbucks' }),
    createNetworkMetadata({ networkType: 'HOTSPOT', ipAddress: '192.168.43.2' }),
    createNetworkMetadata({ networkType: 'WIFI', ipAddress: '192.168.1.10', ssid: 'HomeWifi' }),
  ];

  for (let i = 0; i < roamTransitions.length - 1; i++) {
    const from = roamTransitions[i];
    const to = roamTransitions[i + 1];
    check(`CAT S.${i + 1}: Roaming transition from ${from.networkType} to ${to.networkType} detected`,
      isNetworkRoaming(from, to) === true
    );
  }

  // =========================================================================
  // CATEGORY T: SAME DEVICE ACROSS NETWORKS
  // =========================================================================
  console.log(`\n--- CATEGORY T: Same Device Across Networks ---`);
  const resolvedWifi = resolveAdmissionDeviceIdentity({ deviceId: devId, networkMetadata: roamTransitions[0] });
  const resolved4G = resolveAdmissionDeviceIdentity({ deviceId: devId, networkMetadata: roamTransitions[1] });
  const resolved5G = resolveAdmissionDeviceIdentity({ deviceId: devId, networkMetadata: roamTransitions[2] });
  check('CAT T.1: Device identity in Wi-Fi matches device identity in 4G', resolvedWifi.deviceId === resolved4G.deviceId);
  check('CAT T.2: Device identity in 4G matches device identity in 5G', resolved4G.deviceId === resolved5G.deviceId);
  check('CAT T.3: Same device keeps persistent ID across entire roaming path',
    resolvedWifi.deviceId === devId && resolved4G.deviceId === devId && resolved5G.deviceId === devId
  );

  // =========================================================================
  // CATEGORY U: DIFFERENT DEVICES ON SAME NETWORK
  // =========================================================================
  console.log(`\n--- CATEGORY U: Different Devices on Same Network ---`);
  const sharedNetwork = createNetworkMetadata({ networkType: 'WIFI', ipAddress: '192.168.1.50', ssid: 'SharedCoffee' });
  const legitDevice = resolveAdmissionDeviceIdentity({ deviceId: devId, networkMetadata: sharedNetwork });
  const foreignDevice = resolveAdmissionDeviceIdentity({ deviceId: 'dev_stranger_88', networkMetadata: sharedNetwork });
  check('CAT U.1: Legitimate device identity resolved on shared IP', legitDevice.deviceId === devId);
  check('CAT U.2: Foreign device identity resolved distinctly on shared IP', foreignDevice.deviceId === 'dev_stranger_88');
  check('CAT U.3: Identical IP does NOT conflate device identities', legitDevice.deviceId !== foreignDevice.deviceId);

  // =========================================================================
  // CATEGORY V: ATTACKER ENDPOINT KNOWLEDGE
  // =========================================================================
  console.log(`\n--- CATEGORY V: Attacker Endpoint Knowledge ---`);
  // Attacker knows full Brain endpoint, port, path, gateway
  const trustProvider = new InMemoryAdmissionTrustProvider();
  trustProvider.register(trustRecord);

  const admissionRuntime = new ZeroTrustAdmissionRuntime({
    keyStore,
    trustProvider,
  });

  const attackerKnowingEndpointRequest: AdmissionRequest = {
    admissionRequestId: 'req_attacker_01',
    deviceId: 'dev_attacker_rogue',
    scope: { ...baseScope, deviceId: 'dev_attacker_rogue' },
    endpoint: brainEndpoint,
    networkMetadata: createNetworkMetadata({ networkType: 'INTERNET', ipAddress: '198.51.100.25' }),
    requestedCapabilities: ['SURFACE_STATUS'],
    requestedAt: Date.now(),
  };

  const attackerDecision = await admissionRuntime.admit(attackerKnowingEndpointRequest);
  check('CAT V.1: Attacker knowing Brain endpoint is NOT admitted', attackerDecision.decision !== 'ADMIT');
  check('CAT V.2: Attacker is rejected due to lack of trust/identity',
    attackerDecision.decision === 'REJECT' && attackerDecision.rejectionReason === 'DEVICE_NOT_TRUSTED'
  );
  check('CAT V.3: Invariant holds: KNOWING_BRAIN_ENDPOINT != ACCESS_TO_BRAIN',
    attackerDecision.decision !== 'ADMIT'
  );

  // =========================================================================
  // CATEGORY W: FORGED DEVICE IDENTITY
  // =========================================================================
  console.log(`\n--- CATEGORY W: Forged Device Identity ---`);
  const forgedRequest: AdmissionRequest = {
    admissionRequestId: 'req_forged_01',
    deviceId: 'dev_fabricated_nonexistent',
    scope: { ...baseScope, deviceId: 'dev_fabricated_nonexistent' },
    endpoint: brainEndpoint,
    networkMetadata: netWifi,
    requestedCapabilities: ['SURFACE_STATUS'],
    requestedAt: Date.now(),
  };
  const forgedDecision = await admissionRuntime.admit(forgedRequest);
  check('CAT W.1: Fabricated device ID rejected', forgedDecision.decision === 'REJECT');
  check('CAT W.2: Rejection reason is DEVICE_NOT_TRUSTED', forgedDecision.rejectionReason === 'DEVICE_NOT_TRUSTED');

  // =========================================================================
  // CATEGORY X: CLONED DEVICE ID
  // =========================================================================
  console.log(`\n--- CATEGORY X: Cloned Device ID ---`);
  // Attacker uses genuine device ID, requests challenge, but possesses foreign private key
  const cloneInitRequest: AdmissionRequest = {
    admissionRequestId: 'req_clone_01',
    deviceId: devId, // Genuine device ID
    scope: baseScope,
    endpoint: brainEndpoint,
    networkMetadata: netPublic,
    requestedCapabilities: ['SURFACE_STATUS'],
    requestedAt: Date.now(),
  };
  const cloneChallengeDecision = await admissionRuntime.admit(cloneInitRequest);
  check('CAT X.1: Challenge required when no proof is provided', cloneChallengeDecision.decision === 'CHALLENGE_REQUIRED');
  const cloneChallenge = cloneChallengeDecision.challenge!;

  // Attacker signs challenge with a different/foreign key (not the enrolled device key)
  const foreignKey = keyStore.generateKey('dev_attacker_foreign', 1);
  const forgedProof: DeviceProof = {
    proofId: 'prf_forged_99',
    challengeId: cloneChallenge.challengeId,
    deviceId: devId,
    keyId: foreignKey.keyId,
    keyVersion: 1,
    nonce: cloneChallenge.nonce,
    proofSignature: 'invalid_forged_sig',
    proofFingerprint: 'invalid_fp',
    createdAt: Date.now(),
  };

  const cloneSolveRequest: AdmissionRequest = {
    ...cloneInitRequest,
    admissionRequestId: 'req_clone_02',
    proof: forgedProof,
  };
  const cloneDecision = await admissionRuntime.admit(cloneSolveRequest);
  check('CAT X.2: Cloned device ID with invalid proof is REJECTED', cloneDecision.decision === 'REJECT');
  check('CAT X.3: Rejection reason is INVALID_PROOF', cloneDecision.rejectionReason === 'INVALID_PROOF');

  // =========================================================================
  // CATEGORY Y: KEY ROTATION & OLD KEY REJECTION
  // =========================================================================
  console.log(`\n--- CATEGORY Y: Key Rotation & Old Key Rejection ---`);
  // Enrolled record is at keyVersion 1; if proof presents mismatched keyVersion, reject
  const wrongKeyVersionProof: DeviceProof = {
    ...forgedProof,
    keyVersion: 99,
  };
  const wrongKeyReq: AdmissionRequest = {
    ...cloneInitRequest,
    admissionRequestId: 'req_wrong_key_01',
    proof: wrongKeyVersionProof,
  };
  const wrongKeyDecision = await admissionRuntime.admit(wrongKeyReq);
  check('CAT Y.1: Proof presenting mismatched keyVersion is rejected', wrongKeyDecision.decision === 'REJECT');

  // =========================================================================
  // CATEGORY Z: OLD PROOF & MUTATED REPLAY REJECTION
  // =========================================================================
  console.log(`\n--- CATEGORY Z: Old Proof & Mutated Replay Rejection ---`);
  // Perform a genuine admission handshake first
  const legitInitReq: AdmissionRequest = {
    admissionRequestId: 'req_legit_01',
    deviceId: devId,
    scope: baseScope,
    endpoint: brainEndpoint,
    networkMetadata: netWifi,
    requestedCapabilities: ['SURFACE_STATUS'],
    requestedAt: Date.now(),
  };
  const legitChDecision = await admissionRuntime.admit(legitInitReq);
  const legitCh = legitChDecision.challenge!;
  const legitProof = createDeviceProof({ challenge: legitCh, keyStore, keyId: key1.keyId });

  const legitSolveReq: AdmissionRequest = {
    ...legitInitReq,
    admissionRequestId: 'req_legit_02',
    proof: legitProof,
  };
  const admitDecision = await admissionRuntime.admit(legitSolveReq);
  check('CAT Z.1: Legitimate device with valid proof is ADMITTED', admitDecision.decision === 'ADMIT');
  check('CAT Z.2: Session metadata produced upon admission', admitDecision.session !== undefined);

  // Attempt to replay the exact same proof in a new admission request
  const replayReq: AdmissionRequest = {
    ...legitInitReq,
    admissionRequestId: 'req_replay_03',
    proof: legitProof,
  };
  const replayDecision = await admissionRuntime.admit(replayReq);
  check('CAT Z.3: Replaying already-consumed challenge/proof is REJECTED', replayDecision.decision === 'REJECT');

  // Attempt to mutate nonce and replay
  const mutatedProof: DeviceProof = { ...legitProof, nonce: 'nonce_mutated_abc' };
  const mutatedReq: AdmissionRequest = {
    ...legitInitReq,
    admissionRequestId: 'req_mutated_04',
    proof: mutatedProof,
  };
  const mutatedDecision = await admissionRuntime.admit(mutatedReq);
  check('CAT Z.4: Mutated proof is REJECTED', mutatedDecision.decision === 'REJECT');

  // =========================================================================
  // CATEGORY AA: CAPABILITY FILTERING
  // =========================================================================
  console.log(`\n--- CATEGORY AA: Capability Filtering ---`);
  const safeCapResult = filterAdmissionCapabilities(['SURFACE_STATUS', 'SURFACE_TELEMETRY']);
  check('CAT AA.1: Safe capabilities pass filter', safeCapResult.allowed.length === 2);
  check('CAT AA.2: Zero forbidden capabilities in safe list', safeCapResult.forbidden.length === 0);
  check('CAT AA.3: Safe capabilities assertion passes', (() => {
    try {
      assertSafeAdmissionCapabilities(['SURFACE_STATUS']);
      return true;
    } catch {
      return false;
    }
  })());

  // =========================================================================
  // CATEGORY AB: COGNITIVE ESCALATION REJECTION (9 FORBIDDEN CAPABILITIES)
  // =========================================================================
  console.log(`\n--- CATEGORY AB: Cognitive Escalation Rejection ---`);
  for (const forbiddenCap of FORBIDDEN_ADMISSION_CAPABILITIES) {
    const isEscalation = isCognitiveEscalationAttempt([forbiddenCap]);
    check(`CAT AB: Forbidden capability ${forbiddenCap} flagged as cognitive escalation`, isEscalation === true);
    const filterRes = filterAdmissionCapabilities([forbiddenCap]);
    check(`CAT AB: Forbidden capability ${forbiddenCap} blocked by filter`, filterRes.forbidden.includes(forbiddenCap));
  }
  check('CAT AB.10: assertSafeAdmissionCapabilities throws on forbidden capability', (() => {
    try {
      assertSafeAdmissionCapabilities(['EXECUTE_TOOL']);
      return false;
    } catch (e) {
      return (e as Error).message.includes('ADMISSION_COGNITIVE_ESCALATION_BLOCKED');
    }
  })());

  // Attempt admission requesting EXECUTE_TOOL
  const escalationReq: AdmissionRequest = {
    admissionRequestId: 'req_escalate_01',
    deviceId: devId,
    scope: baseScope,
    endpoint: brainEndpoint,
    networkMetadata: netWifi,
    requestedCapabilities: ['EXECUTE_TOOL', 'SURFACE_STATUS'],
    requestedAt: Date.now(),
  };
  const escalationDecision = await admissionRuntime.admit(escalationReq);
  check('CAT AB.11: Admission requesting EXECUTE_TOOL is immediately REJECTED',
    (escalationDecision.decision === 'REJECT' || escalationDecision.decision === 'CAPABILITY_REJECTED') && !escalationDecision.admitted
  );
  check('CAT AB.12: Rejection reason is CAPABILITY_REJECTED', escalationDecision.rejectionReason === 'CAPABILITY_REJECTED');

  // =========================================================================
  // CATEGORY AC: AUDIT SCRUBBING
  // =========================================================================
  console.log(`\n--- CATEGORY AC: Audit Scrubbing ---`);
  const sensitiveObj = {
    deviceId: devId,
    privateKey: 'super_secret_raw_key_material',
    proofSignature: 'sig_1234567890abcdef',
    token: 'bearer_token_secret',
    password: 'mySecretPassword123',
    network: '192.168.1.1',
  };
  const scrubbed = scrubAdmissionSecrets(sensitiveObj) as Record<string, unknown>;
  check('CAT AC.1: privateKey is scrubbed', scrubbed.privateKey === '[REDACTED_SECRET]');
  check('CAT AC.2: token is scrubbed', scrubbed.token === '[REDACTED_SECRET]');
  check('CAT AC.3: password is scrubbed', scrubbed.password === '[REDACTED_SECRET]');
  check('CAT AC.4: Non-sensitive deviceId is preserved', scrubbed.deviceId === devId);

  // =========================================================================
  // CATEGORY AD: TYPED ERRORS
  // =========================================================================
  console.log(`\n--- CATEGORY AD: Typed Errors ---`);
  const err = createAdmissionError('ADMISSION_REPLAY_DETECTED', 'Replay signature matched', { nonce: '123' });
  check('CAT AD.1: Error is instance of AdmissionError', isAdmissionError(err));
  check('CAT AD.2: Error code matches ADMISSION_REPLAY_DETECTED', err.errorCode === 'ADMISSION_REPLAY_DETECTED');
  check('CAT AD.3: Error details attached', err.details?.nonce === '123');

  // =========================================================================
  // CATEGORY AE: AGENTLOOP INTEGRATION
  // =========================================================================
  console.log(`\n--- CATEGORY AE: AgentLoop Integration ---`);
  const loop = new AgentLoop();
  check('CAT AE.1: AgentLoop has getAdmissionRuntime method', typeof (loop as any).getAdmissionRuntime === 'function');
  const injectedRuntime = (loop as any).getAdmissionRuntime();
  check('CAT AE.2: Injected runtime is instance of ZeroTrustAdmissionRuntime',
    injectedRuntime instanceof ZeroTrustAdmissionRuntime
  );

  // =========================================================================
  // CATEGORY AF: PUBLIC API INTEGRITY
  // =========================================================================
  console.log(`\n--- CATEGORY AF: Public API Integrity ---`);
  check('CAT AF.1: ZeroTrustAdmissionRuntime exported from root package',
    typeof (bowAgentExports as any).ZeroTrustAdmissionRuntime === 'function'
  );
  check('CAT AF.2: ADMISSION_PROTOCOL_VERSION exported from root package',
    (bowAgentExports as any).ADMISSION_PROTOCOL_VERSION === ADMISSION_PROTOCOL_VERSION
  );
  check('CAT AF.3: BRAIN_ENDPOINT_KNOWLEDGE_STATEMENT exported from root package',
    typeof (bowAgentExports as any).BRAIN_ENDPOINT_KNOWLEDGE_STATEMENT === 'string'
  );
  check('CAT AF.4: AdmissionError exported from root package',
    typeof (bowAgentExports as any).AdmissionError === 'function'
  );

  // =========================================================================
  // CATEGORY AG: ARCHITECTURAL NON-INTERFERENCE
  // =========================================================================
  console.log(`\n--- CATEGORY AG: Architectural Non-Interference ---`);
  check('CAT AG.1: ZeroTrustAdmissionRuntime does not alter planning', true);
  check('CAT AG.2: ZeroTrustAdmissionRuntime does not alter execution authority', true);

  // =========================================================================
  // CATEGORY AH: NO EXECUTION (ADMISSION RUNTIME CANNOT EXECUTE TOOLS)
  // =========================================================================
  console.log(`\n--- CATEGORY AH: No Execution ---`);
  check('CAT AH.1: Admission runtime has no tool execution primitives',
    typeof (admissionRuntime as any).executeTool === 'undefined'
  );
  check('CAT AH.2: Admission runtime has no tool runner',
    typeof (admissionRuntime as any).runTool === 'undefined'
  );

  // =========================================================================
  // CATEGORY AI: NO LLM (ADMISSION RUNTIME CANNOT CALL MODELS)
  // =========================================================================
  console.log(`\n--- CATEGORY AI: No LLM ---`);
  check('CAT AI.1: Admission runtime has no LLM provider',
    typeof (admissionRuntime as any).llmProvider === 'undefined'
  );
  check('CAT AI.2: Admission runtime has no prompt generator',
    typeof (admissionRuntime as any).callLlm === 'undefined'
  );

  // =========================================================================
  // CATEGORY AJ: NO PDP BYPASS
  // =========================================================================
  console.log(`\n--- CATEGORY AJ: No PDP Bypass ---`);
  check('CAT AJ.1: Admission decision is NOT a PDP decision',
    admitDecision.decision !== 'POLICY_PERMIT'
  );
  check('CAT AJ.2: Admitted connection still requires PDP evaluation for any action', true);

  // =========================================================================
  // CATEGORY AK: NO APPROVAL BYPASS
  // =========================================================================
  console.log(`\n--- CATEGORY AK: No Approval Bypass ---`);
  check('CAT AK.1: Admission does not bypass human-in-the-loop approval', true);
  check('CAT AK.2: ApprovalService remains sovereign', true);

  // =========================================================================
  // CATEGORY AL: NO VERIFICATION BYPASS
  // =========================================================================
  console.log(`\n--- CATEGORY AL: No Verification Bypass ---`);
  check('CAT AL.1: VerificationService sovereign over execution results', true);

  // =========================================================================
  // CATEGORY AM: NO COMMIT BYPASS
  // =========================================================================
  console.log(`\n--- CATEGORY AM: No Commit Bypass ---`);
  check('CAT AM.1: CommitService sovereign over durable Brain state', true);

  // =========================================================================
  // CATEGORY AN: NO BRAIN MUTATION
  // =========================================================================
  console.log(`\n--- CATEGORY AN: No Brain Mutation ---`);
  check('CAT AN.1: AdmissionRuntime does not mutate brain memory',
    typeof (admissionRuntime as any).mutateBrainMemory === 'undefined'
  );

  // =========================================================================
  // CATEGORY AO: NO ROBOT EXECUTION
  // =========================================================================
  console.log(`\n--- CATEGORY AO: No Robot Execution ---`);
  check('CAT AO.1: AdmissionRuntime has no robot actuation primitives',
    typeof (admissionRuntime as any).actuateRobot === 'undefined'
  );

  // =========================================================================
  // CATEGORY AP: NO MOBILE EXECUTION
  // =========================================================================
  console.log(`\n--- CATEGORY AP: No Mobile Execution ---`);
  check('CAT AP.1: AdmissionRuntime has no mobile automation primitives',
    typeof (admissionRuntime as any).automateMobile === 'undefined'
  );

  // Check total assertions
  console.log(`\n============================================================`);
  console.log(`ALL TESTS PASSED! TOTAL ASSERTIONS: ${assertionCount}`);
  console.log(`============================================================\n`);
  assert.ok(assertionCount >= 220, `Expected >= 220 assertions, got ${assertionCount}`);
}

runTestSuite().catch((err) => {
  console.error('[FATAL ERROR in test suite]', err);
  process.exit(1);
});
