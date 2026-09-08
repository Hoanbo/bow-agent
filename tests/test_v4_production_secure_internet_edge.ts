// tests/test_v4_production_secure_internet_edge.ts
// BOWCON V4.0 — MS-1.3.29: PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME
// Comprehensive test suite — Categories A-O (15 architectural invariants)

import {
  // Types
  INTERNET_SUBSYSTEM_VERSION,
  INTERNET_MIN_TLS_VERSION,
  ALL_INTERNET_STATES,
  INTERNET_TERMINAL_STATES,
  INTERNET_TRANSMIT_STATES,
  isInternetActive,
  isInternetTerminal,
  isInternetRecovering,
  canInternetTransmit,
  INTERNET_TRANSITIONS,
  isValidInternetTransition,
  assertValidInternetTransition,
  InternetEdgeError,
  sanitizeInternetErrorMessage,
  INTERNET_ALLOWED_CIPHER_SUITES,
  INTERNET_REJECTED_TLS_VERSIONS,
  validateTlsSession,
  detectTlsDowngrade,
  withTlsHandshakeTimeout,
  validateCertificate,
  assertCertificateValid,
  makeMockCertFingerprint,
  validateInternetEndpoint,
  assertInternetEndpointValid,
  normalizeInternetEndpoint,
  internetEndpointKey,
  appendInternetAuditEvent,
  snapshotInternetAuditLedger,
  getInternetAuditEventsForSession,
  countInternetTlsRejections,
  assertTlsRejectionBurstAllowed,
  InternetHealthMonitor,
  classifyRtt,
  INTERNET_DEFAULT_HEALTH_POLICY,
  INTERNET_DEFAULT_ROAMING_POLICY,
  InternetRoamingTracker,
  detectRoamingTransition,
  INTERNET_DEFAULT_RECONNECT_POLICY,
  InternetReconnectScheduler,
  internetReconnectWait,
  InternetAdmissionBridge,
  InternetRelayBridge,
  InternetEdge,
  InternetRuntime,
  makeInternetEdgeSessionId,
  type InternetEdgeState,
  type InternetAuditLedger,
} from '../src/core/internet/index.js';

// ---------------------------------------------------------------------------
// Test Harness
// ---------------------------------------------------------------------------

let _passed = 0;
let _failed = 0;
const _failures: string[] = [];

function testAssert(condition: boolean, label: string): void {
  if (condition) {
    _passed++;
  } else {
    _failed++;
    _failures.push(`  ✗ FAILED: ${label}`);
    console.error(`  ✗ FAILED: ${label}`);
  }
}

function testAssertThrows(fn: () => unknown, label: string, codeCheck?: string): void {
  try {
    fn();
    _failed++;
    _failures.push(`  ✗ FAILED (no throw): ${label}`);
    console.error(`  ✗ FAILED (no throw): ${label}`);
  } catch (e: any) {
    if (codeCheck && e instanceof InternetEdgeError) {
      if (e.code !== codeCheck) {
        _failed++;
        _failures.push(`  ✗ FAILED (wrong code ${e.code}, expected ${codeCheck}): ${label}`);
        console.error(`  ✗ FAILED (wrong code ${e.code}, expected ${codeCheck}): ${label}`);
        return;
      }
    }
    _passed++;
  }
}

// ---------------------------------------------------------------------------
// CATEGORY A: Type Contracts & Constants
// ---------------------------------------------------------------------------
console.log('\nRunning Category A: Type Contracts & Constants...');

testAssert(INTERNET_SUBSYSTEM_VERSION === '4.0.0', 'A.1: Subsystem version is 4.0.0');
testAssert(INTERNET_MIN_TLS_VERSION === 'TLSv1.3', 'A.2: Minimum TLS version is TLSv1.3');
testAssert(ALL_INTERNET_STATES.length === 14, 'A.3: 14 Internet Edge states defined');
testAssert(INTERNET_TERMINAL_STATES.length === 2, 'A.4: 2 terminal states (CLOSED, REJECTED)');
testAssert(INTERNET_TRANSMIT_STATES.length === 2, 'A.5: 2 transmit states (ACTIVE, DEGRADED)');
testAssert(INTERNET_ALLOWED_CIPHER_SUITES.length === 3, 'A.6: 3 AEAD cipher suites whitelisted');
testAssert(
  (INTERNET_REJECTED_TLS_VERSIONS as string[]).includes('TLSv1.0'),
  'A.7: TLSv1.0 is in rejected list'
);
testAssert(
  (INTERNET_REJECTED_TLS_VERSIONS as string[]).includes('TLSv1.2'),
  'A.8: TLSv1.2 is in rejected list (allowed only in test stubs)'
);

