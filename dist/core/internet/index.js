// src/core/internet/index.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Public barrel export for the internet/ subsystem.
// Only types and classes that are intentionally public API are exported here.
// Internal implementation details remain private to the subsystem.
// Types and constants
export { INTERNET_SUBSYSTEM_VERSION, INTERNET_MIN_TLS_VERSION, INTERNET_MAX_CERT_AGE_DAYS, INTERNET_HANDSHAKE_TIMEOUT_MS, INTERNET_RECONNECT_INITIAL_DELAY_MS, INTERNET_RECONNECT_MAX_DELAY_MS, INTERNET_RECONNECT_MAX_ATTEMPTS, INTERNET_HEALTH_PROBE_INTERVAL_MS, INTERNET_HEALTH_DEGRADED_THRESHOLD_MS, makeInternetEdgeSessionId, } from './internetTypes.js';
// State taxonomy
export { ALL_INTERNET_STATES, INTERNET_TRANSMIT_STATES, INTERNET_TERMINAL_STATES, INTERNET_RECOVERY_STATES, isInternetActive, isInternetTerminal, isInternetRecovering, canInternetTransmit, } from './internetStates.js';
// Transition matrix
export { INTERNET_TRANSITIONS, isValidInternetTransition, assertValidInternetTransition, } from './internetTransitions.js';
// Error hierarchy
export { InternetEdgeError, sanitizeInternetErrorMessage, } from './internetFailure.js';
// TLS governance
export { INTERNET_ALLOWED_CIPHER_SUITES, INTERNET_REJECTED_TLS_VERSIONS, validateTlsSession, withTlsHandshakeTimeout, detectTlsDowngrade, } from './internetTls.js';
// Certificate validation
export { validateCertificate, assertCertificateValid, makeMockCertFingerprint, } from './internetCertificate.js';
// Endpoint governance
export { INTERNET_ENDPOINT_MIN_PORT, INTERNET_ENDPOINT_MAX_PORT, INTERNET_ENDPOINT_MAX_HOST_LENGTH, validateInternetEndpoint, assertInternetEndpointValid, normalizeInternetEndpoint, internetEndpointKey, } from './internetEndpoint.js';
// Audit ledger
export { appendInternetAuditEvent, snapshotInternetAuditLedger, getInternetAuditEventsForSession, getInternetAuditEventsByType, countInternetTlsRejections, assertTlsRejectionBurstAllowed, } from './internetAudit.js';
// Health monitor
export { DEFAULT_HEALTH_POLICY as INTERNET_DEFAULT_HEALTH_POLICY, InternetHealthMonitor, classifyRtt, } from './internetHealth.js';
// Roaming
export { DEFAULT_ROAMING_POLICY as INTERNET_DEFAULT_ROAMING_POLICY, InternetRoamingTracker, detectRoamingTransition, } from './internetRoaming.js';
// Reconnect scheduler
export { DEFAULT_RECONNECT_POLICY as INTERNET_DEFAULT_RECONNECT_POLICY, InternetReconnectScheduler, internetReconnectWait, } from './internetReconnect.js';
// Admission bridge
export { InternetAdmissionBridge } from './internetAdmissionBridge.js';
// Relay bridge
export { InternetRelayBridge, } from './internetRelayBridge.js';
// Internet Edge (lifecycle controller)
export { InternetEdge } from './internetEdge.js';
// Internet Runtime (master orchestrator)
export { InternetRuntime, getInternetRuntime, setInternetRuntimeForTest, } from './internetRuntime.js';