// ---------------------------------------------------------------------------
// CATEGORY B: State Taxonomy
// ---------------------------------------------------------------------------
console.log('Running Category B: State Taxonomy...');

testAssert(isInternetActive('INTERNET_ACTIVE'), 'B.1: INTERNET_ACTIVE is active');
testAssert(isInternetActive('INTERNET_DEGRADED'), 'B.2: INTERNET_DEGRADED is active');
testAssert(!isInternetActive('INTERNET_ADMITTED'), 'B.3: INTERNET_ADMITTED is not active');
testAssert(isInternetTerminal('INTERNET_CLOSED'), 'B.4: INTERNET_CLOSED is terminal');
testAssert(isInternetTerminal('INTERNET_REJECTED'), 'B.5: INTERNET_REJECTED is terminal');
testAssert(!isInternetTerminal('INTERNET_ACTIVE'), 'B.6: INTERNET_ACTIVE is not terminal');
testAssert(isInternetRecovering('INTERNET_RECONNECTING'), 'B.7: INTERNET_RECONNECTING is recovering');
testAssert(isInternetRecovering('INTERNET_ROAMING'), 'B.8: INTERNET_ROAMING is recovering');
testAssert(canInternetTransmit('INTERNET_ACTIVE'), 'B.9: Can transmit in ACTIVE state');
testAssert(!canInternetTransmit('INTERNET_ADMITTED'), 'B.10: Cannot transmit in ADMITTED state');

// ---------------------------------------------------------------------------
// CATEGORY C: Transition Matrix
// ---------------------------------------------------------------------------
console.log('Running Category C: Transition Matrix...');

testAssert(
  isValidInternetTransition('INTERNET_OFFLINE', 'INTERNET_RESOLVING'),
  'C.1: OFFLINE → RESOLVING legal'
);
testAssert(
  isValidInternetTransition('INTERNET_ADMITTED', 'INTERNET_RELAY_BINDING'),
  'C.2: ADMITTED → RELAY_BINDING legal'
);
testAssert(
  !isValidInternetTransition('INTERNET_CLOSED', 'INTERNET_ACTIVE'),
  'C.3: CLOSED → ACTIVE illegal'
);
testAssert(
  !isValidInternetTransition('INTERNET_REJECTED', 'INTERNET_ACTIVE'),
  'C.4: REJECTED → ACTIVE illegal (terminal)'
);
testAssert(
  isValidInternetTransition('INTERNET_ACTIVE', 'INTERNET_REJECTED'),
  'C.5: ACTIVE → REJECTED always legal'
);
testAssert(
  isValidInternetTransition('INTERNET_ACTIVE', 'INTERNET_ROAMING'),
  'C.6: ACTIVE → ROAMING legal'
);
testAssert(
  isValidInternetTransition('INTERNET_DEGRADED', 'INTERNET_ACTIVE'),
  'C.7: DEGRADED → ACTIVE (recovery) legal'
);
testAssertThrows(
  () => assertValidInternetTransition('INTERNET_CLOSED', 'INTERNET_ACTIVE'),
  'C.8: assertValidInternetTransition throws on illegal transition',
  'INTERNET_ILLEGAL_TRANSITION'
);
// Self-transition always allowed
testAssert(
  isValidInternetTransition('INTERNET_ACTIVE', 'INTERNET_ACTIVE'),
  'C.9: Self-transition always legal'
);

// ---------------------------------------------------------------------------
// CATEGORY D: Error Hierarchy & Secret Scrubbing
// ---------------------------------------------------------------------------
console.log('Running Category D: Error Hierarchy & Secret Scrubbing...');

const err = new InternetEdgeError('INTERNET_TLS_HANDSHAKE_FAILED', 'handshake failed');
testAssert(err instanceof Error, 'D.1: InternetEdgeError extends Error');
testAssert(err.name === 'InternetEdgeError', 'D.2: Error name is InternetEdgeError');
testAssert(err.code === 'INTERNET_TLS_HANDSHAKE_FAILED', 'D.3: Error code preserved');
testAssert(typeof err.timestamp === 'number', 'D.4: Error has timestamp');
testAssert(err.message.includes('[INTERNET_TLS_HANDSHAKE_FAILED]'), 'D.5: Message includes code');

const raw = 'token=abc123xyz secret=s3cr3t bearer=tok_live_abc';
const scrubbed = sanitizeInternetErrorMessage(raw);
testAssert(!scrubbed.includes('abc123xyz'), 'D.6: Secret value scrubbed');
testAssert(!scrubbed.includes('s3cr3t'), 'D.7: Secret value scrubbed');
testAssert(scrubbed.includes('[REDACTED_SECRET]'), 'D.8: REDACTED marker present');

const pemRaw = '-----BEGIN PRIVATE KEY-----\nABCDEFG\n-----END PRIVATE KEY-----';
const pemScrubbed = sanitizeInternetErrorMessage(pemRaw);
testAssert(!pemScrubbed.includes('ABCDEFG'), 'D.9: PEM block scrubbed');
testAssert(pemScrubbed.includes('[REDACTED_KEY_BLOCK]'), 'D.10: PEM block replaced');

// ---------------------------------------------------------------------------
// CATEGORY E: TLS Governance
// ---------------------------------------------------------------------------
console.log('Running Category E: TLS Governance...');

const goodTls = validateTlsSession(
  { negotiatedVersion: 'TLSv1.3', negotiatedCipher: 'TLS_AES_256_GCM_SHA384', isMtls: true, durationMs: 120 },
  { requireMtls: true, allowTls12: false }
);
testAssert(goodTls.result === 'TLS_ACCEPTED', 'E.1: TLSv1.3 + AEAD cipher + mTLS accepted');
testAssert(goodTls.acceptedVersion === 'TLSv1.3', 'E.2: Accepted version recorded');

const oldTls = validateTlsSession(
  { negotiatedVersion: 'TLSv1.2', negotiatedCipher: 'TLS_AES_256_GCM_SHA384', isMtls: true, durationMs: 200 },
  { requireMtls: true, allowTls12: false }
);
testAssert(oldTls.result === 'TLS_REJECTED_VERSION', 'E.3: TLSv1.2 rejected in production mode');

const badCipher = validateTlsSession(
  { negotiatedVersion: 'TLSv1.3', negotiatedCipher: 'TLS_RSA_WITH_AES_256_CBC_SHA', isMtls: true, durationMs: 100 },
  { requireMtls: true, allowTls12: false }
);
testAssert(badCipher.result === 'TLS_REJECTED_CIPHER', 'E.4: Non-AEAD cipher rejected');

const noMtls = validateTlsSession(
  { negotiatedVersion: 'TLSv1.3', negotiatedCipher: 'TLS_AES_256_GCM_SHA384', isMtls: false, durationMs: 90 },
  { requireMtls: true, allowTls12: false }
);
testAssert(noMtls.result === 'TLS_REJECTED_CERT', 'E.5: Missing mTLS rejected when required');

// Downgrade detection
testAssert(detectTlsDowngrade('TLSv1.3', 'TLSv1.2'), 'E.6: TLSv1.3 → TLSv1.2 is downgrade');
testAssert(!detectTlsDowngrade('TLSv1.3', 'TLSv1.3'), 'E.7: Same version is not downgrade');
testAssert(detectTlsDowngrade('TLSv1.3', 'TLSv1.0'), 'E.8: TLSv1.3 → TLSv1.0 is downgrade');

// Handshake timeout
const fast = await withTlsHandshakeTimeout(Promise.resolve(42), 1000);
testAssert(fast === 42, 'E.9: withTlsHandshakeTimeout passes through resolved value');

let timeoutFired = false;
try {
  await withTlsHandshakeTimeout(new Promise(() => {}), 50);
} catch (e: any) {
  timeoutFired = e instanceof InternetEdgeError && e.code === 'INTERNET_TLS_HANDSHAKE_FAILED';
}
testAssert(timeoutFired, 'E.10: TLS handshake timeout fires and throws InternetEdgeError');

// ---------------------------------------------------------------------------
// CATEGORY F: Certificate Validation
// ---------------------------------------------------------------------------
console.log('Running Category F: Certificate Validation...');

const now = Date.now();
const goodCert = {
  fingerprint: makeMockCertFingerprint('test-relay'),
  subjectCN: 'relay.bowcon.internal',
  issuerCN: 'BOW Root CA',
  notBefore: now - 1000,
  notAfter: now + 86400_000,
  keyAlgorithm: 'ECDSA_P256' as const,
  serialNumber: 'dead0001',
};
const certResult = validateCertificate(goodCert);
testAssert(certResult.valid, 'F.1: Valid ECDSA_P256 cert accepted');

const expiredCert = { ...goodCert, notAfter: now - 1 };
const expiredResult = validateCertificate(expiredCert);
testAssert(!expiredResult.valid, 'F.2: Expired cert rejected');
testAssert(expiredResult.reason?.includes('expired') ?? false, 'F.3: Expiry reason reported');

const futureCert = { ...goodCert, notBefore: now + 86400_000 };
const futureResult = validateCertificate(futureCert);
testAssert(!futureResult.valid, 'F.4: Not-yet-valid cert rejected');

// Pin matching
const pinResult = validateCertificate(goodCert, { pinSet: [goodCert.fingerprint] });
testAssert(pinResult.valid, 'F.5: Cert with matching pin accepted');

const wrongPin = validateCertificate(goodCert, { pinSet: ['deadbeef'.repeat(8)] });
testAssert(!wrongPin.valid, 'F.6: Cert with wrong pin rejected');

testAssertThrows(
  () => assertCertificateValid(expiredCert),
  'F.7: assertCertificateValid throws on expired cert',
  'INTERNET_CERT_CHAIN_INVALID'
);

// ---------------------------------------------------------------------------
// CATEGORY G: Endpoint Validation
// ---------------------------------------------------------------------------
console.log('Running Category G: Endpoint Validation...');

const goodEndpoint = {
  host: 'relay.bowcon.example.com',
  port: 443,
  tlsRequired: true,
  mtlsRequired: true,
};

testAssert(validateInternetEndpoint(goodEndpoint).valid, 'G.1: Valid endpoint accepted');
testAssert(
  !validateInternetEndpoint({ ...goodEndpoint, host: 'localhost' }).valid,
  'G.2: localhost endpoint rejected'
);
testAssert(
  !validateInternetEndpoint({ ...goodEndpoint, host: '127.0.0.1' }).valid,
  'G.3: 127.0.0.1 endpoint rejected'
);
testAssert(
  !validateInternetEndpoint({ ...goodEndpoint, port: 0 }).valid,
  'G.4: Port 0 rejected'
);
testAssert(
  !validateInternetEndpoint({ ...goodEndpoint, port: 65536 }).valid,
  'G.5: Port 65536 rejected'
);
testAssert(
  !validateInternetEndpoint({ ...goodEndpoint, tlsRequired: false }).valid,
  'G.6: Non-TLS endpoint rejected in production mode'
);
testAssert(
  validateInternetEndpoint({ ...goodEndpoint, tlsRequired: false }, { allowInsecure: true }).valid,
  'G.7: Non-TLS endpoint accepted when allowInsecure=true'
);

const normalized = normalizeInternetEndpoint({ ...goodEndpoint, host: '  relay.example.com  ' });
testAssert(normalized.host === 'relay.example.com', 'G.8: Host whitespace trimmed');

const key1 = internetEndpointKey(goodEndpoint);
testAssert(key1.includes('relay.bowcon.example.com'), 'G.9: Endpoint key includes host');
testAssert(key1.includes('443'), 'G.10: Endpoint key includes port');

// ---------------------------------------------------------------------------
// CATEGORY H: Audit Ledger
// ---------------------------------------------------------------------------
console.log('Running Category H: Audit Ledger...');

const ledger: InternetAuditLedger = { events: [] };
const sid = makeInternetEdgeSessionId('test_session_h');

appendInternetAuditEvent(ledger, { type: 'EDGE_ACTIVE', sessionId: sid });
appendInternetAuditEvent(ledger, { type: 'EDGE_TLS_REJECTED', sessionId: sid });
appendInternetAuditEvent(ledger, { type: 'EDGE_CERT_REJECTED', sessionId: sid });

testAssert(ledger.events.length === 3, 'H.1: 3 audit events recorded');
testAssert(Object.isFrozen(ledger.events[0]), 'H.2: Audit events are frozen');

const auditSnap = snapshotInternetAuditLedger(ledger);
testAssert(Object.isFrozen(auditSnap), 'H.3: Snapshot is frozen');
testAssert(auditSnap.length === 3, 'H.4: Snapshot contains all events');

const sessionEvents = getInternetAuditEventsForSession(ledger, sid);
testAssert(sessionEvents.length === 3, 'H.5: Session-scoped filter works');

const rejections = countInternetTlsRejections(ledger);
testAssert(rejections === 2, 'H.6: TLS rejection count correct (TLS + cert)');

assertTlsRejectionBurstAllowed(ledger, 10);  // should not throw
testAssert(true, 'H.7: Burst limit not exceeded');

testAssertThrows(
  () => assertTlsRejectionBurstAllowed(ledger, 2),
  'H.8: Burst limit exceeded throws InternetEdgeError',
  'INTERNET_OVERLOAD_REJECTED'
);

// ---------------------------------------------------------------------------
// CATEGORY I: Health Monitor
// ---------------------------------------------------------------------------
console.log('Running Category I: Health Monitor...');

const health = new InternetHealthMonitor({ degradedThresholdMs: 500 });
testAssert(health.level === 'UNKNOWN', 'I.1: Initial health level is UNKNOWN');

const probe1 = health.recordProbe(100);
testAssert(probe1.level === 'HEALTHY', 'I.2: 100ms RTT is HEALTHY');
testAssert(health.consecutiveMisses === 0, 'I.3: No consecutive misses after healthy probe');

const probe2 = health.recordProbe(1000);
testAssert(probe2.level === 'DEGRADED', 'I.4: 1000ms RTT exceeds threshold → DEGRADED');

const probe3 = health.recordProbe(-1);
testAssert(probe3.level === 'RECOVERING', 'I.5: Failed probe → RECOVERING (1 miss)');
testAssert(health.consecutiveMisses === 1, 'I.6: Consecutive miss counter incremented');

// After 3 misses → UNREACHABLE
health.recordProbe(-1);
const probe5 = health.recordProbe(-1);
testAssert(probe5.level === 'UNREACHABLE', 'I.7: 3 consecutive misses → UNREACHABLE');

testAssert(classifyRtt(50, 500) === 'HEALTHY', 'I.8: classifyRtt 50ms → HEALTHY');
testAssert(classifyRtt(1000, 500) === 'DEGRADED', 'I.9: classifyRtt 1000ms → DEGRADED');
testAssert(classifyRtt(-1, 500) === 'UNREACHABLE', 'I.10: classifyRtt -1 → UNREACHABLE');

testAssert(INTERNET_DEFAULT_HEALTH_POLICY.probeIntervalMs > 0, 'I.11: Default health policy has probe interval');

// ---------------------------------------------------------------------------
// CATEGORY J: Roaming Tracker
// ---------------------------------------------------------------------------
console.log('Running Category J: Roaming Tracker...');

const roamLedger: InternetAuditLedger = { events: [] };
const roamer = new InternetRoamingTracker({ debounceMs: 0, maxRoamingEvents: 3 }, roamLedger);
testAssert(roamer.roamingCount === 0, 'J.1: Initial roaming count is 0');

const ev1 = roamer.recordRoaming('INTERFACE_CHANGE');
testAssert(ev1.sequence === 1, 'J.2: First roaming event has sequence 1');
testAssert(ev1.reason === 'INTERFACE_CHANGE', 'J.3: Reason preserved');

roamer.recordRoaming('IP_CHANGE');
roamer.recordRoaming('NETWORK_SWITCH');

testAssertThrows(
  () => roamer.recordRoaming('DNS_CHANGE'),
  'J.4: Max roaming events throws InternetEdgeError',
  'INTERNET_ROAMING_FAILED'
);
testAssert(roamer.roamingCount === 3, 'J.5: Count at max (3)');

// detect roaming transition
const prev = { label: 'eth0', isWireless: false, mtu: 1500 };
const curr = { label: 'wlan0', isWireless: true, mtu: 1500 };
testAssert(detectRoamingTransition(prev, curr) === 'INTERFACE_CHANGE', 'J.6: Interface change detected');
testAssert(detectRoamingTransition(prev, prev) === undefined, 'J.7: Same interface → no roaming');

testAssert(INTERNET_DEFAULT_ROAMING_POLICY.maxRoamingEvents > 0, 'J.8: Default roaming policy defined');

// ---------------------------------------------------------------------------
// CATEGORY K: Reconnect Scheduler
// ---------------------------------------------------------------------------
console.log('Running Category K: Reconnect Scheduler...');

const reconLedger: InternetAuditLedger = { events: [] };
const sched = new InternetReconnectScheduler(
  { initialDelayMs: 100, maxDelayMs: 5000, maxAttempts: 3, jitterFactor: 0 },
  reconLedger
);

testAssert(sched.attemptCount === 0, 'K.1: Initial attempt count is 0');
testAssert(!sched.isExhausted, 'K.2: Not exhausted initially');

const delay1 = sched.nextDelayMs();
testAssert(delay1 === 100, 'K.3: First delay is initialDelayMs (no jitter)');

sched.beginAttempt();
testAssert(sched.attemptCount === 1, 'K.4: Attempt count incremented');

sched.markFailed();
sched.beginAttempt();
sched.markFailed();
sched.beginAttempt();
sched.markFailed();

testAssert(sched.isExhausted, 'K.5: Exhausted after 3 attempts');
testAssertThrows(
  () => sched.beginAttempt(),
  'K.6: beginAttempt throws when exhausted',
  'INTERNET_RECONNECT_EXHAUSTED'
);

const sched2 = new InternetReconnectScheduler({ initialDelayMs: 100, maxDelayMs: 5000, maxAttempts: 5, jitterFactor: 0 });
sched2.beginAttempt();
sched2.markSucceeded();
testAssert(sched2.attemptCount === 0, 'K.7: markSucceeded resets attempt count');

testAssert(INTERNET_DEFAULT_RECONNECT_POLICY.maxAttempts > 0, 'K.8: Default reconnect policy defined');

// ---------------------------------------------------------------------------
// CATEGORY L: Admission Bridge
// ---------------------------------------------------------------------------
console.log('Running Category L: Admission Bridge...');

const admLedger: InternetAuditLedger = { events: [] };
const bridge = new InternetAdmissionBridge({ tokenTtlMs: 2000 }, admLedger);
const admSid = makeInternetEdgeSessionId('adm_session_L');
const fp = makeMockCertFingerprint('test-fp');

const token = bridge.issueToken({
  sessionId: admSid,
  tlsVersion: 'TLSv1.3',
  cipherSuite: 'TLS_AES_256_GCM_SHA384',
  certFingerprint: fp,
});
testAssert(token.sessionId === admSid, 'L.1: Token has correct sessionId');
testAssert(token.certFingerprint === fp, 'L.2: Token has cert fingerprint');
testAssert(typeof token.issuedAt === 'number', 'L.3: Token has issuedAt timestamp');
testAssert(bridge.pendingCount === 1, 'L.4: Pending count = 1 after issuance');

const result = bridge.consumeToken(admSid, fp);
testAssert(result.decision === 'ADMIT', 'L.5: Valid token ADMIT decision');
testAssert(result.token?.consumedAt !== undefined, 'L.6: Token has consumedAt after consumption');
testAssert(bridge.pendingCount === 0, 'L.7: Pending count = 0 after consumption (single-use)');

// Token already consumed — second consumption fails
const result2 = bridge.consumeToken(admSid, fp);
testAssert(result2.decision === 'REJECT_POLICY', 'L.8: Double-consumption rejected');

// Wrong fingerprint
const token2 = bridge.issueToken({ sessionId: admSid, tlsVersion: 'TLSv1.3', cipherSuite: 'TLS_AES_256_GCM_SHA384', certFingerprint: fp });
const badFp = bridge.consumeToken(admSid, 'wrongfingerprint'.padEnd(64, '0'));
testAssert(badFp.decision === 'REJECT_CERT', 'L.9: Wrong fingerprint → REJECT_CERT');

// ---------------------------------------------------------------------------
// CATEGORY M: Relay Bridge
// ---------------------------------------------------------------------------
console.log('Running Category M: Relay Bridge...');

const relayLedger: InternetAuditLedger = { events: [] };
const relayBridge = new InternetRelayBridge(relayLedger);
const relaySid = makeInternetEdgeSessionId('relay_session_M');
const relayFp = makeMockCertFingerprint('relay-cert');

const consumedToken = Object.freeze({
  sessionId: relaySid,
  tlsVersion: 'TLSv1.3' as const,
  cipherSuite: 'TLS_AES_256_GCM_SHA384' as const,
  certFingerprint: relayFp,
  issuedAt: Date.now() - 10,
  consumedAt: Date.now(),
});

const binding = relayBridge.bind(consumedToken);
testAssert(binding.state === 'BOUND', 'M.1: Relay binding created in BOUND state');
testAssert(binding.sessionId === relaySid, 'M.2: Binding session ID matches');
testAssert(relayBridge.activeBindingCount === 1, 'M.3: Active binding count = 1');

// Duplicate binding rejected
testAssertThrows(
  () => relayBridge.bind(consumedToken),
  'M.4: Duplicate binding rejected (ONE_BRAIN invariant)',
  'INTERNET_RELAY_BIND_FAILED'
);

// Unconsumed token rejected
const unconsumedToken = { ...consumedToken, consumedAt: undefined } as any;
testAssertThrows(
  () => relayBridge.bind(unconsumedToken),
  'M.5: Unconsumed token rejected',
  'INTERNET_RELAY_BIND_FAILED'
);

relayBridge.unbind(relaySid, 'test done');
testAssert(relayBridge.activeBindingCount === 0, 'M.6: Active binding count = 0 after unbind');
testAssert(relayBridge.getBinding(relaySid)?.state === 'UNBOUND_CLEANLY', 'M.7: State UNBOUND_CLEANLY');

// ---------------------------------------------------------------------------
// CATEGORY N: InternetEdge Lifecycle
// ---------------------------------------------------------------------------
console.log('Running Category N: InternetEdge Lifecycle...');

const edge = new InternetEdge({ requireMtls: false, allowTls12: true });
testAssert(edge.state === 'INTERNET_OFFLINE', 'N.1: Edge starts OFFLINE');
testAssert(!edge.isActive, 'N.2: Not active initially');
testAssert(!edge.isTerminal, 'N.3: Not terminal initially');

edge.beginResolve(goodEndpoint);
testAssert(edge.state === 'INTERNET_RESOLVING', 'N.4: After beginResolve → RESOLVING');

edge.beginConnect();
testAssert(edge.state === 'INTERNET_CONNECTING', 'N.5: After beginConnect → CONNECTING');

edge.beginTlsHandshake();
testAssert(edge.state === 'INTERNET_TLS_HANDSHAKING', 'N.6: After beginTlsHandshake → TLS_HANDSHAKING');

edge.completeTlsHandshake({
  negotiatedVersion: 'TLSv1.2',
  negotiatedCipher: 'TLS_AES_256_GCM_SHA384',
  isMtls: false,
  durationMs: 150,
});
testAssert(edge.state === 'INTERNET_CERT_VALIDATING', 'N.7: TLS accepted (TLS 1.2 allowed) → CERT_VALIDATING');
testAssert(edge.sessionId !== undefined, 'N.8: Session ID assigned after TLS');

edge.completeCertValidation(goodCert);
testAssert(edge.state === 'INTERNET_ADMITTED', 'N.9: Cert valid → ADMITTED');

edge.beginRelayBinding();
testAssert(edge.state === 'INTERNET_RELAY_BINDING', 'N.10: After beginRelayBinding → RELAY_BINDING');

edge.markActive();
testAssert(edge.state === 'INTERNET_ACTIVE', 'N.11: After markActive → ACTIVE');
testAssert(edge.isActive, 'N.12: isActive = true in ACTIVE state');

edge.markDegraded('test latency');
testAssert(edge.state === 'INTERNET_DEGRADED', 'N.13: markDegraded → DEGRADED');

edge.markDegraded(); // idempotent
testAssert(edge.state === 'INTERNET_DEGRADED', 'N.14: Repeated markDegraded stays DEGRADED');

const edgeSnap = edge.getSnapshot();
testAssert(edgeSnap.health === 'DEGRADED', 'N.15: Snapshot reports DEGRADED health');

// Reject path
const edge2 = new InternetEdge({ requireMtls: false, allowTls12: true });
edge2.beginResolve(goodEndpoint);
edge2.beginConnect();
edge2.beginTlsHandshake();
edge2.reject('security violation');
testAssert(edge2.state === 'INTERNET_REJECTED', 'N.16: reject() → INTERNET_REJECTED');
testAssert(edge2.isTerminal, 'N.17: INTERNET_REJECTED is terminal');

// Drain + close
const edge3 = new InternetEdge({ requireMtls: false, allowTls12: true });
edge3.beginResolve(goodEndpoint);
edge3.beginConnect();
edge3.beginTlsHandshake();
edge3.completeTlsHandshake({ negotiatedVersion: 'TLSv1.2', negotiatedCipher: 'TLS_AES_256_GCM_SHA384', isMtls: false, durationMs: 50 });
edge3.completeCertValidation(goodCert);
edge3.beginRelayBinding();
edge3.markActive();
await edge3.drain();
testAssert(edge3.state === 'INTERNET_CLOSED', 'N.18: After drain() → INTERNET_CLOSED');

// ---------------------------------------------------------------------------
// CATEGORY O: InternetRuntime (Master Orchestrator)
// ---------------------------------------------------------------------------
console.log('Running Category O: InternetRuntime Master Orchestrator...');

const runtime = new InternetRuntime({
  edgeConfig: { requireMtls: false, allowTls12: true },
  allowInsecureEndpoints: true,
});

testAssert(runtime.state === 'INTERNET_OFFLINE', 'O.1: Runtime starts OFFLINE');
testAssert(!runtime.isActive, 'O.2: Runtime not active initially');

const testEndpoint = {
  host: 'relay.test.example.com',
  port: 443,
  tlsRequired: true,
  mtlsRequired: false,
};

runtime.connect(testEndpoint);
testAssert(runtime.state === 'INTERNET_TLS_HANDSHAKING', 'O.3: After connect() → TLS_HANDSHAKING');

runtime.completeTls({
  negotiatedVersion: 'TLSv1.2',
  negotiatedCipher: 'TLS_AES_256_GCM_SHA384',
  isMtls: false,
  durationMs: 100,
});
testAssert(runtime.state === 'INTERNET_CERT_VALIDATING', 'O.4: After completeTls() → CERT_VALIDATING');

runtime.completeCert(goodCert);
testAssert(runtime.state === 'INTERNET_ADMITTED', 'O.5: After completeCert() → ADMITTED');

runtime.bindToRelay();
testAssert(runtime.state === 'INTERNET_ACTIVE', 'O.6: After bindToRelay() → ACTIVE');
testAssert(runtime.isActive, 'O.7: Runtime is active');

// Health probe
runtime.recordHealthProbe(200);
const rtSnap = runtime.getSnapshot();
testAssert(rtSnap.health.level === 'HEALTHY', 'O.8: 200ms probe → HEALTHY');
testAssert(rtSnap.activeRelayBindings === 1, 'O.9: 1 active relay binding');
testAssert(rtSnap.version === '4.0.0', 'O.10: Snapshot version correct');

// Reconnect
const runtime2 = new InternetRuntime({
  edgeConfig: { requireMtls: false, allowTls12: true },
  allowInsecureEndpoints: true,
});
runtime2.connect(testEndpoint);
runtime2.completeTls({ negotiatedVersion: 'TLSv1.2', negotiatedCipher: 'TLS_AES_256_GCM_SHA384', isMtls: false, durationMs: 50 });
runtime2.completeCert(goodCert);
runtime2.bindToRelay();

const delayMs = runtime2.scheduleReconnect();
testAssert(typeof delayMs === 'number' && delayMs >= 0, 'O.11: Reconnect scheduled with delay');
runtime2.onReconnectSucceeded();

// Shutdown
await runtime.shutdown();
testAssert(runtime.state === 'INTERNET_CLOSED', 'O.12: After shutdown() → CLOSED');

const auditEvents = runtime.getAuditEvents();
testAssert(auditEvents.length > 0, 'O.13: Audit events recorded throughout lifecycle');
testAssert(Object.isFrozen(auditEvents), 'O.14: Audit event snapshot is frozen');

// TLS downgrade rejection in runtime
const runtime3 = new InternetRuntime({
  edgeConfig: { requireMtls: false, allowTls12: false }, // strict TLS 1.3
  allowInsecureEndpoints: true,
});
runtime3.connect(testEndpoint);
let downgradeRejected = false;
try {
  runtime3.completeTls({ negotiatedVersion: 'TLSv1.2', negotiatedCipher: 'TLS_AES_256_GCM_SHA384', isMtls: false, durationMs: 50 });
} catch (e: any) {
  downgradeRejected = e instanceof InternetEdgeError && e.code === 'INTERNET_TLS_VERSION_REJECTED';
}
testAssert(downgradeRejected, 'O.15: TLS downgrade rejected fail-closed in runtime');
testAssert(runtime3.state === 'INTERNET_REJECTED', 'O.16: Runtime state → REJECTED after downgrade attempt');

// ---------------------------------------------------------------------------
// RESULTS
// ---------------------------------------------------------------------------
console.log('\n============================================================');
console.log('MS-1.3.29: PRODUCTION SECURE INTERNET EDGE TEST SUITE RESULTS');
console.log('============================================================');
console.log(`\n  ✓ PASSED: ${_passed}`);
console.log(`  ✗ FAILED: ${_failed}`);

if (_failures.length > 0) {
  console.log('\nFailed assertions:');
  _failures.forEach((f) => console.log(f));
}

if (_failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ ALL ASSERTIONS PASSED — MS-1.3.29 PRODUCTION SECURE INTERNET EDGE VERIFIED\n');
}
